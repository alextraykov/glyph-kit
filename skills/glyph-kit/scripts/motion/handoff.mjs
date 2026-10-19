import { motionCanvas, motionFactory, motionProgress } from "./shared.mjs";

export function motionQaChecklist(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  return motionFactory(canvas, (grid, time) => {
    data.slice(0, 16).forEach((item, row) => {
      const progress = motionProgress(time, row * 8, 6);
      if (item.status === "done" && progress < 1) grid.text(row, 0, "  to do      ", "mute");
      if (item.status === "blocked" && time >= row * 8 && time < row * 8 + 12 && Math.floor(time / 2) % 2) grid.text(row, 0, "x blocked    ", "fail");
      if (item.status === "done" && progress === 1) grid.put(row, 0, "█", "ok");
    });
  });
}
