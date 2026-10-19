// Moving diagrams play from their still frame while on screen; reduced motion keeps the still.
// Install commands copy with one click.
import { live } from "./kit/live/kinds.mjs";
import { autoplay } from "./kit/live/play.mjs";

const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
document.querySelectorAll("[data-live]").forEach((pre) => {
  const spec = specs[pre.dataset.live];
  if (!spec) return;
  const { make, still } = live(spec);
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
import "./feedback.js";

// The theme switch: light by default, dark when chosen, remembered on this device.
const themeButton = document.querySelector("[data-theme-toggle]");
const showTheme = () => {
  const dark = document.documentElement.dataset.theme === "dark";
  themeButton.textContent = dark ? "Light" : "Dark";
  themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
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
