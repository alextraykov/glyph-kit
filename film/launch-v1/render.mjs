// node film/render.mjs stills | board | film | sound [--fps 30] [--lufs -14]
//   stills  out/stills/NN.png, one per storyboard frame (scene.js STORYBOARD)
//   board   out/board.png: every still with what it shows, its words and its sound
//   film    out/glyph-kit.mp4: every frame through ffmpeg, the cues through synth.mjs, -14 LUFS
//   sound   remix the soundtrack only and put it back on the last rendered picture
// Serves the kit folder on a local port so the page can load the kit's own modules. Needs ffmpeg and
// Playwright's Chromium (PLAYWRIGHT_FROM points at a project where Playwright is installed).
import { execFileSync, spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(HERE, "out");
const mode = process.argv[2] ?? "stills";
const arg = (name, fallback) => (process.argv.join(" ").match(new RegExp(`--${name} (-?[\\d.]+)`)) || [])[1] ?? fallback;
const FPS = Number(arg("fps", 30));
const LUFS = arg("lufs", -14);
const require = createRequire(process.env.PLAYWRIGHT_FROM ?? join(ROOT, "../traykov-ascii/package.json"));
const { chromium } = require("playwright");
mkdirSync(OUT, { recursive: true });

// A tiny static server for the kit folder.
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
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${base}/film/index.html?render=1`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const shot = async (t, path) => {
  await page.evaluate((x) => window.seek(x), t);
  return page.locator("#c").screenshot({ path, type: path?.endsWith(".jpg") ? "jpeg" : "png" });
};
const board = await page.evaluate(() => window.__storyboard);

if (mode === "stills" || mode === "board") {
  mkdirSync(join(OUT, "stills"), { recursive: true });
  for (const f of board) await shot(f.t, join(OUT, "stills", `${f.id}.png`));
  console.log(`${board.length} stills in film/out/stills`);
}

if (mode === "board") {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const cards = board
    .map((f) => `<figure><img src="stills/${f.id}.png"><figcaption><b>${f.id} · ${f.t.toFixed(1)} s</b>${f.words ? `<q>${esc(f.words)}</q>` : ""}<span>${esc(f.picture)}</span>${f.sound ? `<i>♪ ${esc(f.sound)}</i>` : ""}</figcaption></figure>`)
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:"Departure Mono";src:url("${base}/site/src/fonts/DepartureMono-Regular.woff2")}
    body{margin:0;padding:48px;background:#fbfbf8;color:#080808;font:14px/1.45 system-ui,sans-serif;width:1904px}
    h1{margin:0 0 6px;font:400 33px/1.1 "Departure Mono"}p.lead{margin:0 0 32px;color:rgba(8,8,8,.68);max-width:110ch}
    main{display:grid;grid-template-columns:repeat(4,1fr);gap:28px 24px}figure{margin:0;display:grid;gap:10px;align-content:start}
    img{width:100%;border:1px solid rgba(8,8,8,.16)}figcaption{display:grid;gap:4px}b{font:400 13px "Departure Mono"}
    q{font-weight:600}q::before,q::after{content:""}span{color:rgba(8,8,8,.75)}i{font-style:normal;color:#04764e}</style>
    <h1>Glyph kit · film storyboard</h1><p class="lead">30 s, 1:1, light. 120 BPM: every move lands on a beat. Sound: a 1989–90s room you do work in, as approved in the sound palette: the boot, an ordinary keyboard, hard-disk chatter, floppy steps, PC-speaker blips, digital blips for the press, a calm lo-fi bed, and a start-up chime as the sound logo. Every frame here is a real still from the film's source, not a drawing of it.</p><main>${cards}</main>`;
  writeFileSync(join(OUT, "board.html"), html.replaceAll(`src="stills/`, `src="${base}/film/out/stills/`));
  const b = await browser.newPage({ viewport: { width: 2000, height: 1200 } });
  await b.goto(`${base}/film/out/board.html`);
  await b.waitForLoadState("networkidle");
  await b.screenshot({ path: join(OUT, "board.png"), fullPage: true });
  console.log("film/out/board.png");
}

// sound: remix the soundtrack from the saved cues and re-mux it, without rendering the picture again.
const mixSound = (silent) => {
  const wav = join(OUT, "sound.wav");
  execFileSync("node", [join(HERE, "synth.mjs"), join(OUT, "cues.json"), wav], { stdio: "inherit" });
  // Two-pass loudness to the target, true peak -1 dBTP.
  const probe = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${wav}" -af loudnorm=I=${LUFS}:TP=-1:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
  const j = JSON.parse(probe.slice(probe.lastIndexOf("{"), probe.lastIndexOf("}") + 1));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", `loudnorm=I=${LUFS}:TP=-1:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, "-ar", "48000", join(OUT, "sound.norm.wav")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, "-i", join(OUT, "sound.norm.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", join(OUT, "glyph-kit.mp4")]);
  return j.input_i;
};
if (mode === "sound") {
  writeFileSync(join(OUT, "cues.json"), JSON.stringify(await page.evaluate(() => window.__cues()), null, 1));
  console.log(`film/out/glyph-kit.mp4 remixed · input loudness ${mixSound(join(OUT, "silent.mp4"))} LUFS`);
}

if (mode === "film") {
  const dur = await page.evaluate(() => window.DUR);
  const cues = await page.evaluate(() => window.__cues());
  writeFileSync(join(OUT, "cues.json"), JSON.stringify(cues, null, 1));
  const silent = join(OUT, "silent.mp4");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), silent], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(dur * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await page.evaluate((x) => window.seek(x), i / FPS).then(() => page.locator("#c").screenshot({ type: "jpeg", quality: 95 }));
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  const loud = mixSound(silent);
  console.log(`film/out/glyph-kit.mp4 · ${dur}s · ${frames} frames · ${((Date.now() - t0) / 1000) | 0}s · input loudness ${loud} LUFS`);
}

console.log(errors.length ? `page errors: ${errors.slice(0, 3).join(" | ")}` : "no page errors");
await browser.close();
server.close();
