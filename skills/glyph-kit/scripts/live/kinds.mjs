// Moving diagrams from a spec. Each kind takes { kind, title, intent, source, data } and returns a
// factory: call it for a fresh diagram, a function (step, frac) → Grid. `still` is the step that
// stands in for the whole animation when motion is off, in print and in Markdown.
import { checks, guard, isSample, stamp } from "../guard.mjs";
import { FADE, Grid, changes, clamp, easeInOut, hash, mod, rand } from "./grid.mjs";

const pad = (n, w) => String(n).padStart(w, " ");
const boxW = (labels, min = 8) => Math.max(min, ...labels.map((l) => l.length + 4));

/* Loop: work moves through stages; some of it is sent back from one stage to an earlier one. ------ */
// data: { stages: ["Design", "Build", "QA", "Ship"], back: { from: "QA", to: "Build", share: 0.3, label } }
function loop({ data }) {
  const stages = data.stages;
  const back = data.back ?? null;
  const W = boxW(stages, 10);
  const GAP = 9;
  const T = 3;
  const xs = stages.map((_, i) => i * (W + GAP));
  const cols = xs.at(-1) + W + 18;
  const from = back ? stages.indexOf(back.from) : -1;
  const to = back ? stages.indexOf(back.to) : -1;
  const share = back?.share ?? 0;
  const r = rand(11);
  const PLAN = Array.from({ length: 80 }, (_, i) => ({ born: i * 7, rework: r() < share }));
  const CYCLE = 420;
  const since = changes();

  return () => (step, frac) => {
    const s = (step % CYCLE) + frac;
    const g = new Grid(back ? 12 : 8, cols);
    stages.forEach((label, i) => g.box(T - 1, xs[i], W, label.toUpperCase(), i === stages.length - 1 ? "ok" : ""));
    const legs = stages.slice(1).map((_, i) => g.line([[T, xs[i] + W], [T, xs[i + 1] - 1]], "mute"));
    let ret = null;
    if (back) {
      const a = xs[from] + Math.floor(W / 2);
      const b = xs[to] + Math.floor(W / 2);
      ret = g.line([[T + 2, a], [T + 5, a], [T + 5, b], [T + 2, b]], "fail");
      g.center(T + 6, b, a, back.label ?? `${Math.round(share * 100)}% sent back`, "fail");
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
}
loop.still = 260;

/* Funnel: people fall through the steps; the ones who leave drift out to the side and fade. ------ */
// data: { steps: [{ label, value }, ...] } in order, largest first.
function funnel({ data }) {
  const steps = data.steps;
  const LABEL = Math.max(...steps.map((s) => s.label.length)) + 3;
  const BAR = 44;
  const top = steps[0].value;
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
      g.text(row, 0, st.label, k === steps.length - 1 ? "ok" : "");
      for (let c = 0; c < width; c++) g.put(row, from + c, "▒", k === steps.length - 1 ? "ok" : "mute");
      g.text(row, LABEL + BAR + 2, st.value.toLocaleString("en-US"));
      if (k) {
        const kept = st.value / steps[k - 1].value;
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
funnel.still = 260;

/* States: a state machine, and one path through it played by a token. ----------------------------- */
// data: { states: ["Idle", ...], transitions: [{ from, to, label }], path: ["Idle", "Loading", ...] }
function states({ data }) {
  const names = data.states;
  const W = boxW(names, 11);
  const GAP = 10;
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
  const since = changes();

  return () => {
    const routes = legs.map((e) => (e ? new Grid(1, 1).route(e.pts) : []));
    const CYCLE = routes.reduce((sum, r) => sum + HOLD + r.length, 0) + HOLD;
    return (step, frac) => {
      const s = (step % CYCLE) + frac;
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
      if (at === idx(data.path.at(-1)) && !moving && s > CYCLE - HOLD) at = idx(data.path[0]);
      edges.forEach((e) => g.line(e.pts, moving && legs[moving.i] === e ? "" : "mute"));
      if (moving) g.packet(routes[moving.i], moving.t);
      edges.forEach((e) => {
        const on = moving && legs[moving.i] === e;
        if (e.label) {
          const [y, c0, c1] = e.lab;
          g.label(y, c0, c1, ` ${e.label} `, on ? "" : "mute");
        }
      });
      names.forEach((n, i) => {
        const here = i === at;
        const role = /error|fail/i.test(n) ? "fail" : /ready|done|success|saved|sent/i.test(n) ? "ok" : "";
        g.box(T - 1, xs[i], W, n.toUpperCase(), here ? role : "mute");
        if (here) g.chase(T - 1, xs[i], W, s * 2.4, role);
      });
      const now = moving ? `${legs[moving.i].from} → ${legs[moving.i].to}` : names[at] ?? "";
      g.scramble(0, 0, now, since("now", now, step), step);
      return g;
    };
  };
}
states.still = 8;

/* Queue: columns with work-in-progress limits. The slowest column fills up and the rest wait. ----- */
// data: { columns: [{ label, limit, pace }] }  pace = steps a card spends there. The first column
// is the backlog (no limit), the last is done.
function queue({ data }) {
  const cols = data.columns;
  const W = boxW(cols.map((c) => c.label), 12);
  const GAP = 3;
  const xs = cols.map((_, i) => i * (W + GAP));
  const H = 8;
  const width = xs.at(-1) + W;
  const CYCLE = 460;
  const since = changes();

  return () => {
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
        g.text(0, xs[i], c.label.toUpperCase(), isFull ? "fail" : last ? "ok" : "");
        const cap = c.limit ? `${inCol.length}/${c.limit}` : String(inCol.length);
        g.scramble(0, xs[i] + W - cap.length, cap, since(`c${i}`, cap, step), step, isFull ? "fail" : "mute");
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
      const msg = worst > 0 ? `▲ ${cols[worst].label} holds everything up` : "";
      g.scramble(H + 2, worst > 0 ? Math.min(xs[worst], width - msg.length) : 0, msg, since("b", msg, step), step, "fail");
      return g;
    };
  };
}
queue.still = 220;

/* Rollout: a feature goes out in stages, a guard metric watches, a breach rolls it back. ---------- */
// data: { stages: [1, 5, 25, 50, 100], metric: "Error rate", limit: 2, breachAt: 25 }
function rollout({ data }) {
  const stages = data.stages;
  const COLS = 50;
  const ROWS = 4;
  const people = COLS * ROWS;
  const GX = 20;
  const width = GX + COLS + 16;
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
  const since = changes();

  return () => (step, frac) => {
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
      g.text(0, Math.min(GX + COLS - label.length, Math.max(GX, stageX(i) - Math.floor(label.length / 2))), label, reached ? role : "mute");
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
    g.text(Y, 0, (data.metric ?? "Guard").toUpperCase());
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
}
rollout.still = 90;

/* Loading: what someone sees in the first two seconds, against a time ruler. ---------------------- */
// data: { duration: 1800, phases: [{ at: 0, show: "tap" }, { at: 120, show: "skeleton" },
//         { at: 700, show: "text" }, { at: 1100, show: "image" }] }
function loading({ data }) {
  const D = data.duration ?? 1800;
  const phases = data.phases;
  const CARD = 34;
  const RX = CARD + 6;
  const RW = 34;
  const width = RX + RW + 8;
  const MS_PER_STEP = 40; // the ruler runs at a third of real time, so each phase can be seen
  const HOLD = 30;
  const CYCLE = Math.ceil(D / MS_PER_STEP) + HOLD;
  const LINES = ["Weekly report", "Signups up 12% on last week,", "most of it from the new invite", "flow. Activation is flat."];
  const since = changes();
  const phaseAt = (ms) => phases.filter((p) => p.at <= ms).at(-1)?.show ?? "";

  return () => (step, frac) => {
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
}
loading.still = 70;

// Each kind: label, how to make it, a summary for screen readers, and its own data checks.
const has = (list, name, what) => (list.includes(name) ? "" : `"${name}" isn't one of the ${what}.`);
export const LIVE = {
  loop: {
    label: "Rework loop",
    make: loop,
    summary: (d) => `Work moves through ${d.stages.join(", ")}${d.back ? `; about ${Math.round(d.back.share * 100)}% is sent back from ${d.back.from} to ${d.back.to}` : ""}.`,
    check: (d) => !d.back ? [] : [
      has(d.stages, d.back.from, "stages"),
      has(d.stages, d.back.to, "stages"),
      d.stages.indexOf(d.back.to) >= d.stages.indexOf(d.back.from) ? `Work can only be sent back to an earlier stage than ${d.back.from}.` : "",
      d.back.share < 0 || d.back.share > 1 ? `The share sent back is ${d.back.share}; write 30% as 0.3.` : ""
    ]
  },
  funnel: {
    label: "Moving funnel",
    make: funnel,
    summary: (d) => `Funnel: ${d.steps.map((s) => `${s.label} ${s.value.toLocaleString("en-US")}`).join(", ")}.`,
    check: (d) => [checks.notNegative(d.steps, "value", "count"), checks.neverGrows(d.steps, "value")]
  },
  states: {
    label: "State machine",
    make: states,
    summary: (d) => `States ${d.states.join(", ")}; the token plays the path ${d.path.join(" → ")}.`,
    check: (d) => [
      ...d.transitions.flatMap((t) => [has(d.states, t.from, "states"), has(d.states, t.to, "states")]),
      ...d.path.slice(1).map((n, i) => (d.transitions.some((t) => t.from === d.path[i] && t.to === n) ? "" : `The path goes from ${d.path[i]} to ${n}, but there's no transition for that.`))
    ]
  },
  queue: {
    label: "Work queue",
    make: queue,
    summary: (d) => `Columns ${d.columns.map((c) => `${c.label}${c.limit ? ` (limit ${c.limit})` : ""}`).join(", ")}. Work piles up before the slowest column.`,
    check: (d) => [checks.within(d.columns, "limit", 1, 99, "limit"), checks.notNegative(d.columns, "pace", "time per card")]
  },
  rollout: {
    label: "Staged rollout",
    make: rollout,
    summary: (d) => `Rollout to ${d.stages.join("%, ")}%, guarded by ${d.metric ?? "a metric"} at ${d.limit ?? 2}%${d.breachAt ? `; it trips at ${d.breachAt}% and rolls back` : ""}.`,
    check: (d) => [
      d.stages.some((p, i) => p < 0 || p > 100 || (i && p <= d.stages[i - 1])) ? "Rollout stages should climb from above 0 to at most 100%." : "",
      d.breachAt !== undefined && !d.stages.includes(d.breachAt) ? `The guard trips at ${d.breachAt}%, which isn't one of the stages.` : ""
    ]
  },
  loading: {
    label: "Loading sequence",
    make: loading,
    summary: (d) => `In ${d.duration ?? 1800}ms: ${d.phases.map((p) => `${p.show} at ${p.at}ms`).join(", ")}.`,
    check: (d) => [
      checks.inTimeOrder(d.phases, "at", "phase"),
      d.phases.some((p) => p.at > (d.duration ?? 1800)) ? `A phase starts after the ${d.duration ?? 1800}ms the sequence lasts.` : "",
      ...d.phases.map((p) => has(["tap", "skeleton", "text", "image"], p.show, "things a loading sequence can show (tap, skeleton, text, image)"))
    ]
  }
};

/** A spec → { frame: (step, frac) → Grid, still, label, summary }. */
export function live(spec) {
  const def = LIVE[spec.kind];
  if (!def) throw new Error(`Unknown moving diagram "${spec.kind}". Known: ${Object.keys(LIVE).join(", ")}.`);
  guard(spec, def);
  const make = def.make(spec);
  return { make, still: def.make.still, label: def.label, summary: spec.summary ?? def.summary(spec.data) };
}

/** Run a fresh diagram up to its still step and return that frame, with text settled. */
export function stillGrid(make, still) {
  const frame = make();
  let g;
  for (let s = 0; s < still; s++) frame(s, 0);
  Grid.settled = true;
  try { g = frame(still, 0); } finally { Grid.settled = false; }
  return g;
}

/** The still frame as text: runs a fresh diagram up to its still step. */
export function stillText(spec) {
  const { make, still } = live(spec);
  const text = stillGrid(make, still).toText();
  return isSample(spec.source) ? stamp(text) : text;
}
