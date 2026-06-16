#!/usr/bin/env node
/* Fleet Navira — serveur statique sans dépendance.
   Usage : node server.js   (puis http://localhost:8080) */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    // empêche la remontée de répertoire
    const safe = path.normalize(path.join(ROOT, urlPath)).replace(/^(\.\.[/\\])+/, "");
    if (!safe.startsWith(ROOT)) { res.writeHead(403); return res.end("403"); }

    let file = safe;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");

    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404</h1>"); }
      const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
      const range = req.headers.range;
      // Requêtes Range (indispensable pour le scrub vidéo / seek)
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
        let start = m[1] ? parseInt(m[1], 10) : 0;
        let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (isNaN(start) || isNaN(end) || start > end || end >= st.size) {
          res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end();
        }
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${st.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
        });
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": st.size });
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) {
    res.writeHead(500); res.end("500");
  }
});

server.listen(PORT, HOST, () => {
  console.log("Fleet Navira en ligne :");
  console.log("  → http://localhost:" + PORT);
  console.log("  → Espace Pro : http://localhost:" + PORT + "/app/login.html");
});
