const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DOCS_DIR = path.join(__dirname, 'docs');
const BASE_PATH = '/energized-engines-v2';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = req.url;
  
  // Strip base path
  if (filePath.startsWith(BASE_PATH)) {
    filePath = filePath.slice(BASE_PATH.length);
  }
  
  // Default to index.html
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }
  
  filePath = path.join(DOCS_DIR, filePath);
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${BASE_PATH}/`);
});
