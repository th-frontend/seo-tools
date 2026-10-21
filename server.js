#!/usr/bin/env node
// Zero-dependency static server for the SEO tools dashboard.
// Every folder in ./tools with an index.html shows up on the dashboard automatically.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, 'tools');
const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
};

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// Reads title/description from each tool's index.html. Optional tool.json overrides them.
function listTools() {
  if (!fs.existsSync(TOOLS_DIR)) return [];
  return fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(TOOLS_DIR, d.name, 'index.html')))
    .map(d => {
      const dir = path.join(TOOLS_DIR, d.name);
      const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').slice(0, 20000);
      const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
      const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1];
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'tool.json'), 'utf8')); } catch {}
      return {
        slug: d.name,
        url: `/tools/${d.name}/`,
        name: meta.name || (title ? decode(title).split(' · ')[0] : d.name),
        description: meta.description || (desc ? decode(desc) : ''),
        category: meta.category || 'Reporting',
        updated: fs.statSync(path.join(dir, 'index.html')).mtime.toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/tools') {
    return send(res, 200, JSON.stringify(listTools()), TYPES['.json']);
  }

  // /tools/foo -> /tools/foo/ so relative links inside the tool resolve
  const target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
    return send(res, 403, 'Forbidden', TYPES['.txt']);
  }
  if (path.relative(ROOT, target).split(path.sep).some(p => p.startsWith('.')) || target === __filename) {
    return send(res, 404, 'Not found', TYPES['.txt']);
  }

  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' + url.search });
        return res.end();
      }
      return serveFile(path.join(target, 'index.html'), res);
    }
    if (err) return send(res, 404, 'Not found', TYPES['.txt']);
    serveFile(target, res);
  });
});

function serveFile(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', TYPES['.txt']);
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

server.listen(PORT, HOST, () => {
  console.log(`SEO tools running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
