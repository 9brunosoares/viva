import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(process.env.VIVA_DIST || "dist"),
  base = process.env.VIVA_BASE || "/viva-test/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith(base)) {
        res.writeHead(404).end();
        return;
      }
      const path = resolve(
        root,
        decodeURIComponent(url.pathname.slice(base.length)) || "index.html",
      );
      if (!path.startsWith(root)) {
        res.writeHead(403).end();
        return;
      }
      const info = await stat(path);
      const f = info.isDirectory() ? resolve(path, "index.html") : path;
      res.setHeader(
        "Content-Type",
        types[extname(f)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-cache");
      res.end(await readFile(f));
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log(`Viva! http://127.0.0.1:${process.env.PORT || 4173}${base}`),
  );
