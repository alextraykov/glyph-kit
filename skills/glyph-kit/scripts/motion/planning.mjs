import { motionCanvas, motionFactory, motionMarks, motionProgress, timeCursor } from "./shared.mjs";
import { Grid } from "../live/grid.mjs";

export function motionGantt(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, /[█·]/u);
  return motionFactory(canvas, (grid, time) => marks.forEach((line, row) => {
    if (!line.length) return;
    const progress = motionProgress(time, 0, 130);
    const cursor = line[0] + (line.at(-1) - line[0]) * progress;
    line.forEach((col) => { if (col > cursor) grid.put(row, col, "·", "mute"); });
    if (progress < 1) timeCursor(grid, row, line[0], line.at(-1), progress);
  }));
}

export function motionBoard(data, options, render) {
  const names = Object.keys(data);
  const initial = structuredClone(data);
  const middle = structuredClone(data);
  const final = structuredClone(data);
  const source = names.includes("later") ? "later" : names.at(-1);
  const next = names.includes("next") ? "next" : names[1];
  const target = names.includes("now") ? "now" : names[0];
  const card = initial[source]?.[0];
  if (card != null && source !== target && next) {
    middle[source].shift(); middle[next].push(card);
    final[source].shift(); final[target].push(card);
  }
  const canvases = [initial, middle, final].map((state) => motionCanvas(render(state, options)));
  const rows = Math.max(...canvases.map((canvas) => canvas.rows));
  const cols = Math.max(...canvases.map((canvas) => canvas.cols));
  const centers = names.map((_, i) => Math.floor((i + 0.5) * cols / names.length));
  return { still: 180, make: () => (step, frac = 0) => {
    const time = Grid.settled ? 180 : (step % 300) + frac;
    const phase = time < 60 ? 0 : time < 120 ? 1 : 2;
    const grid = new Grid(rows, cols);
    canvases[phase].lines.forEach((line, row) => grid.text(row, 0, line));
    if (card != null && time < 120) {
      const from = centers[names.indexOf(phase ? next : source)];
      const to = centers[names.indexOf(phase ? target : next)];
      const progress = (time % 60) / 60;
      grid.glide(1, from + (to - from) * progress, "▓");
      grid.glide(1, from + (to - from) * Math.max(0, progress - 0.03), "░");
    }
    return grid;
  } };
}

export function motionSwimlane(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const routes = canvas.matrix.flatMap((line, row) => {
    const start = line.findIndex((ch) => ch === "─" && row > 1);
    const end = line.findLastIndex((ch) => ["─", "►", "◄"].includes(ch));
    if (start < 0 || end <= start) return [];
    const backwards = line.includes("◄");
    return [{ row, start: backwards ? end : start, end: backwards ? start : end, backwards }];
  });
  return motionFactory(canvas, (grid, time) => {
    if (!routes.length) return;
    const position = motionProgress(time, 0, 150) * routes.length;
    const route = routes[Math.min(routes.length - 1, Math.floor(position))];
    const fraction = position >= routes.length ? 1 : position % 1;
    grid.glide(route.row, route.start + (route.end - route.start) * fraction, "▓", route.backwards ? "fail" : "ok");
  });
}
