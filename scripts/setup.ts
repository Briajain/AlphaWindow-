import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function performSetup() {
  console.log("--- AlphaWindow: Automated Setup Protocol ---");

  // 1. Environment Sync
  const envPath = path.join(process.cwd(), '.env');
  const envExPath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log("[ ] Syncing .env from .env.example...");
    fs.copyFileSync(envExPath, envPath);
    console.log("[+] .env created. (Please verify PostgreSQL credentials).");
  } else {
    console.log("[+] .env already exists. Skipping sync.");
  }

  // 2. PostgreSQL Connection & DB Creation
  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
  };

  const pool = new Pool({ ...dbConfig, database: 'postgres' }); // Connect to default postgres DB
  
  try {
    console.log("[ ] Connecting to PostgreSQL...");
    const client = await pool.connect();
    
    // Check if database 'X' exists
    const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = 'X'");
    if (checkRes.rowCount === 0) {
      console.log("[ ] Database 'X' not found. Creating...");
      await client.query('CREATE DATABASE "X"');
      console.log("[+] Database 'X' successfully initialized.");
    } else {
      console.log("[+] Database 'X' confirmed.");
    }
    client.release();
  } catch (error: any) {
    console.error("[!] PostgreSQL Setup Failed:", error.message);
    console.log("    -> Please ensure PostgreSQL is running and you have create permissions.");
  } finally {
    await pool.end();
  }

  // 3. Ollama Intelligence Verification
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const modelName = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

  try {
    console.log(`[ ] Pinging Ollama at ${ollamaHost}...`);
    const resp = await fetch(`${ollamaHost}/api/tags`);
    if (resp.ok) {
      const data = await resp.json() as { models: any[] };
      const hasModel = data.models.some(m => m.name.includes(modelName));
      
      if (!hasModel) {
        console.log(`[ ] Model '${modelName}' missing. Initiating pull...`);
        console.log("    -> This may take a few minutes depending on your bandwidth.");
        const pullResp = await fetch(`${ollamaHost}/api/pull`, {
          method: 'POST',
          body: JSON.stringify({ name: modelName, stream: false })
        });
        if (pullResp.ok) {
          console.log(`[+] Model '${modelName}' successfully deployed.`);
        } else {
          console.error(`[!] Failed to pull '${modelName}'. Pull manually: ollama pull ${modelName}`);
        }
      } else {
        console.log(`[+] Intelligence model '${modelName}' confirmed.`);
      }
    }
  } catch (err: any) {
    console.error("[!] Ollama Verification Failed:", err.message);
    console.log("    -> Is Ollama running on port 11434?");
  }

  console.log("--- Setup Protocol Complete ---");
  console.log("Run 'npm run dev' to launch the AlphaWindow terminal.");
}

performSetup();
