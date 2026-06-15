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

    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404</h1>"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
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
