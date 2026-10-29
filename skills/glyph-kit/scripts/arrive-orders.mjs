// Arrival orders for the types whose renderer doesn't carry its own. Each is the order the per-type
// motion review settled on: what the reader must see, in the order that shows it. Orders work in
// abstract steps; `scaled` maps them onto the 40ms clock within the budget, so a figure arrives
// within about 600ms and a diagram that grows along its lines within about 1.1s.
import { ARRIVE_MAX, ARRIVE_STEP, STEPPED, STEPPED_LAND, barsFill, cellsOf, readingOrder } from "./arrive.mjs";

const BOX = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬┄┆";
const BLOCK = /[█▓▒░■▏▎▍▌▋▊▉▁▂▃▄▅▆▇]/u;
const grid = (lines) => lines.map((l) => [...l]);

/** Map an order in abstract steps onto milliseconds, whole 40ms steps, within `budget`: every cell,
 *  a block cell's two steps included, has landed by `budget` plus the first step. */
function scaled(lines, units, { budget = ARRIVE_MAX - 2 * ARRIVE_STEP, under } = {}) {
  const g = grid(lines);
  let per = ARRIVE_STEP;
  g.forEach((row, r) => row.forEach((ch, c) => {
    const u = ch === " " ? 0 : units(r, c, ch, g) || 0;
    if (u) per = Math.min(per, (budget - (STEPPED.test(ch) ? STEPPED_LAND : 0)) / u);
  }));
  const fn = (r, c, ch) => {
    const u = units(r, c, ch, g) || 0;
    return u ? ARRIVE_STEP + Math.round((u * per) / ARRIVE_STEP) * ARRIVE_STEP : 0;
  };
  return under ? Object.assign(fn, { under }) : fn;
}

/** Breadth-first growth from the start along touching marks, bridging gaps of up to 3 cells on a row.
 *  Words arrive whole when the line first reaches them. */
function grow(lines, isStart) {
  const g = grid(lines);
  const dist = g.map((row) => row.map(() => Infinity));
  const queue = [];
  g.forEach((row, r) => row.forEach((ch, c) => { if (ch !== " " && isStart(r, c, ch, g)) { dist[r][c] = 0; queue.push([r, c]); } }));
  if (!queue.length) return () => 0;
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2], [0, 3], [0, -3]]) {
      const R = r + dr, C = c + dc;
      if (g[R]?.[C] && g[R][C] !== " " && dist[R][C] === Infinity) { dist[R][C] = dist[r][c] + 1; queue.push([R, C]); }
    }
  }
  g.forEach((row, r) => {
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const word = c < row.length && /[\p{L}\p{N}?'’.,:%→]/u.test(row[c]);
      if (word && start < 0) start = c;
      if (!word && start >= 0) { const m = Math.min(...dist[r].slice(start, c)); for (let k = start; k < c; k++) dist[r][k] = m; start = -1; }
    }
  });
  const reached = dist.flat().filter((d) => d !== Infinity);
  const last = Math.max(...reached);
  return scaled(lines, (r, c) => (dist[r][c] === Infinity ? last + 1 : dist[r][c] + 1), { budget: 1100 - ARRIVE_STEP });
}

const rowBlocks = (row) => {
  const cols = row.flatMap((ch, c) => (BLOCK.test(ch) ? [c] : []));
  return cols.length ? { first: cols[0], last: cols.at(-1) } : null;
};

export const ORDERS = {
  // Out from the centre line, both ways; each row's share lands when its row is complete.
  likert: (lines) => scaled(lines, (r, c, ch, g) => {
    const centre = g[0].indexOf("│");
    const b = rowBlocks(g[r]);
    if (!b || centre < 0 || ch === "│") return 0;
    const row = 1 + r;
    const reach = Math.max(centre - b.first, b.last - centre);
    if (c < b.first) return 0;
    if (c > b.last) return row + reach + 2;
    return row + Math.abs(c - centre);
  }),
  // Participant by participant; the count lands at the end.
  themeMatrix: (lines) => scaled(lines, (r, c, ch, g) => {
    const head = g[0].join("");
    const ps = [...head.matchAll(/\S+/g)].slice(0, -1).map((m) => m.index);
    const n = head.lastIndexOf("n");
    if (r === 0 || c < (ps[0] ?? 0)) return 0;
    if (c >= n - 2) return ps.length * 2 + 2;
    const k = ps.findIndex((p, i) => c >= p && c < (ps[i + 1] ?? n - 2));
    return k < 0 ? 0 : 1 + k * 2;
  }),
  // The whole (empty slots) first, then the count fills, then "5 of 6".
  affinity: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (!b || ch === "·" || c < b.first) return 0;
    if (c > b.last + 1 && !g[r].slice(b.last + 1, c).every((x) => x === "·" || x === " ")) return 12;
    return ch === "■" ? 1 + (c - b.first) : 12;
  }),
  // Median first, then the middle half, then the whiskers, then completions.
  taskStats: (lines) => scaled(lines, (r, c, ch, g) => {
    const row = g[r].join("");
    const a = row.indexOf("├"), z = row.indexOf("┤", a);
    if (a < 0 || z < 0) return 0;
    const med = row.indexOf("│", a);
    if (c < a) return 0;
    if (c > z) return 16;
    if (c === med) return 1;
    if (ch === "█") return 2 + Math.abs(c - med);
    return 8 + Math.abs(c - med) / 2;
  }),
  // Measured parts month by month, then the projection grows out of the last one, then its words.
  forecast: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (!b) return 0;
    if (ch === "█") return 1 + r * 2 + (c - b.first) * 0.2;
    if (ch === "░") return 12 + (c - b.first) * 0.4;
    if (c < b.first) return 0;
    return g[r].includes("░") ? 30 : 1 + r * 2 + (b.last - b.first) * 0.2 + 2;
  }),
  // The empty scale stays; the fill steps along it; the share lands at the end.
  meter: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (!b || ch === "░" || ch === "[" || ch === "]" || c < b.first) return 0;
    if (ch === "█") return 1 + (c - b.first);
    return 1 + (b.last - b.first) + 2;
  }, { under: "░" }),
  // Left to right in time order, fast; the last value lands at the end.
  sparkline: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (!b || c < b.first) return 0;
    return c <= b.last ? 1 + (c - b.first) : 1 + (b.last - b.first) + 2;
  }, { budget: 300 }),
  // Densest cells first, down to the lightest.
  heatmap: (lines) => scaled(lines, (r, c, ch) => ({ "█": 1, "▓": 3, "▒": 5, "░": 7 })[ch] ?? 0),
  // Day by day in date order; the count lands at the end.
  calendarStrip: (lines, data, { hit = "■", miss = "·" } = {}) => scaled(lines, (r, c, ch, g) => {
    const day = (x) => x === hit || x === miss;
    const b = g[r].findIndex(day);
    if (b < 0) return 0;
    const end = g[r].findLastIndex(day);
    return c <= end ? 1 + (c - b) / 2 : 1 + (end - b) / 2 + 2;
  }),
  // Period by period, every cohort at once.
  cohort: (lines) => scaled(lines, (r, c, ch, g) => {
    const m0 = g[0].join("").indexOf("M0");
    if (r === 0 || m0 < 0 || c < m0 || !BLOCK.test(ch)) return 0;
    return 1 + Math.floor((c - m0) / 4) * 3;
  }),
  // The estimate, then its interval opening out, then the numbers, then the verdict.
  abResult: (lines) => scaled(lines, (r, c, ch, g) => {
    const row = g[r].join("");
    const a = row.indexOf("├"), z = row.indexOf("┤", a);
    if (/^The intervals/.test(row)) return 16;
    if (a < 0 || z < 0) return 0;
    const m = row.indexOf("█", a);
    if (c < a) return 0;
    if (c > z) return 12;
    if (c === m) return 1;
    return 2 + Math.abs(c - m) * 0.5;
  }),
  // Row by row: the trend in time order, then now, then the change.
  metricPanel: (lines) => scaled(lines, (r, c, ch, g) => {
    const head = g[0].join("");
    const t = head.indexOf("trend"), now = head.indexOf("now") - 4, ch0 = head.indexOf("change");
    const content = g.slice(0, r).filter((row) => row.join("").trim()).length;
    if (r === 0 || !g[r].join("").trim()) return 0;
    const base = content * 2;
    if (c < t) return 0;
    if (c < now) return base + 1 + (c - t) * 0.6;
    if (c < ch0) return base + 6;
    return base + 8;
  }),
  // Diagrams grow from their start along their own lines.
  flow: (lines) => grow(lines, (r, c) => r === 0 && c === 0),
  branchFlow: (lines) => grow(lines, (r, c) => r === 0 && c === 0),
  stateMachine: (lines) => grow(lines, (r, c, ch) => ch === "┏"),
  tree: (lines) => grow(lines, (r) => r === 0),
  swimlane: (lines) => {
    const g = grow(lines, (r, c, ch, g2) => r === 2 && c === 0);
    return (r, c, ch) => (r < 2 ? 0 : g(r, c, ch));
  },
  // Now, then next, then later.
  board: (lines) => scaled(lines, (r, c, ch, g) => {
    if (BOX.includes(ch)) return 0;
    const cuts = g[0].flatMap((x, i) => (x === "┬" ? [i] : []));
    const k = cuts.filter((x) => x < c).length;
    return 1 + k * 4 + (r === 0 ? 0 : r * 0.4);
  }),
  // The quadrants first, then items by value: high impact for low effort first.
  impactEffort: (lines, data) => {
    const rank = [...data.keys()].sort((a, b) => (data[b].impact - data[b].effort) - (data[a].impact - data[a].effort));
    return scaled(lines, (r, c, ch, g) => {
      const row = g[r].join("");
      for (const m of row.matchAll(/\[(\d+)\]/g)) {
        const at = rank.indexOf(Number(m[1]) - 1);
        const legend = m.index === 0;
        if (at >= 0 && (legend || (c >= m.index && c < m.index + m[0].length))) return 1 + at * 2;
      }
      return 0;
    });
  },
  // Bars from their start week at one speed; dates land at each bar's end.
  gantt: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (!b || ch === "·") return 0;
    const origin = g[r].findIndex((x) => x === "·" || BLOCK.test(x));
    if (c < origin) return 1 + (b.first - origin);
    if (c <= b.last) return 1 + (c - origin);
    return 1 + (b.last - origin) + 2;
  }, { under: "·" }),
  // Each swatch climbs the ramp to its own level, one after another.
  statusKey: (lines) => scaled(lines, (r) => 1 + r * 2),
  // Reading order, then the note pins land on their rows.
  screen: (lines) => {
    const read = readingOrder(lines);
    const last = Math.max(...lines.map((l, r) => read(r, 1, "x")));
    return (r, c, ch) => {
      const outside = c > lines[r].lastIndexOf("║") && lines[r].includes("║");
      if (outside || /^\[\d\]/.test(lines[r])) return last + 2 * ARRIVE_STEP;
      return read(r, c, ch);
    };
  },
  // Screen layouts read like a screen: header, then each region in reading order.
  appShell: (lines) => ORDERS.screen(lines),
  cardGrid: (lines) => ORDERS.screen(lines),
  listDetail: (lines) => ORDERS.screen(lines),
  modal: (lines) => ORDERS.screen(lines),
  // Desktop first, then mobile row by row against it.
  responsive: (lines) => {
    const split = lines[0].indexOf("Mobile");
    return scaled(lines, (r, c, ch) => {
      if (BOX.includes(ch)) return c < split ? 0 : 1 + 8;
      return c < split ? 1 + r : 10 + r;
    });
  },
  // The unit first, then each token counted out at one speed.
  spacingScale: (lines) => barsFill(lines),
  // The body size first, then the sizes either side of it, then the largest.
  typeScale: (lines, data) => {
    const body = data.find((t) => /body/i.test(t.name ?? t.label ?? "")) ?? data[Math.floor(data.length / 2)];
    const size = (t) => t.size ?? t.px ?? 0;
    const order = data.map((t) => Math.abs(size(t) - size(body)));
    const ranks = [...new Set(order)].sort((a, b) => a - b);
    return scaled(lines, (r, c, ch, g) => {
      if (r >= data.length) return 0;
      const b = rowBlocks(g[r]);
      const base = 1 + ranks.indexOf(order[r]) * 4;
      return b && c >= b.first ? base + (c - b.first) * 0.1 : base;
    });
  },
  // The thresholds first, then each pair fills toward its ratio, then its verdict.
  contrast: (lines) => scaled(lines, (r, c, ch, g) => {
    const b = rowBlocks(g[r]);
    if (r === 0 || !b || ch === "┊" || ch === "·" || c < b.first) return 0;
    if (c <= b.last) return 1 + (c - b.first) * 0.3;
    return 1 + (b.last - b.first) * 0.3 + 2;
  }, { under: "·" }),
  // Done first, then in progress, then missing: the gaps land last.
  stateMatrix: (lines) => scaled(lines, (r, c, ch) => ({ "█": 1, "▒": 4, "░": 7 })[ch] ?? 0),
  // From the page up.
  layerStack: (lines) => {
    const rows = lines.map((l) => l.trim().length > 0);
    const last = rows.lastIndexOf(true);
    return scaled(lines, (r) => (rows[r] && !/SAMPLE DATA/.test(lines[r]) ? 1 + (last - r) * 3 : 0));
  },
  // The edges first, then the span opens from its centre.
  redline: (lines) => scaled(lines, (r, c, ch, g) => {
    const row = g[r].join("");
    const a = row.indexOf("│", 1), z = row.lastIndexOf("│", row.length - 2);
    if (a < 0 || z <= a || c <= a || c >= z) return 0;
    return 1 + Math.abs(c - (a + z) / 2) / 2;
  }),
  // The container stands, then each part lands in number order on the same step as its legend line,
  // so number, place and rule are read together; the key lands last.
  anatomy: (lines) => {
    const cells = cellsOf(lines);
    // Every numbered box: its marker on the top edge (┌ 3), its columns, and the rows down to its └.
    const boxes = [];
    cells.forEach((row, r) => row.forEach((c, i) => {
      const m = c.ch === "┌" && row[i + 1]?.ch === " " && /\d/.test(row[i + 2]?.ch ?? "") ? Number(row[i + 2].ch) : 0;
      if (!m) return;
      const right = row.find((x) => x.col > c.col && x.ch === "┐")?.col ?? c.col;
      let bottom = r;
      while (bottom + 1 < cells.length && !cells[bottom + 1].some((x) => x.col === c.col && x.ch === "└")) bottom++;
      boxes.push({ m, top: r, bottom: bottom + 1, left: c.col, right });
    }));
    const markers = boxes.length;
    const unit = (m) => 1 + (m - 1) * 2;
    return scaled(lines, (r, c) => {
      const legend = lines[r].match(/^(\d+)  /);
      if (legend) return unit(Number(legend[1]));
      if (/^┄ /.test(lines[r])) return unit(markers + 1);
      // The innermost box holding this cell; the container's own edge stands from the start.
      const own = boxes.filter((b) => r >= b.top && r <= b.bottom && c >= b.left && c <= b.right).sort((a, b) => b.m - a.m)[0];
      if (!own) return 0;
      if (own.m === 1) return r === own.top && c === own.left + 2 ? unit(1) : 0;
      return unit(own.m);
    });
  },
  // Progress first, then the items in order; a blocked item flashes as it lands.
  qaChecklist: (lines) => scaled(lines, (r) => (r < 2 ? 0 : 1 + (r - 2) * 2))
};
