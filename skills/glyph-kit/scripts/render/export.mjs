// PDF and PNG through a Chromium browser already on the machine, in headless mode: Chrome, Chromium,
// Edge, a headless shell Playwright already downloaded, or Brave as a last resort.
// Nothing to install. If no browser is found, the caller gets a plain error and can export HTML instead.
// CHROME_PATH overrides the search.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

const INSTALLED = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const ON_PATH = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"];
// Brave works on most machines but can hang headless when it can't reach a display, so it goes last.
const LAST_RESORT = ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"];

// A headless shell or Chromium that Playwright (or Puppeteer) already downloaded, newest first.
function cachedBrowsers() {
  const roots = [join(homedir(), "Library/Caches/ms-playwright"), join(homedir(), ".cache/ms-playwright"), join(homedir(), "AppData/Local/ms-playwright")];
  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))) {
      for (const rel of [
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
        "chrome-headless-shell-mac-x64/chrome-headless-shell",
        "chrome-headless-shell-linux64/chrome-headless-shell",
        "chrome-headless-shell-win64/chrome-headless-shell.exe",
        "chrome-linux/chrome",
        "chrome-win/chrome.exe"
      ]) {
        const path = join(root, dir, rel);
        if (existsSync(path)) found.push(path);
      }
    }
  }
  return found;
}

/** Every usable browser, in the order to try them. */
export function browsers() {
  const list = [process.env.CHROME_PATH, ...INSTALLED].filter((c) => c && existsSync(c));
  for (const name of ON_PATH) {
    try {
      const found = execFileSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n")[0].trim();
      if (found) list.push(found);
    } catch {}
  }
  return [...new Set([...list, ...cachedBrowsers(), ...LAST_RESORT.filter((c) => existsSync(c))])];
}

/** The first browser to try, or null. */
export const findChrome = () => browsers()[0] ?? null;

function run(args, html, target) {
  const list = browsers();
  if (!list.length) throw new Error("PDF and PNG need Chrome, Chromium or Edge. None was found; set CHROME_PATH, or export HTML and print it.");
  const dir = mkdtempSync(join(tmpdir(), "glyph-kit-"));
  const page = join(dir, "page.html");
  writeFileSync(page, html);
  const failures = [];
  try {
    for (const chrome of list) {
      try {
        execFileSync(chrome, ["--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${join(dir, "profile")}`, ...args, pathToFileURL(page).href], {
          stdio: "pipe",
          timeout: 30_000,
          killSignal: "SIGKILL"
        });
        if (existsSync(target)) return chrome;
      } catch (error) {
        failures.push(`${chrome}: ${String(error.message).split("\n")[0]}`);
      }
    }
    throw new Error(`No browser could render the file.\n${failures.join("\n")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Print an HTML document to PDF. The document's @page rules set the paper size. */
export function htmlToPdf(html, out) {
  const target = resolvePath(out);
  run(["--no-pdf-header-footer", "--virtual-time-budget=5000", `--print-to-pdf=${target}`], html, target);
  return target;
}

/** Rasterise an SVG to PNG at a device scale (2 = retina). */
export function svgToPng(svg, out, { scale = 2 } = {}) {
  const w = Math.ceil(Number(svg.match(/width="([\d.]+)"/)?.[1] ?? 1200));
  const h = Math.ceil(Number(svg.match(/height="([\d.]+)"/)?.[1] ?? 800));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  const target = resolvePath(out);
  run([`--window-size=${w},${h}`, `--force-device-scale-factor=${scale}`, "--default-background-color=00000000", `--screenshot=${target}`], html, target);
  return target;
}
