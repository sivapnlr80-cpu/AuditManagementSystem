// COOP·AUDIT·AI — Standalone Launcher
// Embeds the production-built React app and serves it on localhost.
// Bundled into a single Windows .exe via @yao-pkg/pkg.

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const PORT = process.env.PORT || 5173;

// App version — kept in sync by scripts/pack.mjs (bundled package.json).
const APP_VERSION = (() => {
  try {
    return 'V' + require('./package.json').version;
  } catch {
    return '';
  }
})();

// When packaged by pkg, __dirname resolves inside the snapshot virtual
// filesystem; `process.pkg` exists in that case. The 'dist' folder is
// bundled via the package.json "pkg.assets" field.
const DIST_DIR = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
};

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url);
    let pathname = decodeURIComponent(parsed.pathname || '/');
    if (pathname === '/') pathname = '/index.html';

    // SPA fallback: any non-asset path that doesn't have an extension → serve index.html
    if (!/\.[a-z0-9]+$/i.test(pathname)) {
      pathname = '/index.html';
    }

    const filePath = path.join(DIST_DIR, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // 404 → try index.html (SPA fallback)
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found: ' + pathname);
          } else {
            res.writeHead(200, { 'Content-Type': MIME['.html'] });
            res.end(fallback);
          }
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Server error: ' + e.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║                                                      ║');
  console.log('  ║          COOP · AUDIT · AI — Local Server            ║');
  const verLine = APP_VERSION || '';
  const pad = Math.max(0, 54 - verLine.length);
  const left = Math.floor(pad / 2);
  console.log(
    '  ║' + ' '.repeat(left) + verLine + ' '.repeat(pad - left) + '║'
  );
  console.log('  ║   Ready at:  ' + url.padEnd(40) + '║');
  console.log('  ║                                                      ║');
  console.log('  ║   Keep this window OPEN while using the app.         ║');
  console.log('  ║   Close this window (or press Ctrl+C) to STOP it.    ║');
  console.log('  ║                                                      ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Auto-open default browser (Windows / macOS / Linux)
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  try { exec(cmd); } catch (_) {}
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down…');
  server.close(() => process.exit(0));
});
