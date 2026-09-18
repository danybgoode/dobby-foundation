#!/usr/bin/env node
// server.mjs — the smallest real app the e2e harness can run against. TEMPLATE FILL-IN: delete this once
// your real app exists and point playwright.config.ts's webServer at your app's own dev command.
//
// It exists so the harness is RUNNABLE on day one instead of being a shape with no specs: `npm run
// test:e2e` starts this, runs the api gate against it, and goes green — which proves the wiring (base URL,
// projects, webServer) before any product code is written. Zero deps.
//
//   node server.mjs            # http://localhost:3000   (PORT overrides)

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 3000);

const HOME = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Example app</title></head>
  <body>
    <main>
      <h1>Example app</h1>
      <p data-testid="status">The harness is wired.</p>
    </main>
  </body>
</html>`;

export const server = createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(HOME);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => console.log(`example-app listening on http://localhost:${PORT}`));
