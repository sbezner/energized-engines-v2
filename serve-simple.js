const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DOCS_DIR = path.join(__dirname, 'docs');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DOCS_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  // Remove /energized-engines-v2 prefix if present
  if (req.url.startsWith('/energized-engines-v2/')) {
    filePath = path.join(DOCS_DIR, req.url.replace('/energized-engines-v2/', '').split('?')[0]);
  }
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
