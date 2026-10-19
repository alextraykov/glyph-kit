#!/usr/bin/env node
// Serves site/dist the way glyph-kit.traykov.cc does, with the functions in api/ answering under /api,
// so the site and its feedback form can be tried on this computer. No dependencies.
// Usage: node site/build.mjs && node site/serve.mjs [port]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site/dist/glyph-kit");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4450);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".pdf": "application/pdf" };

/** A Node request as a web Request, so the functions run here as they do on Vercel. */
async function toRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", req.socket.remoteAddress ?? "");
  const body = chunks.length && !["GET", "HEAD"].includes(req.method) ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body });
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://local");
  const fn = pathname.match(/^\/(?:glyph-kit\/)?api\/([a-z-]+)$/u)?.[1];
  if (fn) {
    const file = join(root, "api", `${fn}.mjs`);
    if (!existsSync(file)) return res.writeHead(404).end();
    const handlers = await import(`${new URL(`file://${file}`).href}?t=${statSync(file).mtimeMs}`);
    const handler = handlers[req.method];
    if (!handler) return res.writeHead(405, { Allow: "GET, POST" }).end();
    const response = await handler(await toRequest(req));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  // The site is built under /glyph-kit; here it answers at the root as on its subdomain.
  let path = normalize(join(site, pathname.replace(/^\/glyph-kit(?=\/|$)/u, "")));
  if (!path.startsWith(site)) return res.writeHead(403).end();
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path) && existsSync(`${path}.html`)) path += ".html";
  if (!existsSync(path)) return res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(path).pipe(res);
}).listen(port, () => console.log(`Glyph kit on http://localhost:${port}/`));
