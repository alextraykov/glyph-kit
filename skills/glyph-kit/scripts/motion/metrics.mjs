import { motionCanvas, motionFactory, motionMarks, motionCounters, motionProgress, staggerDelay, growBar, countUp, timeCursor } from "./shared.mjs";

function metricMotion(data, options, render, mode) {
  const canvas = motionCanvas(render(data, options));
  const marks = motionMarks(canvas, mode === "spark" ? /[▁▂▃▄▅▆▇█]/u : /[█▓▒░▏▎▍▌▋▊▉■]/u);
  const firstRow = mode === "cohort" || (mode === "heat" && options?.colLabels) ? 1 : 0;
  const rowCount = Array.isArray(data) && mode !== "calendar" ? Math.min(16, data.length) : 1;
  marks.forEach((line, row) => { if (row < firstRow || row >= firstRow + rowCount) marks[row] = []; });
  const counters = motionCounters(canvas, marks, options?.lang);
  const active = marks.flatMap((line, row) => line.length ? [row] : []);
  return motionFactory(canvas, (grid, time) => {
    active.forEach((row, index) => {
      const progress = motionProgress(time, mode === "heat" ? 0 : staggerDelay(index, active.length), 90);
      if (mode === "heat") {
        marks[row].forEach((col) => { const p = motionProgress(time, (row + col) * 0.6, 50); if (p < 1) grid.put(row, col, p > 0.5 ? "░" : "·", "mute"); });
      } else if (mode === "cohort") {
        marks[row].forEach((col, cell) => { const p = motionProgress(time, index * 8 + cell * 0.6, 24); grid.put(row, col, p === 0 ? "·" : p < 1 ? "█" : canvas.matrix[row][col]); });
      } else if (mode === "forecast") {
        const solid = marks[row].filter((col) => canvas.matrix[row][col] !== "░");
        const projected = marks[row].filter((col) => canvas.matrix[row][col] === "░");
        growBar(grid, row, solid, motionProgress(time, index * 5, 50));
        growBar(grid, row, projected, motionProgress(time, 55 + index * 5, 50));
      } else growBar(grid, row, marks[row], progress, { head: mode === "spark" || mode === "meter" });
      if (mode === "calendar" && progress < 1 && marks[row].length) timeCursor(grid, row, marks[row][0], marks[row].at(-1), progress);
    });
    counters.forEach((counter) => countUp(grid, counter.row, counter.col, counter.value, motionProgress(time, staggerDelay(active.indexOf(counter.row), active.length), 90), counter.size, counter.format));
    if ((mode === "bar" || mode === "meter") && time < 48 && Math.floor(time / 12) % 2) canvas.matrix.forEach((row, r) => row.forEach((ch, c) => { if (ch === "+") grid.put(r, c, " "); }));
    if (mode === "meter" && time < 48 && Math.floor(time / 12) % 2) canvas.lines.forEach((line, row) => { const at = line.lastIndexOf(" over"); if (at >= 0) grid.text(row, at, "     "); });
  });
}

export const motionBarChart = (data, options, render) => metricMotion(data, options, render, "bar");
export const motionCohort = (data, options, render) => metricMotion(data, options, render, "cohort");
export const motionSparkline = (data, options, render) => metricMotion(data, options, render, "spark");
export const motionMetricPanel = (data, options, render) => metricMotion(data, options, render, "spark");
export const motionMeter = (data, options, render) => metricMotion(data, options, render, "meter");
export const motionForecast = (data, options, render) => metricMotion(data, options, render, "forecast");
export const motionCalendarStrip = (data, options, render) => metricMotion(data, options, render, "calendar");
export const motionHeatmap = (data, options, render) => metricMotion(data, options, render, "heat");
