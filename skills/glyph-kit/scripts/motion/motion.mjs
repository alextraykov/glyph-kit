import { motionCanvas, motionFactory, motionMarks, motionProgress, growBar, timeCursor } from "./shared.mjs";

function trackMotion(data, options, render, mode) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, /[█▌·]/u);
  if (mode === "timing") marks.forEach((line, row) => {
    const start = canvas.matrix[row].indexOf("▕"), end = canvas.matrix[row].indexOf("▏");
    marks[row] = start >= 0 && end > start ? line.filter((col) => col > start && col < end) : [];
  });
  const rows = marks.flatMap((line, row) => line.length ? [row] : []);
  const durations = Array.isArray(data) ? data.map((item) => item.ms ?? item.end ?? 1) : [];
  const longest = Math.max(1, ...durations);
  return motionFactory(canvas, (grid, time) => {
    rows.forEach((row, index) => {
      const progress = mode === "timing" ? motionProgress(time, 0, 120 * (durations[index] ?? longest) / longest) : motionProgress(time, mode === "film" ? index * 8 : 0, mode === "film" ? 8 : 120);
      const columns = marks[row];
      columns.forEach((col) => { if (col > columns[0] + (columns.at(-1) - columns[0]) * progress) grid.put(row, col, "·", "mute"); });
      if (progress > 0 && progress < 1) timeCursor(grid, row, columns[0], columns.at(-1), progress);
    });
  });
}
export const motionMotionTiming = (data, options, render) => trackMotion(data, options, render, "timing");
export const motionTransitionSpec = (data, options, render) => trackMotion(data, options, render, "tracks");
export const motionStagger = (data, options, render) => trackMotion(data, options, render, "stagger");
export const motionFilmstrip = (data, options, render) => trackMotion(data, options, render, "film");
