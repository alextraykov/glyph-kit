// Moving diagrams play from their still frame while on screen; reduced motion keeps the still.
// Install commands copy with one click.
import { animate } from "./kit/motion.mjs";
import { autoplay } from "./kit/live/play.mjs";

const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
document.querySelectorAll("[data-live]").forEach((pre) => {
  const spec = specs[pre.dataset.live];
  if (!spec) return;
  const { make, still } = animate(spec);
  autoplay(pre, make, still);
});

// Copy buttons are icons: a tick for a moment after copying.
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.hidden = false;
  const label = button.getAttribute("aria-label");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.done = "";
      button.setAttribute("aria-label", "Copied");
      button.title = "Copied";
    } catch {
      button.title = "Select the text to copy it";
    }
    setTimeout(() => {
      delete button.dataset.done;
      button.setAttribute("aria-label", label);
      button.title = "Copy";
    }, 1600);
  });
});

import "./showcase.js";
import "./try.js";
import "./parallax.js";

// The theme switch: light by default, dark when chosen, remembered on this device.
const themeButton = document.querySelector("[data-theme-toggle]");
const showTheme = () => {
  const dark = document.documentElement.dataset.theme === "dark";
  themeButton.textContent = dark ? "Light" : "Dark";
  themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  // Keep the phone's status bar the same colour as the page.
  const bar = document.querySelector('meta[name="theme-color"]');
  if (bar) bar.content = dark ? "#0c0c0b" : "#fbfbf8";
};
if (themeButton) {
  showTheme();
  themeButton.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("glyph-kit-theme", next); } catch {}
    showTheme();
  });
}

// Analytics: Vercel counts page views on its own. These name the few actions worth knowing about:
// copying an install command, downloading the zip, building a figure, going to GitHub. One click
// listener for the whole page, so nothing else on it needs to know. No personal data is sent.
const track = (name, data) => { try { window.va?.("event", { name, ...(data ? { data } : {}) }); } catch {} };
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
document.addEventListener("click", (event) => {
  const el = event.target instanceof Element ? event.target.closest("[data-copy], a[href]") : null;
  if (!el) return;
  if (el.matches("[data-copy]")) {
    const text = el.getAttribute("data-copy") || "";
    track("Copy install", { how: text.startsWith("npx") ? "npx" : text.startsWith("/plugin") ? "plugin" : "other" });
  } else if (/releases\/latest\/download/.test(el.href)) track("Download zip");
  else if (/github\.com\/alextraykov\/glyph-kit/.test(el.href)) track("GitHub", { from: el.closest("nav") ? "top bar" : "page" });
});
document.querySelector("[data-try]")?.addEventListener("submit", () => track("Build figure"));

// The Kinds page's area menu stays under the top bar and marks the area in view.
const jump = document.querySelector(".jump");
if (jump) {
  const top = document.querySelector(".top");
  const setTop = () => document.documentElement.style.setProperty("--top-h", `${top?.offsetHeight ?? 0}px`);
  setTop();
  addEventListener("resize", setTop);
  const links = [...jump.querySelectorAll("a[href^='#']")];
  const sections = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  const mark = () => {
    const line = (top?.offsetHeight ?? 0) + jump.offsetHeight + 24;
    const current = sections.filter((s) => s.getBoundingClientRect().top <= line).at(-1);
    links.forEach((a) => a.setAttribute("aria-current", String(current && a.getAttribute("href") === `#${current.id}`)));
  };
  addEventListener("scroll", mark, { passive: true });
  mark();
}
