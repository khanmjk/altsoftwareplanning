#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

function serveIndex(res) {
  const indexPath = path.join(rootDir, 'index.html');
  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = decodeURIComponent(parsed.pathname || '/');
  const normalizedPath = pathname === '/' ? 'index.html' : pathname;
  const safePath = path
    .normalize(normalizedPath)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const filePath = path.join(rootDir, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      serveIndex(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(port, () => {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--open') ? 'open' : 'run';
  const binName = process.platform === 'win32' ? 'cypress.cmd' : 'cypress';
  const binPath = path.join(rootDir, 'node_modules', '.bin', binName);

  const child = spawn(binPath, [mode], { stdio: 'inherit' });

  child.on('error', (error) => {
    console.error('Failed to start Cypress:', error);
    server.close(() => process.exit(1));
  });

  child.on('exit', (code) => {
    server.close(() => process.exit(code ?? 1));
  });
});
