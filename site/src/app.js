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

// Every still figure on the page can be copied as the plain text it is. Hidden arrival layers are
// left out, so the copy is exactly the figure.
const figureText = (pre) => {
  const copy = pre.cloneNode(true);
  copy.querySelectorAll(".gk-s0, .gk-s1, .gk-s2, [aria-hidden='true']").forEach((el) => el.remove());
  return copy.textContent;
};
document.querySelectorAll("pre.grid-figure:not(.live)").forEach((pre) => {
  if (pre.closest(".outputs, .builder, .try")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "figure-copy";
  b.textContent = "Copy";
  b.setAttribute("aria-label", "Copy this figure as text");
  b.dataset.copyFigure = "";
  b.addEventListener("click", () => { b.dataset.copy = figureText(pre); });
  (pre.closest(".gk-replay-wrap") ?? pre).after(b);
  b.parentElement.classList.add("has-figure-copy");
});

// Copy buttons: icons show a tick for a moment after copying; buttons with words say "Copied".
document.querySelectorAll("[data-copy], [data-copy-figure]").forEach((button) => {
  button.hidden = false;
  const label = button.getAttribute("aria-label");
  const words = button.querySelector("svg") ? null : button.textContent;
  button.addEventListener("click", async () => {
    await Promise.resolve(); // a figure's text is gathered by its own click handler first
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.done = "";
      button.setAttribute("aria-label", "Copied");
      button.title = "Copied";
      if (words) button.textContent = "Copied";
    } catch {
      button.title = "Select the text to copy it";
    }
    setTimeout(() => {
      delete button.dataset.done;
      button.setAttribute("aria-label", label);
      button.title = "Copy";
      if (words) button.textContent = words;
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

// The area menu stays under the top bar. On the Types page it shows one area at a time (or all);
// on How to use it marks the section in view.
const jump = document.querySelector(".jump");
if (jump?.hasAttribute("data-filter")) {
  const top = document.querySelector(".top");
  const setTop = () => document.documentElement.style.setProperty("--top-h", `${top?.offsetHeight ?? 0}px`);
  setTop();
  addEventListener("resize", setTop);
  const areas = [...document.querySelectorAll("[data-area]")];
  const show = () => {
    const id = location.hash.slice(1);
    const pick = areas.some((s) => s.id === id) ? id : "all";
    areas.forEach((s) => (s.hidden = pick !== "all" && s.id !== pick));
    jump.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${pick}`)));
    return pick;
  };
  addEventListener("hashchange", () => {
    show();
    // Back to the top of the list, under the menu, whichever area was picked.
    scrollTo({ top: jump.offsetTop - (top?.offsetHeight ?? 0) - 1 });
  });
  show();
} else if (jump) {
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

// Tabs: the motion switcher and the output formats. Arrow keys move between tabs; a frame loads its
// file the first time its tab is shown.
document.querySelectorAll("[data-switch], [data-outputs]").forEach((box) => {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      panel.hidden = !on;
      if (on) panel.querySelectorAll("iframe[data-src]").forEach((f) => { f.src = f.dataset.src; f.removeAttribute("data-src"); });
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
    });
  });
});
