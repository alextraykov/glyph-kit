// node film/audit.mjs [--scene name] [--fps 30]
// Audits a film frame by frame, reading the canvas directly (no video render):
//   edge   ink inside the outer safe band (40 px) while no press is running: something left the frame
//   hold   a moving section with identical frames for longer than `HOLD` seconds
//   jump   a frame that changes a large share of the picture without a press or a cut
// Prints the findings and writes contact sheets of every second to film/out/audit/.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, normalize } from "node:path";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(HERE, "out", "audit");
mkdirSync(OUT, { recursive: true });
const arg = (n, d) => (process.argv.join(" ").match(new RegExp(`--${n} (\\S+)`)) || [])[1] ?? d;
const FPS = Number(arg("fps", 30));
const SCENE = arg("scene", null);
const { chromium } = createRequire(join(ROOT, "../traykov-ascii/package.json"))("playwright");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
await page.goto(`${base}/film/index.html?render=1${SCENE ? `&scene=${SCENE}` : ""}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const dur = await page.evaluate(() => window.DUR);
const sections = await page.evaluate(() => window.__sections?.() ?? []);

// Per frame: ink in the safe band, and how much changed since the last frame (sampled every 3 px).
const frames = await page.evaluate(async ({ dur, FPS }) => {
  const c = document.getElementById("c"), x = c.getContext("2d", { willReadFrequently: true });
  let prev = null;
  const out = [];
  for (let i = 0; i < Math.round(dur * FPS); i++) {
    const t = i / FPS;
    window.seek(t);
    const d = x.getImageData(0, 0, 1080, 1080).data;
    let edge = 0, changed = 0, n = 0;
    const cur = new Uint8Array(Math.ceil(1080 / 3) * Math.ceil(1080 / 3));
    let k = 0;
    for (let yy = 0; yy < 1080; yy += 3)
      for (let xx = 0; xx < 1080; xx += 3, k++) {
        const p = (yy * 1080 + xx) * 4, l = (d[p] + d[p + 1] + d[p + 2]) / 3;
        cur[k] = l;
        if (l < 160 && (xx < 40 || xx > 1040 || yy < 40 || yy > 1040)) edge++;
        if (prev && Math.abs(prev[k] - l) > 24) changed++;
        n++;
      }
    out.push({ t: +t.toFixed(3), edge, change: prev ? changed / n : 0 });
    prev = cur;
  }
  return out;
}, { dur, FPS });

const pressing = (t) => (sections.find((s) => s.kind === "press" && t >= s.from && t < s.to) ? true : false);
const moving = (t) => sections.find((s) => s.kind === "moving" && t >= s.from && t < s.to);
const findings = [];
for (const f of frames) if (f.edge > 0 && !pressing(f.t)) findings.push(`edge  ${f.t.toFixed(2)} s  ${f.edge} ink samples in the outer band`);
let still = null;
for (const f of frames) {
  const m = moving(f.t);
  if (m && f.change === 0) still ??= f.t;
  else {
    if (still !== null && f.t - still > 0.3) findings.push(`hold  ${still.toFixed(2)}–${f.t.toFixed(2)} s  no change in a moving section (${moving(still)?.name ?? ""})`);
    still = null;
  }
}
for (const f of frames) if (f.change > 0.25 && !pressing(f.t) && !sections.some((s) => s.kind === "cut" && Math.abs(s.from - f.t) < 0.05)) findings.push(`jump  ${f.t.toFixed(2)} s  ${(f.change * 100).toFixed(0)}% of the picture changed in one frame`);

// Sync: every accent in the soundtrack must have a picture change within one frame of it. Keys, blips,
// ticks and each typed letter are checked; the bed and the press (which has its own section) are not.
const cueList = (await page.evaluate(() => window.__cues?.()))?.cues ?? [];
const moments = [];
for (const q of cueList) {
  if (["key", "land", "tick", "stamp", "error"].includes(q.type)) moments.push([q.t, q.type]);
  if (q.type === "type" && q.at) q.at.forEach((o, i) => q.text?.[i] !== " " && moments.push([q.t + o, "letter"]));
}
const unsynced = await page.evaluate(({ moments, FPS }) => {
  const c = document.getElementById("c"), x = c.getContext("2d", { willReadFrequently: true });
  const grab = (t) => { window.seek(t); const d = x.getImageData(0, 0, c.width, c.height).data; const v = new Uint8Array(d.length / 4); for (let i = 0, k = 0; i < d.length; i += 4, k++) v[k] = d[i]; return v; };
  const differs = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 24);
  return moments.filter(([t]) => !differs(grab(t - 1 / FPS), grab(t + 1 / FPS))).map(([t, type]) => `${type} ${t.toFixed(2)} s`);
}, { moments, FPS });
for (const u of unsynced) findings.push(`sync  ${u}  sound with no picture change within a frame`);
console.log(`sync: ${moments.length - unsynced.length}/${moments.length} sounds land on a picture change`);

// Contact sheets: every 1/6 s, one sheet per 2 seconds.
for (let s = 0; s < dur; s += 2) {
  const shots = [];
  for (let k = 0; k < 12; k++) {
    const t = s + k / 6;
    if (t >= dur) break;
    await page.evaluate((x) => window.seek(x), t);
    const p = join(OUT, `f-${String(Math.round(t * 1000)).padStart(6, "0")}.png`);
    await page.locator("#c").screenshot({ path: p });
    shots.push(p);
  }
  const sheet = join(OUT, `sheet-${String(s).padStart(2, "0")}s.png`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...shots.flatMap((p) => ["-i", p]), "-filter_complex", `${shots.map((_, i) => `[${i}]scale=300:-1[s${i}]`).join(";")};${shots.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${shots.length}:layout=${shots.map((_, i) => `${(i % 6) * 300}_${Math.floor(i / 6) * 300}`).join("|")}:fill=gray`, sheet]);
}
console.log(findings.length ? findings.join("\n") : "no findings");
console.log(`${frames.length} frames at ${FPS} fps; sheets in film/out/audit/`);
await browser.close();
server.close();
