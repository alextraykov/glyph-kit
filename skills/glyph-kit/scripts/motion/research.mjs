import { motionCanvas, motionFactory, motionMarks, motionCounters, motionProgress, growBar, countUp, timeCursor } from "./shared.mjs";
import { Grid } from "../live/grid.mjs";

export function motionLikert(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, /[█▒░]/u);
  const counters = motionCounters(canvas, marks);
  return motionFactory(canvas, (grid, time) => {
    marks.forEach((line, row) => {
      const middle = canvas.matrix[row].indexOf("│");
      const progress = motionProgress(time, row * 4, 100);
      growBar(grid, row, line.filter((col) => col < middle), progress, { reverse: true });
      growBar(grid, row, line.filter((col) => col > middle), progress);
    });
    counters.forEach((c) => countUp(grid, c.row, c.col, c.value, motionProgress(time, c.row * 4, 100), c.size));
  });
}

export function motionTaskStats(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, /[─█├┤│]/u);
  const counters = motionCounters(canvas, marks);
  return motionFactory(canvas, (grid, time) => {
    marks.forEach((line, row) => growBar(grid, row, line, motionProgress(time, row * 5, 100)));
    counters.forEach((c) => countUp(grid, c.row, c.col, c.value, motionProgress(time, c.row * 5, 100), c.size));
  });
}

export function motionEmotionCurve(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, /[█▓▒░]/u);
  const points = marks.flatMap((line, row) => line.map((col) => [row, col])).sort((a, b) => a[1] - b[1]);
  const route = points.length > 1 ? new Grid(1, 1).route(points) : points;
  return motionFactory(canvas, (grid, time) => {
    const progress = motionProgress(time, 0, 120);
    marks.forEach((line, row) => {
      line.forEach((col) => { if (col > progress * canvas.cols) grid.put(row, col, "·", "mute"); });
    });
    if (progress < 1 && route.length) grid.packet(route, progress * (route.length - 1));
  });
}
