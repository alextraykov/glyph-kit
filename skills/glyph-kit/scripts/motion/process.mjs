import { upper, formatNumber } from "../text.mjs";
// Moving diagrams from a spec. Each kind takes { kind, title, intent, source, data } and returns a
// factory: call it for a fresh diagram, a function (step, frac) → Grid. `still` is the step that
// stands in for the whole animation when motion is off, in print and in Markdown.
import { cut, width as textWidth } from "../text.mjs";
import { cycle, motionProgress } from "./shared.mjs";
import { FADE, Grid, changes, clamp, easeInOut, hash, mod, rand } from "../live/grid.mjs";

const pad = (n, w) => String(n).padStart(w, " ");
const boxW = (labels, min = 8, lang) => Math.max(min, ...labels.map((l) => textWidth(cut(upper(l, lang), 24)) + 4));
const liveGap = (count, width, gap, reserve = 0) => {
  const room = 80 - count * width - reserve;
  if (!count || room < Math.max(0, count - 1)) throw new Error(`These labels fit at most ${Math.floor((80 - reserve + 1) / (width + 1))} columns; this diagram has ${count}.`);
  return count > 1 ? Math.min(gap, Math.floor(room / (count - 1))) : gap;
};

/* Loop: work moves through stages; some of it is sent back from one stage to an earlier one. ------ */
// data: { stages: ["Design", "Build", "QA", "Ship"], back: { from: "QA", to: "Build", share: 0.3, label } }
function processLoop({ data, options = {} }) {
  const stages = data.stages;
  const back = data.back ?? null;
  const W = boxW(stages, 10, options.lang);
  const GAP = liveGap(stages.length, W, 9, 13);
  const T = 3;
  const xs = stages.map((_, i) => i * (W + GAP));
  const cols = xs.at(-1) + W + 13;
  const from = back ? stages.indexOf(back.from) : -1;
  const to = back ? stages.indexOf(back.to) : -1;
  const share = back?.share ?? 0;
  const r = rand(11);
  const PLAN = Array.from({ length: 80 }, (_, i) => ({ born: i * 7, rework: r() < share }));
  const CYCLE = 420;

  return () => {
    const since = changes();
    return (step, frac) => {
    const s = (step % CYCLE) + frac;
    const g = new Grid(back ? 12 : 8, cols);
    stages.forEach((label, i) => g.box(T - 1, xs[i], W, cut(upper(label, options.lang), 24), i === stages.length - 1 ? "ok" : ""));
    const legs = stages.slice(1).map((_, i) => g.line([[T, xs[i] + W], [T, xs[i + 1] - 1]], "mute"));
    let ret = null;
    if (back) {
      const a = xs[from] + Math.floor(W / 2);
      const b = xs[to] + Math.floor(W / 2);
      ret = g.line([[T + 2, a], [T + 5, a], [T + 5, b], [T + 2, b]], "fail");
      const labelRoom = Math.min(cols, 2 * Math.min(Math.floor((a + b) / 2), cols - Math.ceil((a + b) / 2)));
      g.center(T + 6, b, a, cut(back.label ?? `${Math.round(share * 100)}% sent back`, labelRoom), "fail");
    }
    // Each item: a leg takes `len` cells, every stage holds it for HOLD steps; rework adds a lap.
    const HOLD = 6;
    let shipped = 0;
    let reworked = 0;
    let lastShip = 99;
    const busy = new Set();
    PLAN.forEach(({ born, rework }) => {
      let t = s - born;
      if (t < 0) return;
      const path = [];
      for (let i = 0; i < stages.length - 1; i++) path.push({ hold: i }, { leg: i });
      if (rework) {
        const at = path.findIndex((p) => p.hold === from) + 1;
        const redo = [{ ret: true }];
        for (let i = to; i < from; i++) redo.push({ hold: i }, { leg: i });
        redo.push({ hold: from });
        path.splice(at, 0, ...redo);
      }
      for (const p of path) {
        const len = p.hold !== undefined ? HOLD : p.ret ? ret.length : legs[p.leg].length;
        if (t < len) {
          if (p.hold !== undefined) busy.add(p.hold);
          else g.packet(p.ret ? ret : legs[p.leg], t, p.ret ? "fail" : "");
          return;
        }
        t -= len;
      }
      shipped++;
      if (rework) reworked++;
      lastShip = Math.min(lastShip, t);
    });
    busy.forEach((i) => g.chase(T - 1, xs[i], W, s * 2.2 + i * 9));
    const last = stages.length - 1;
    g.flash(T - 1, xs[last], W, 2 - lastShip, "ok");
    g.scramble(0, xs[last], `${pad(shipped, 2)} shipped`, since("s", shipped, step), step, "ok");
    if (back) g.scramble(0, xs[from], `${pad(reworked, 2)} came back`, since("r", reworked, step), step, "fail");
    return g;
    };
  };
}
processLoop.still = 260;

/* Funnel: people fall through the steps; the ones who leave drift out to the side and fade. ------ */
// data: { steps: [{ label, value }, ...] } in order, largest first.
function processFunnel({ data, options = {} }) {
  const steps = data.steps;
  if (!steps.length || steps.length > 16) throw new Error("A moving funnel supports between 1 and 16 steps.");
  const LABEL = Math.max(...steps.map((s) => textWidth(cut(s.label, 24)))) + 3;
  const BAR = Math.min(44, 80 - LABEL - 16);
  const top = steps[0].value || 1;
  const cols = LABEL + BAR + 16;
  const ROW = 3;
  const rows = (steps.length - 1) * ROW + 1;
  const span = (k) => {
    const width = Math.max(2, Math.round((steps[k].value / top) * BAR));
    const from = LABEL + Math.floor((BAR - width) / 2);
    return [from, width];
  };
  // Each person reaches step k with the funnel's own odds; seeded, so every run is the same.
  const r = rand(7);
  const people = Array.from({ length: 360 }, (_, i) => {
    let reach = 0;
    while (reach < steps.length - 1 && r() < steps[reach + 1].value / steps[reach].value) reach++;
    return { born: i * 1.05, reach, lane: r(), side: r() < 0.5 ? -1 : 1 };
  });
  const CYCLE = 400;
  const FALL = 5; // steps to fall from one bar to the next

  return () => (step, frac) => {
    const s = (step % CYCLE) + frac;
    const g = new Grid(rows, cols);
    steps.forEach((st, k) => {
      const row = k * ROW;
      const [from, width] = span(k);
      g.text(row, 0, cut(st.label, 24), k === steps.length - 1 ? "ok" : "");
      for (let c = 0; c < width; c++) g.put(row, from + c, "▒", k === steps.length - 1 ? "ok" : "mute");
      g.text(row, LABEL + BAR + 2, cut(formatNumber(st.value, options.lang ?? "en-US"), 7));
      if (k) {
        const kept = steps[k - 1].value ? st.value / steps[k - 1].value : 0;
        g.text(row, LABEL + BAR + 10, `${Math.round(kept * 100)}%`, kept < 0.5 ? "fail" : "mute");
      }
    });
    const xAt = (p, k) => {
      const [from, width] = span(Math.min(k, steps.length - 1));
      return from + p.lane * (width - 1);
    };
    people.forEach((p) => {
      const t = (s - p.born) / FALL;
      if (t < 0 || t > steps.length + 2) return;
      const k = Math.floor(t);
      const into = t - k;
      if (k < p.reach) {
        // Falling from bar k to bar k + 1, drawn toward the narrower bar's centre.
        const y = k * ROW + into * ROW;
        const x = xAt(p, k) + (xAt(p, k + 1) - xAt(p, k)) * easeInOut(into);
        g.glide(y, x, "▓");
        g.glide(y - 0.7, x, "░");
      } else if (k === p.reach && k < steps.length - 1) {
        // Left at this step: drift out past the end of the bar and fade.
        const [from, width] = span(k);
        const edge = p.side < 0 ? from - 1 : from + width;
        const x = edge + p.side * into * 6;
        const level = Math.min(3, Math.floor(into * 4));
        g.put(k * ROW + 1, Math.round(x), FADE[level], "fail");
      } else if (k === p.reach) {
        g.deposit(k * ROW, Math.round(xAt(p, k)), 1 - into * 0.5, "ok");
      }
    });
    return g;
  };
}
processFunnel.still = 260;

/* States: a state machine, and one path through it played by a token. ----------------------------- */
// data: { states: ["Idle", ...], transitions: [{ from, to, label }], path: ["Idle", "Loading", ...] }
function processStates({ data, options = {} }) {
  const names = data.states;
  const W = boxW(names, 11, options.lang);
  const GAP = liveGap(names.length, W, 10, 2);
  const xs = names.map((_, i) => i * (W + GAP));
  const cols = xs.at(-1) + W + 2;
  const idx = (n) => names.indexOf(n);
  const mid = (i) => xs[i] + Math.floor(W / 2);
  // Forward neighbours run straight along the row; every other transition gets its own lane,
  // above the row going forward and below it going back. Labels sit on their line.
  const shape = data.transitions.map((t) => ({ ...t, a: idx(t.from), b: idx(t.to) }));
  const ups = shape.filter((e) => e.b > e.a + 1).length;
  const downs = shape.filter((e) => e.b < e.a).length;
  const T = 2 + ups * 2 + 1; // the box row's middle line
  let up = 0;
  let down = 0;
  const edges = shape.map((e) => {
    const { a, b } = e;
    if (b === a + 1) return { ...e, pts: [[T, xs[a] + W], [T, xs[b] - 1]], label: e.label, lab: [T, xs[a] + W, xs[b] - 1] };
    const off = b > a ? 2 : -2;
    const ca = mid(a) + off;
    const cb = mid(b) - off;
    const y = b > a ? T - 3 - up++ * 2 : T + 3 + down++ * 2;
    const edge = b > a ? T - 2 : T + 2;
    return { ...e, pts: [[edge, ca], [y, ca], [y, cb], [edge, cb]], lab: [y, Math.min(ca, cb), Math.max(ca, cb)] };
  });
  const rows = T + 3 + downs * 2 + 1;
  const HOLD = 14;
  const legs = data.path.slice(1).map((n, i) => edges.find((e) => e.from === data.path[i] && e.to === n));

  const routes = legs.map((e) => (e ? new Grid(1, 1).route(e.pts) : []));
  const CYCLE = routes.reduce((sum, r) => sum + HOLD + r.length, 0) + HOLD;
  const make = () => {
    const since = changes();
    return (step, frac) => {
      const s = Grid.settled && options.settleAtEnd ? CYCLE - HOLD : (step % CYCLE) + frac;
      const g = new Grid(rows, cols);
      let at = idx(data.path[0]);
      let moving = null;
      let t = s;
      for (let i = 0; i < legs.length; i++) {
        if (t < HOLD) break;
        t -= HOLD;
        if (t < routes[i].length) { moving = { i, t }; at = -1; break; }
        t -= routes[i].length;
        at = idx(data.path[i + 1]);
      }
      if (!options.settleAtEnd && at === idx(data.path.at(-1)) && !moving && s > CYCLE - HOLD) at = idx(data.path[0]);
      edges.forEach((e) => g.line(e.pts, moving && legs[moving.i] === e ? "" : "mute"));
      if (moving) g.packet(routes[moving.i], moving.t);
      edges.forEach((e) => {
        const on = moving && legs[moving.i] === e;
        if (e.label) {
          const [y, c0, c1] = e.lab;
          g.label(y, c0, c1, cut(` ${e.label} `, Math.max(1, c1 - c0 + 1)), on ? "" : "mute");
        }
      });
      names.forEach((n, i) => {
        const here = i === at;
        const role = /error|fail/i.test(n) ? "fail" : /ready|done|success|saved|sent/i.test(n) ? "ok" : "";
        g.box(T - 1, xs[i], W, cut(upper(n, options.lang), 24), here ? role : "mute");
        if (here) g.chase(T - 1, xs[i], W, s * 2.4, role);
      });
      const now = moving ? `${legs[moving.i].from} → ${legs[moving.i].to}` : names[at] ?? "";
      g.scramble(0, 0, cut(now, cols), since("now", now, step), step);
      return g;
    };
  };
  make.still = options.settleAtEnd ? Math.max(1, CYCLE - HOLD) : 8;
  return make;
}
processStates.still = 8;

/* Queue: columns with work-in-progress limits. The slowest column fills up and the rest wait. ----- */
// data: { columns: [{ label, limit, pace }] }  pace = steps a card spends there. The first column
// is the backlog (no limit), the last is done.
function processQueue({ data, options = {} }) {
  const cols = data.columns;
  const W = boxW(cols.map((c) => c.label), 12, options.lang);
  const GAP = liveGap(cols.length, W, 3);
  const xs = cols.map((_, i) => i * (W + GAP));
  const H = 8;
  const width = xs.at(-1) + W;
  const CYCLE = 460;

  return () => {
    const since = changes();
    let lastStep = -1;
    let cards = [];
    let id = 0;
    const advance = (s) => {
      if (s === 0) (cards = []), (id = 0);
      if (s % 9 === 0 && s < CYCLE - 60) cards.push({ id: id++, col: 0, since: s, moved: -99 });
      // Pull from the right, so a full column blocks the one before it.
      for (let c = cols.length - 2; c >= 0; c--) {
        const here = cards.filter((k) => k.col === c).sort((a, b) => a.since - b.since);
        const nextLimit = cols[c + 1].limit ?? Infinity;
        for (const k of here) {
          const done = s - k.since >= (cols[c].pace ?? 0);
          const room = cards.filter((x) => x.col === c + 1).length < nextLimit;
          if (done && room) Object.assign(k, { col: c + 1, since: s, moved: s, from: c });
        }
      }
    };
    return (step, frac) => {
      while (lastStep < step) { lastStep++; advance(lastStep % CYCLE); }
      const s = (step % CYCLE) + frac;
      const g = new Grid(H + 3, width);
      cols.forEach((c, i) => {
        const inCol = cards.filter((k) => k.col === i);
        const isFull = c.limit && inCol.length >= c.limit;
        const last = i === cols.length - 1;
        const cap = c.limit ? `${inCol.length}/${c.limit}` : String(inCol.length);
        g.text(0, xs[i], cut(upper(c.label, options.lang), W - textWidth(cap) - 1), isFull ? "fail" : last ? "ok" : "");
        g.scramble(0, xs[i] + W - textWidth(cap), cap, since(`c${i}`, cap, step), step, isFull ? "fail" : "mute");
        for (let x = 0; x < W; x++) g.put(1, xs[i] + x, "─", isFull ? "fail" : "mute");
        // Cards stack from the top; the ones that can't move on show as waiting (▒).
        inCol.sort((a, b) => a.since - b.since).forEach((k, n) => {
          const row = 2 + Math.floor(n / 2);
          if (row > H) return;
          const x = xs[i] + (n % 2) * Math.ceil(W / 2);
          const waiting = !last && s - k.since >= (c.pace ?? 0);
          const just = s - k.moved < 3;
          const span = Math.ceil(W / 2) - 1;
          const role = last ? "ok" : i === 0 ? "mute" : waiting ? "fail" : "";
          for (let j = 0; j < span; j++) g.put(row, x + j, just ? FADE[Math.min(3, Math.floor(s - k.moved))] : waiting ? "▒" : "▓", role);
        });
      });
      // The bottleneck: a full column whose next column has room, so its own work is the limit.
      const count = (i) => cards.filter((k) => k.col === i).length;
      const full = (i) => cols[i].limit && count(i) >= cols[i].limit;
      const worst = cols.findLastIndex((c, i) => i > 0 && i < cols.length - 1 && full(i) && !full(i + 1) && count(i - 1) > 0);
      const msg = worst > 0 ? `▲ ${cut(cols[worst].label, Math.max(1, width - 22))} holds everything up` : "";
      g.scramble(H + 2, worst > 0 ? Math.min(xs[worst], width - textWidth(msg)) : 0, msg, since("b", msg, step), step, "fail");
      return g;
    };
  };
}
processQueue.still = 220;

/* Rollout: a feature goes out in stages, a guard metric watches, a breach rolls it back. ---------- */
// data: { stages: [1, 5, 25, 50, 100], metric: "Error rate", limit: 2, breachAt: 25 }
function processRollout({ data, options = {} }) {
  const stages = data.stages;
  if (stages.length < 2 || stages.length > 8) throw new Error("A rollout supports between 2 and 8 stages.");
  const COLS = 50;
  const ROWS = 4;
  const people = COLS * ROWS;
  const GX = 20;
  const width = GX + COLS + 10;
  const HOLD = 46;
  const breach = stages.indexOf(data.breachAt ?? -1);
  // Timeline: each stage holds; at the breach stage the guard trips, it rolls back to the stage
  // before, waits for the fix, then carries on.
  const plan = [];
  stages.forEach((p, i) => {
    plan.push({ pct: p, i, hold: HOLD, ok: true });
    if (i === breach) plan.push({ pct: p, i, hold: 18, ok: false }, { pct: stages[i - 1] ?? 0, i: i - 1, hold: 40, ok: true, back: true });
  });
  const CYCLE = plan.reduce((a, p) => a + p.hold, 0) + 30;
  const order = Array.from({ length: people }, (_, i) => i).sort((a, b) => hash(a, 3) - hash(b, 3));

  return () => {
    const since = changes();
    return (step, frac) => {
    const s = (step % CYCLE) + frac;
    let t = s;
    let k = 0;
    while (k < plan.length - 1 && t >= plan[k].hold) t -= plan[k++].hold;
    const cur = plan[k];
    const prev = plan[k - 1];
    const g = new Grid(ROWS + 10, width);
    // Stage ladder.
    g.text(1, 0, "ROLLOUT");
    const stageX = (i) => GX + Math.round((i / (stages.length - 1)) * (COLS - 1));
    const role = cur.ok ? "ok" : "fail";
    for (let c = 0; c < COLS; c++) g.put(1, GX + c, GX + c <= stageX(Math.max(0, cur.i)) ? "━" : "─", GX + c <= stageX(Math.max(0, cur.i)) ? role : "mute");
    stages.forEach((p, i) => {
      const reached = cur.i >= i;
      const label = `${p}%`;
      g.put(1, stageX(i), reached ? "▓" : "┼", reached ? role : "mute");
      g.text(0, Math.min(GX + COLS - textWidth(label), Math.max(GX, stageX(i) - Math.floor(textWidth(label) / 2))), label, reached ? role : "mute");
    });
    // People: switch on in a stable random order, so a stage's share is always the same people.
    const ease = clamp(t / 8);
    const target = (cur.pct / 100) * people;
    const from = prev ? (prev.pct / 100) * people : 0;
    const on = from + (target - from) * easeInOut(ease);
    order.forEach((p, n) => {
      const r = Math.floor(p / COLS);
      const c = p % COLS;
      const lit = n < on;
      const edge = n >= on - 2 && n < on && ease < 1;
      g.put(3 + r, GX + c, lit ? (edge ? "▒" : "▓") : "·", lit ? (cur.ok ? "ok" : "fail") : "mute");
    });
    g.text(3, 0, "PEOPLE");
    g.scramble(4, 0, `${Math.round((on / people) * 100)}% on`, Math.floor(ease * 8), step, cur.ok ? "ok" : "fail");
    // Guard metric: a strip chart that scrolls; it spikes during the breach.
    const Y = ROWS + 5;
    g.text(Y, 0, cut(upper(data.metric ?? "Guard", options.lang), GX - 2));
    g.text(Y + 1, 0, `limit ${data.limit ?? 2}%`, "fail");
    for (let c = 0; c < COLS; c++) {
      const when = s - (COLS - 1 - c) * 0.9;
      let tt = when;
      let kk = 0;
      while (kk < plan.length - 1 && tt >= plan[kk].hold) tt -= plan[kk++].hold;
      const bad = when > 0 && !plan[kk].ok;
      const v = bad ? 0.75 + hash(c, 9) * 0.25 : 0.12 + hash(Math.floor(when), 2) * 0.2;
      const h = Math.round(v * 3);
      for (let y = 0; y < 3; y++) g.put(Y + 2 - y, GX + c, y < h ? (y === h - 1 ? "▒" : "▓") : y === 1 ? "┄" : " ", y < h ? (bad ? "fail" : "") : "fail");
    }
    const status = !cur.ok ? "guard tripped: rolling back" : cur.back ? "fixing, held at the last safe stage" : cur.pct === 100 ? "everyone has it" : `holding at ${cur.pct}%, watching`;
    g.scramble(Y + 4, GX, status, since("st", status, step), step, !cur.ok ? "fail" : cur.pct === 100 ? "ok" : "mute");
    return g;
    };
  };
}
processRollout.still = 90;

/* Loading: what someone sees in the first two seconds, against a time ruler. ---------------------- */
// data: { duration: 1800, phases: [{ at: 0, show: "tap" }, { at: 120, show: "skeleton" },
//         { at: 700, show: "text" }, { at: 1100, show: "image" }] }
function processLoading({ data, options = {} }) {
  const D = data.duration ?? 1800;
  const phases = data.phases;
  if (D < 1 || D > 15000) throw new Error("The loading ruler supports durations from 1 to 15000 milliseconds.");
  if (phases.length > 4) throw new Error("The loading card fits at most 4 phases.");
  const CARD = 34;
  const RX = CARD + 6;
  const RW = 34;
  const width = RX + RW + 6;
  const MS_PER_STEP = 40; // the ruler runs at a third of real time, so each phase can be seen
  const HOLD = 30;
  const CYCLE = Math.ceil(D / MS_PER_STEP) + HOLD;
  const LINES = ["Weekly report", "Signups up 12% on last week,", "most of it from the new invite", "flow. Activation is flat."];
  const phaseAt = (ms) => phases.filter((p) => p.at <= ms).at(-1)?.show ?? "";

  return () => {
    const since = changes();
    return (step, frac) => {
    const s = (step % CYCLE) + frac;
    const ms = Math.min(D, s * MS_PER_STEP);
    const show = phaseAt(ms);
    const has = (name) => phases.some((p) => p.show === name && p.at <= ms);
    const age = (name) => (ms - (phases.find((p) => p.show === name)?.at ?? 0)) / MS_PER_STEP;
    const g = new Grid(14, width);
    // The card.
    g.text(0, 0, `┌${"─".repeat(CARD - 2)}┐`, "mute");
    for (let r = 1; r < 13; r++) { g.put(r, 0, "│", "mute"); g.put(r, CARD - 1, "│", "mute"); }
    g.text(13, 0, `└${"─".repeat(CARD - 2)}┘`, "mute");
    if (show === "tap" || (!has("skeleton") && ms > 0)) {
      const k = Math.floor(s) % 4;
      g.center(6, 1, CARD - 2, ["·", "░", "▒", "▓"][k] + " tapped", "mute");
    }
    const skeleton = has("skeleton");
    // Image block: dither fills in from top to bottom when the image arrives.
    for (let r = 1; r <= 5; r++) for (let c = 2; c < CARD - 2; c++) {
      if (has("image")) {
        // A small landscape: sky ░, a ridge ▒, ground ▓. It develops from the top down.
        const ground = 5 - Math.round(1.6 + 1.4 * Math.sin(c / 4.5));
        const pixel = r > ground ? "▓" : r === ground ? "▒" : "░";
        const v = clamp((age("image") - r * 0.8) / 4);
        g.put(r, c, v >= 1 ? pixel : v > 0.5 ? "▒" : v > 0 ? "░" : "·", v >= 1 && r < ground ? "mute" : "");
      } else if (skeleton) {
        const shine = mod(s * 1.4 - c - r, 40) < 4;
        g.put(r, c, shine ? "▒" : "░", "mute");
      }
    }
    LINES.forEach((line, i) => {
      const r = 7 + i + (i ? 1 : 0);
      if (has("text")) g.scramble(r, 2, line, age("text") * 1.4 - i * 2, step);
      else if (skeleton) {
        const len = i ? 26 - i * 3 : 14;
        for (let c = 0; c < len; c++) g.put(r, 2 + c, mod(s * 1.4 - c - r, 40) < 4 ? "▒" : "░", "mute");
      }
    });
    // The ruler.
    g.text(0, RX, "TIME");
    const xOf = (t) => RX + Math.round((t / D) * (RW - 1));
    for (let c = 0; c < RW; c++) g.put(2, RX + c, RX + c <= xOf(ms) ? "═" : "─", RX + c <= xOf(ms) ? "" : "mute");
    for (let t = 0; t <= D; t += 500) { g.put(1, xOf(t), "╷", "mute"); g.text(3, xOf(t), `${t}`, "mute"); }
    g.glide(2, RX + (ms / D) * (RW - 1), "▓");
    phases.forEach((p, i) => {
      const reached = p.at <= ms;
      const r = 6 + i * 2;
      g.put(r, xOf(p.at), reached ? "▓" : "·", reached ? "ok" : "mute");
      g.text(r, xOf(p.at) + 2, `${p.at}ms ${p.show}`, reached ? "" : "mute");
    });
    g.scramble(13, RX, `showing: ${show || "nothing yet"}`, since("sh", show, step), step, show === "image" ? "ok" : "mute");
    return g;
    };
  };
}
processLoading.still = 70;


export function motionLoop(data, options = {}) {
  return { make: processLoop({ data, options }), still: processLoop.still };
}

export function motionFunnel(data, options = {}) {
  return { make: processFunnel({ data: Array.isArray(data) ? { steps: data } : data, options }), still: processFunnel.still };
}

export function motionStates(data, options = {}) {
  const make = processStates({ data, options });
  return { make, still: make.still };
}

export function motionQueue(data, options = {}) {
  return { make: processQueue({ data, options }), still: processQueue.still };
}

export function motionRollout(data, options = {}) {
  return { make: processRollout({ data, options }), still: processRollout.still };
}

export function motionLoading(data, options = {}) {
  return { make: processLoading({ data, options }), still: processLoading.still };
}
