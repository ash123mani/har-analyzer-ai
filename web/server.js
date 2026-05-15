import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Load LLM config from web/env.js ──────────────────────────────
let LLM_API_KEY = '';
let LLM_BASE_URL = 'https://api.openai.com/v1';
let LLM_MODEL = 'gpt-4o';

try {
  const envFile = fs.readFileSync(path.join(WEB_DIR, 'env.js'), 'utf-8');
  const m = (re) => { const r = re.exec(envFile); return r ? r[1] : ''; };
  LLM_API_KEY  = m(/LLM_API_KEY\s*=\s*['"]([^'"]+)['"]/);
  LLM_BASE_URL = m(/LLM_BASE_URL\s*=\s*['"]([^'"]+)['"]/) || LLM_BASE_URL;
  LLM_MODEL    = m(/LLM_MODEL\s*=\s*['"]([^'"]+)['"]/)    || LLM_MODEL;
} catch {
  // env.js may not exist – LLM calls will fail with a clear message
}

// ── MIME types ───────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.js':   'application/javascript;charset=utf-8',
  '.css':  'text/css;charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

// ── Server ───────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS (needed for local dev if front-end is served on a different port)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API proxy ────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        if (!LLM_API_KEY) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'LLM_API_KEY not found in web/env.js' } }));
          return;
        }
        const url = LLM_BASE_URL.replace(/\/+$/, '') + '/chat/completions';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LLM_API_KEY,
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages,
            temperature: 1,
            top_p: 0.95,
            max_tokens: 8192,
          }),
        });
        const data = await response.json();
        res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  // ── Static files ─────────────────────────────────────────────
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(WEB_DIR, urlPath);
  const ext = path.extname(filePath);

  try {
    // Basic path traversal protection
    if (!filePath.startsWith(WEB_DIR)) throw new Error('Forbidden');
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('HAR Analyzer running at http://localhost:' + PORT);
});
