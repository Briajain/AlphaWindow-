import 'dotenv/config';
import { Pool } from 'pg';
import os from 'os';

async function performDiagnostic() {
  console.log("--- AlphaWindow: System Diagnostic Pulse ---");
  console.log(`[ ] Hostname: ${os.hostname()} (${os.type()} ${os.arch()})`);
  console.log(`[ ] Node Version: ${process.version}`);
  console.log("--- Connectivity Check ---");

  // 1. PostgreSQL Check
  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'X',
  };

  const pool = new Pool(dbConfig);
  
  try {
    const start = Date.now();
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), now()');
    console.log(`[+] [POSTGRES] Online. (Ping: ${Date.now() - start}ms)`);
    console.log(`    -> Database: ${res.rows[0].current_database}`);
    client.release();
  } catch (err: any) {
    console.error(`[!] [POSTGRES] Offline. (${err.message})`);
    console.log("    -> Check your .env credentials and ensure PostgreSQL service is active.");
  } finally {
    await pool.end();
  }

  // 2. Ollama Check
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const modelName = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

  try {
    const start = Date.now();
    const resp = await fetch(`${ollamaHost}/api/tags`);
    if (resp.ok) {
      console.log(`[+] [OLLAMA]   Online. (Ping: ${Date.now() - start}ms)`);
      const data = await resp.json() as { models: any[] };
      const model = data.models.find(m => m.name.includes(modelName));
      if (model) {
        console.log(`    -> Model '${modelName}' is locally deployed.`);
      } else {
        console.error(`    -> Model '${modelName}' [NOT FOUND]. Run 'npm run setup' to pull it.`);
      }
    } else {
      console.error(`[!] [OLLAMA]   Error (HTTP ${resp.status}).`);
    }
  } catch (err: any) {
    console.error(`[!] [OLLAMA]   Offline. (${err.message})`);
    console.log("    -> Is Ollama running on port 11434?");
  }

  // 3. Port Check (3000)
  // Simple check to see if our own port is already taken
  // (Omitted for brevity, server.ts already handles EADDRINUSE)

  console.log("--- Diagnostic Pulse Complete ---");
}

performDiagnostic();
