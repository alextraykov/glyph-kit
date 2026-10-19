// Moving diagrams play from their still frame while on screen; reduced motion keeps the still.
// Install commands copy with one click.
import { live } from "/kit/live/kinds.mjs";
import { autoplay } from "/kit/live/play.mjs";

const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
document.querySelectorAll("[data-live]").forEach((pre) => {
  const spec = specs[pre.dataset.live];
  if (!spec) return;
  const { make, still } = live(spec);
  autoplay(pre, make, still);
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.hidden = false;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
      button.dataset.done = "";
    } catch {
      button.textContent = "Select it";
    }
    setTimeout(() => {
      button.textContent = "Copy";
      delete button.dataset.done;
    }, 1600);
  });
});
