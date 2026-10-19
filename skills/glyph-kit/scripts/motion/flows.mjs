import { motionCanvas, motionFactory, motionProgress, cycle } from "./shared.mjs";
import { motionStates } from "./process.mjs";
import { Grid } from "../live/grid.mjs";

function flowBoxes(canvas) {
  const boxes = [];
  canvas.matrix.forEach((line, row) => line.forEach((char, col) => {
    if (!["┌", "╔"].includes(char)) return;
    const right = line.findIndex((ch, i) => i > col && ["┐", "╗"].includes(ch));
    if (right < 0) return;
    const bottom = canvas.matrix.findIndex((r, i) => i > row && ["└", "╚"].includes(r[col]) && ["┘", "╝"].includes(r[right]));
    if (bottom >= 0) boxes.push({ row, col, width: right - col + 1, bottom });
  }));
  return boxes;
}

function packetFlow(data, options, render, branching) {
  const canvas = motionCanvas(render(data, options));
  const boxes = flowBoxes(canvas);
  const spine = branching ? boxes.filter((box) => box.col === 0) : boxes;
  const branches = branching ? boxes.filter((box) => box.col > 0) : [];
  const path = [];
  spine.forEach((box, index) => {
    path.push({ box });
    const branch = branches.find((item) => item.row === box.row);
    if (branch) path.push({ box: branch, failure: true }, { box, failure: true });
  });
  const routing = new Grid(1, 1);
  const legs = path.slice(1).map((next, index) => {
    const a = path[index].box, b = next.box;
    const start = a.row === b.row ? [a.row + 1, a.col + a.width] : [a.bottom + 1, a.col + Math.floor(a.width / 2)];
    const end = a.row === b.row ? [b.row + 1, b.col - 1] : [b.row - 1, b.col + Math.floor(b.width / 2)];
    return routing.route([start, [end[0], start[1]], end]);
  });
  return motionFactory(canvas, (grid, time, step) => {
    if (!path.length) return;
    const progress = motionProgress(time, 0, 150);
    if (progress === 1) { const last = spine.at(-1); grid.put(last.row, last.col + 1, "▓", "ok"); return; }
    const position = progress * path.length;
    const index = Math.min(path.length - 1, Math.floor(position));
    const item = path[index], age = position - index;
    const role = item.failure ? "fail" : "";
    if (age < 0.4) grid.flash(item.box.row, item.box.col, item.box.width, 3 * (1 - age / 0.4), role);
    else if (legs[index]?.length) grid.packet(legs[index], ((age - 0.4) / 0.6) * (legs[index].length - 1), role);
  });
}
export const motionFlow = (data, options, render) => packetFlow(data, options, render, false);
export const motionBranchFlow = (data, options, render) => packetFlow(data, options, render, true);

export function motionStateMachine(data, options = {}) {
  const states = [...new Set(data.flatMap((transition) => [transition.from, transition.to]))];
  let path = options.path;
  if (!path) {
    path = [options.initial ?? states[0]];
    for (let index = 0; index < 16; index++) {
      const next = data.find((transition) => transition.from === path.at(-1));
      if (!next || path.includes(next.to)) break;
      path.push(next.to);
    }
  }
  if (!path.length || path.some((state) => !states.includes(state)) || path.slice(1).some((state, index) => !data.some((t) => t.from === path[index] && t.to === state))) throw new Error("Every step in the played path must follow a listed transition.");
  return motionStates({ states, transitions: data.map((t) => ({ ...t, label: t.event })), path }, { ...options, settleAtEnd: true });
}

export function motionJourneyMap(data, options, render) {
  const canvas = motionCanvas(render(data, options));
  const colWidth = Math.min(options?.colWidth ?? 18, Math.floor((80 - 9) / Math.max(1, data.length)));
  const thinking = canvas.lines.findIndex((line) => line.startsWith("thinking"));
  const feeling = canvas.lines.findIndex((line) => line.startsWith("feeling"));
  return motionFactory(canvas, (grid, time, step) => {
    const index = Math.min(data.length - 1, Math.floor(motionProgress(time, 0, 140) * data.length));
    if (index < 0) return;
    const col = 9 + index * colWidth;
    grid.put(1, col, "▓", data[index].feeling > 0 ? "ok" : data[index].feeling < 0 ? "fail" : "");
    if (thinking >= 0 && time < 140) {
      for (let row = thinking; row < (feeling < 0 ? canvas.rows : feeling); row++) {
        const text = canvas.matrix[row].slice(col, col + colWidth - 2).join("");
        grid.scramble(row, col, text, (time % (140 / data.length)), step);
      }
    }
  });
}
