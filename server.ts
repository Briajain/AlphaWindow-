import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let PDFParseFunction = require('pdf-parse');
if (typeof PDFParseFunction !== 'function' && PDFParseFunction.default) PDFParseFunction = PDFParseFunction.default;
if (typeof PDFParseFunction !== 'function' && PDFParseFunction.PDFParse) PDFParseFunction = PDFParseFunction.PDFParse;


// Initialize Postgres Connection Pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'X',
});

const JWT_SECRET = process.env.JWT_SECRET || 'alpha-quantum-secret-key-2024';


// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create posts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        "postId" VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        "financialValidity" INTEGER DEFAULT 50,
        region VARCHAR(100) DEFAULT 'Global',
        ticker VARCHAR(10) DEFAULT 'NONE',
        sentiment VARCHAR(20) DEFAULT 'hold',
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        "comments" INTEGER DEFAULT 0,
        "category" VARCHAR(50) DEFAULT 'General',
        timestamp BIGINT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Ensure new columns exist for existing tables
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 0;`);


    // Create index on timestamp for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp DESC);
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notes table (Vault)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sources table for PDF/MD uploads
    await client.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Database initialized successfully");

  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function startServer() {
  // Initialize database first
  await initializeDatabase();

  const server = express();
  const PORT = process.env.PORT || 3000;

  // Function to analyze posts (Category, Sentiment, and Confidence) using Ollama
  const analyzePost = async (text: string): Promise<{ category: string; sentiment: string; confidence: number }> => {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b',
          prompt: `You are the AlphaWindow Research Assistant. Analyze the following entry for archival intelligence. 
          Respond with a valid JSON object only. No other text. Use this exact schema:
          {
            "category": "One of [Finance, Defense, Politics, Technology, Sports, Entertainment, General]",
            "sentiment": "One of [bull, bear, hold]",
            "confidence": "An integer between 0 and 100"
          }
          
          Post: "${text.replace(/"/g, "'")}"`,
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) {
        console.warn("Ollama analysis failed (HTTP Error):", response.status);
        return { category: 'General', sentiment: 'hold', confidence: 0 };
      }

      const data = await response.json() as { response: string };
      try {
        const parsed = JSON.parse(data.response);
        const validCategories = ['Finance', 'Defense', 'Politics', 'Technology', 'Sports', 'Entertainment', 'General'];
        const validSentiments = ['bull', 'bear', 'hold'];

        return {
          category: validCategories.includes(parsed.category) ? parsed.category : 'General',
          sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'hold',
          confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0))
        };
      } catch (e) {
        console.error("Failed to parse Ollama JSON response:", data.response);
        return { category: 'General', sentiment: 'hold', confidence: 0 };
      }
    } catch (error) {
      console.error("Ollama analysis error:", error);
      return { category: 'General', sentiment: 'hold', confidence: 0 };
    }
  };


  // Add manual CORS headers for all routes as a fallback
  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  server.use(express.json());

  // Multer configuration for file uploads (Memory Storage, 5MB Limit)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
  });

  // JWT Middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
      req.user = user;
      next();
    });
  };

  // --- DIAGNOSTIC ENDPOINTS ---
  server.get('/api/test', (req, res) => res.json({ success: true, message: 'API Core Online' }));

  // --- DBMS (DATABASE) ENDPOINTS ---
  server.get('/api/db/tables', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          table_name as "tableName", 
          (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) as c FROM %I', table_name), false, true, '')))[1]::text::int as "rowCount"
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("DB Tables Error:", error);
      res.status(500).json({ error: 'Failed to fetch table schema' });
    }
  });

  server.post('/api/db/query', authenticateToken, async (req: any, res) => {
    const { query: sqlQuery } = req.body;
    if (!sqlQuery) return res.status(400).json({ error: 'SQL query required' });

    try {
      const result = await pool.query(sqlQuery);
      res.json({ 
        success: true, 
        data: Array.isArray(result) ? result[result.length - 1].rows : result.rows 
      });
    } catch (error: any) {
      console.error("Raw SQL Error:", error);
      res.status(400).json({ 
        error: error.message || 'SQL execution failed' 
      });
    }
  });

  // --- AUTH ENDPOINTS ---

  server.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') return res.status(400).json({ error: 'Username already exists' });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  server.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  server.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    res.json({ success: true, user: req.user });
  });

  // --- VAULT (NOTES) ENDPOINTS ---

  server.get('/api/notes', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 ORDER BY "updatedAt" DESC',
        [req.user.id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  server.post('/api/notes', authenticateToken, async (req: any, res) => {
    const { title, content, id } = req.body;
    try {
      if (id) {
        // Update existing note
        const result = await pool.query(
          'UPDATE notes SET title = $1, content = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
          [title, content, id, req.user.id]
        );
        return res.json({ success: true, data: result.rows[0] });
      } else {
        // Create new note
        const result = await pool.query(
          'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
          [req.user.id, title, content]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  server.delete('/api/notes/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });


  // --- SOURCE DOCUMENT ENDPOINTS ---

  server.get('/api/sources', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        'SELECT id, filename, type, "createdAt" FROM sources WHERE user_id = $1 ORDER BY "createdAt" DESC',
        [req.user.id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sources' });
    }
  });

  server.post('/api/sources/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const filename = req.file.originalname;
      const type = filename.split('.').pop()?.toLowerCase();
      let content = '';

      if (type === 'pdf') {
        const data = await PDFParseFunction(req.file.buffer);
        content = data.text;
      } else if (type === 'md' || type === 'txt') {
        content = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Use PDF or MD.' });
      }

      const result = await pool.query(
        'INSERT INTO sources (user_id, filename, content, type) VALUES ($1, $2, $3, $4) RETURNING id, filename, type',
        [req.user.id, filename, content, type]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  server.delete('/api/sources/:id', authenticateToken, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM sources WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete source' });
    }
  });


  // --- AI ANALYST (RAG) ENDPOINTS ---


  server.post('/api/ai/query', authenticateToken, async (req: any, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
      const qLower = query.toLowerCase();

      // 1. Ticker Extraction
      const tickerRegex = /\$([A-Z]+)/g;
      const tickerMatches = [...query.matchAll(tickerRegex)].map(m => m[1]);

      // 2. Category Normalization (Aliases)
      const categoryMap: { [key: string]: string } = {
        'finance': 'Finance', 'economy': 'Finance', 'market': 'Finance', 'stock': 'Finance',
        'defense': 'Defense', 'defence': 'Defense', 'military': 'Defense', 'war': 'Defense',
        'politics': 'Politics', 'government': 'Politics', 'election': 'Politics',
        'technology': 'Technology', 'tech': 'Technology', 'ai': 'Technology', 'software': 'Technology',
        'sports': 'Sports',
        'entertainment': 'Entertainment', 'gaming': 'Entertainment',
        'oil': 'Energy', 'energy': 'Energy', 'gas': 'Energy', 'power': 'Energy',
        'trade': 'Macro', 'import': 'Macro', 'export': 'Macro', 'sanctions': 'Macro',
        'general': 'General'
      };
      const detectedCategories = Object.keys(categoryMap)
        .filter(key => qLower.includes(key))
        .map(key => categoryMap[key]);

      // 3. Smart Keyword Extraction (Filter stop words)
      const stopWords = new Set(['what', 'whats', 'latest', 'okay', 'about', 'tell', 'show', 'sector', 'news', 'info', 'fragment', 'intel', 'buying', 'selling', 'from', 'with']);
      const keywords = query.split(/\W+/)
        .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
        .sort((a, b) => b.length - a.length) // Prioritize longer words
        .slice(0, 8); // Take more keywords for broader search

      // 4. Broad Retrieval Strategy (Multi-layer)
      const contextPool: any[] = [];
      let totalMatches = 0;
      
      // Ticker Layer
      if (tickerMatches.length > 0) {
        const r = await pool.query('SELECT username, text, sentiment, category FROM posts WHERE ticker = ANY($1) ORDER BY timestamp DESC LIMIT 15', [tickerMatches]);
        contextPool.push(...r.rows);
      }

      // Category Layer
      if (detectedCategories.length > 0) {
        const r = await pool.query('SELECT username, text, sentiment, category FROM posts WHERE category = ANY($1) ORDER BY timestamp DESC LIMIT 15', [detectedCategories]);
        contextPool.push(...r.rows);
      }

      // Keyword Layer (Broad Search)
      if (keywords.length > 0) {
        // Construct a broad OR search for all keywords
        const conditions = keywords.map((_, i) => `text ILIKE $${i + 1}`).join(' OR ');
        const r = await pool.query(`SELECT username, text, sentiment, category FROM posts WHERE ${conditions} ORDER BY timestamp DESC LIMIT 30`, keywords.map(kw => `%${kw}%`));
        contextPool.push(...r.rows);

        // SOURCE LAYER: Search uploaded documents (Matching both content and filename)
        const sourceConditions = keywords.map((_, i) => `(content ILIKE $${i + 1} OR filename ILIKE $${i + 1})`).join(' OR ');
        const sourceR = await pool.query(
          `SELECT filename as username, content as text, 'source' as sentiment, 'Document' as category FROM sources WHERE (${sourceConditions}) AND user_id = $${keywords.length + 1} LIMIT 8`,
          [...keywords.map(kw => `%${kw}%`), req.user.id]
        );
        contextPool.push(...sourceR.rows);

        // Get total match count for "Discussion Volume"
        const countResult = await pool.query(`SELECT COUNT(*) FROM posts WHERE ${conditions}`, keywords.map(kw => `%${kw}%`));
        totalMatches = parseInt(countResult.rows[0].count);
      }

      // Deduplicate and limit
      const uniqueContext = Array.from(new Set(contextPool.map(p => JSON.stringify(p)))).map(s => JSON.parse(s)).slice(0, 40);

      const hasExactMatch = uniqueContext.length > 0;

      if (uniqueContext.length === 0) {
        const r = await pool.query('SELECT username, text, sentiment, category FROM posts ORDER BY timestamp DESC LIMIT 10');
        uniqueContext.push(...r.rows);
      }

      // 5. Build Grounded Context
      const context = uniqueContext.map(p => {
        if (p.category === 'Document') {
          return `[SOURCE FILE: ${p.username}] [Type: Document]: ${p.text}`;
        }
        return `[@${p.username}] [Category: ${p.category}]: ${p.text} (Sentiment: ${p.sentiment})`;
      }).join('\n---\n');

      // 6. Final Inference with Volume Signaling
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b',
          prompt: `You are the AlphaWindow Tactical Intelligence Interface. 
          
          USER RESEARCH QUERY: "${query}"
          
          DATASET METRICS:
          - Total Matching Fragments Found: ${totalMatches}
          - Related Context Depth: ${uniqueContext.length} entries
          - Exact Signals Detected: ${hasExactMatch ? 'YES' : 'NO (Broad context only)'}

          RESEARCH INTEL FRAGMENTS:
          ${context}
          
          TASK: Synthesize the above intel to answer the research query.
          - If exact facts aren't found, summarize the "Discussion Volume" and "Sentiment Trends" based on the fragments provided.
          - Do NOT say "no data found" if signals exist. Instead, describe the nature of signals found (e.g., "While no direct confirmation exists, there is significant discussion regarding [Topic] with a [Sentiment] bias").
          - Reference the approximate number of mentions ($totalMatches) to indicate significance.
          
          STYLE: Minimalist, tactical, high-density intelligence report. Use bullet points for key signals.`,
          stream: false
        })
      });

      if (!response.ok) throw new Error('Ollama connection failed');
      const aiData = await response.json() as { response: string };
      res.json({ success: true, response: aiData.response });

    } catch (error) {
      console.error("AI Query Error:", error);
      res.status(500).json({ error: 'AI Analysis failed' });
    }
  });

  // API endpoint to receive posts from Chrome Extension (Supports both POST and GET for no-cors)

  const handleAnalyze = async (req, res) => {
    try {
      // Support both body (POST) and query (GET)
      const postId = req.body.postId || req.query.postId;
      const username = req.body.username || req.query.username;
      const text = req.body.text || req.query.text;
      const timestamp = req.body.timestamp || req.query.timestamp;
      const likes = req.body.likes || req.query.likes || 0;
      const views = req.body.views || req.query.views || 0;
      const comments = req.body.comments || req.query.comments || 0;

      if (!postId || !username || !text || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if post already exists to skip slow AI analysis
      const existing = await pool.query('SELECT * FROM posts WHERE "postId" = $1', [String(postId)]);

      let finalCategory = 'General';
      let finalSentiment = 'hold';
      let finalConfidence = 0;

      if (existing.rows.length === 0) {
        // Only run AI analysis/scoring for truly NEW posts
        const analysis = await analyzePost(String(text));
        finalCategory = analysis.category;
        finalSentiment = analysis.sentiment;
        finalConfidence = analysis.confidence;
      } else {
        // Reuse historical analysis for existing records
        finalCategory = existing.rows[0].category;
        finalSentiment = existing.rows[0].sentiment;
        finalConfidence = existing.rows[0].confidence;
      }

      const postData = {
        postId: String(postId),
        username: String(username),
        text: String(text),
        financialValidity: 50,
        region: 'Global',
        ticker: 'NONE',
        sentiment: finalSentiment,
        likes: Number(likes),
        views: Number(views),
        comments: Number(comments),
        timestamp: Number(timestamp),
        category: finalCategory,
        confidence: finalConfidence
      };

      // Upsert: Insert new or Update metrics for existing
      await pool.query(
        `INSERT INTO posts ("postId", username, text, "financialValidity", region, ticker, sentiment, likes, views, comments, timestamp, category, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT ("postId") DO UPDATE SET
          likes = EXCLUDED.likes,
          views = EXCLUDED.views,
          comments = EXCLUDED.comments,
          timestamp = EXCLUDED.timestamp,
          category = EXCLUDED.category,
          sentiment = EXCLUDED.sentiment,
          confidence = EXCLUDED.confidence`,
        [postData.postId, postData.username, postData.text, postData.financialValidity, postData.region, postData.ticker, postData.sentiment, postData.likes, postData.views, postData.comments, postData.timestamp, postData.category, postData.confidence]
      );


      res.json({ success: true, data: postData });
    } catch (error) {
      console.error("Analysis Error:", error);
      res.status(500).json({ 
        error: 'Failed to analyze post', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  server.post('/api/analyze', handleAnalyze);
  server.get('/api/analyze', handleAnalyze);

  // API endpoint to retrieve posts
  server.get('/api/posts', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT "postId", username, text, "financialValidity", region, ticker, sentiment, likes, views, comments, timestamp, category, confidence
         FROM posts
         ORDER BY timestamp DESC
         LIMIT 1000`
      );

      const posts = result.rows;
      res.json({ success: true, data: posts });
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // API endpoint to retrieve database stats
  server.get('/api/stats', async (req, res) => {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM posts');
      res.json({ success: true, total: parseInt(result.rows[0].count) });
    } catch (error) {
      console.error("Stats Error:", error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // API endpoint to reset database (delete all posts)
  server.post('/api/reset', async (req, res) => {
    try {
      await pool.query('DELETE FROM posts');
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      console.error("Reset Error:", error);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  // Automatic 24-hour reset
  setInterval(async () => {
    try {
      console.log("Running automatic 24-hour database reset...");
      await pool.query('DELETE FROM posts');
      console.log("Automatic reset completed.");
    } catch (error) {
      console.error("Automatic reset error:", error);
    }
  }, 24 * 60 * 60 * 1000);

  // Catch-all for undefined API routes to ensure we always return JSON, not HTML
  server.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server.use(express.static(distPath));
    server.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    httpServer.close(async () => {
      await pool.end();
      console.log('Pool closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    httpServer.close(async () => {
      await pool.end();
      console.log('Pool closed');
      process.exit(0);
    });
  });
}

startServer();
