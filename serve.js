// serve.js: tiny static server for previewing dist/ locally. Run: node serve.js
var http = require('http'), fs = require('fs'), path = require('path');
var root = path.join(__dirname, 'dist'), port = Number(process.env.PORT) || 4173;
var types = { '.html': 'text/html; charset=utf-8', '.pdf': 'application/pdf', '.js': 'text/javascript' };
var logFile = path.join(require('os').tmpdir(), 'scheme-check-test-log.jsonl');
http.createServer(function (req, res) {
  // Test stand-in for the Google Sheet log: build with "log": "http://localhost:4173/__log" in site.json
  // and open the page with ?logtest; each check is appended to the file printed at start-up.
  if (req.method === 'POST' && req.url === '/__log') {
    var body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () { fs.appendFileSync(logFile, body + '\n'); res.end('ok'); });
    return;
  }
  var file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+$/, '/scheme-check.html'));
  if (file.indexOf(root) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    if (/.artifact.html$/.test(file)) data = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + data + '</body></html>';
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', function () { console.log('http://127.0.0.1:' + port + '/  (test log: ' + logFile + ')'); });
