// The five diagrams from "The price of pace" (traykov.com/notes), built on the moving-diagram grid.
// They are compositions, not kinds: each one is drawn by hand for its argument. Use them as worked
// examples of what the grid can do; for everyday work, write a spec for one of the kinds in kinds.mjs.
//
// Each export is a factory: call it to get a fresh diagram, a function (step, frac) → Grid.
import { FADE, Grid, TRAIL, changes, clamp, easeInOut, fit, hash, mod, quant, rand } from "./grid.mjs";

/* 1. Gates ---------------------------------------------------------------------------------- */
// Top: the old enterprise route. Trust is low, so every expert's work queues behind nine
// checkpoints, one piece at a time, and maybe ships at the end of the day.
// Bottom: a lean team. Trust is high, the one check stays open, and work loops
// expertise → ship → learn without waiting on a title.
export const gates = () => {
  const START = 12;
  const END = 86;
  const BOX = fit("SHIPPED 99");
  const W = END + 2 + BOX;
  const OLD = [
    "TRIO ALIGN", "REVIEW", "AUDIT", "WIDE REVIEW", "LEADERSHIP",
    "ITERATE", "TRIO REVIEW", "WHOLE TEAM", "LEADERSHIP"
  ].map((label, i) => ({ label, at: 22 + i * 7 }));
  const WAIT = 26;
  const CYCLE = 340;
  const since = changes();

  // Old route state, advanced one step at a time.
  let lastStep = -1;
  let queue = [];          // expertise waiting at the first gate: positions
  let lead = null;         // { p, prev, gate, waitedFrom }
  let shipped = 0;
  let shippedAt = -99;

  const reset = () => { queue = []; lead = null; shipped = 0; shippedAt = -99; };
  const advance = (s) => {
    if (s === 0) reset();
    // New expertise arrives regularly and lines up behind the first gate.
    if (s % 16 === 0) queue.push({ p: START, prev: START });
    queue.sort((a, b) => b.p - a.p);
    queue.forEach((q, i) => {
      q.prev = q.p;
      const limit = i === 0 ? OLD[0].at - 1 : queue[i - 1].p - 2;
      if (q.p < limit) q.p += 1;
    });
    if (!lead && queue.length && queue[0].p === OLD[0].at - 1) {
      const q = queue.shift();
      lead = { p: q.p, prev: q.p, gate: 0, waitedFrom: s };
    }
    if (lead) {
      lead.prev = lead.p;
      const g = OLD[lead.gate];
      if (g && lead.p === g.at - 1) {
        if (s - lead.waitedFrom >= WAIT) { lead.p += 2; lead.gate += 1; }
      } else {
        lead.p += 1;
        const next = OLD[lead.gate];
        if (next && lead.p === next.at - 1) lead.waitedFrom = s;
        if (lead.p > END) { shipped += 1; shippedAt = s; lead = null; }
      }
    }
  };

  return (step, frac) => {
    while (lastStep < step) { lastStep++; advance(lastStep % CYCLE); }
    const s = (step % CYCLE) + frac;
    const g = new Grid(19, W);

    // Enterprise -------------------------------------------------------------------------
    const T = 5;
    g.text(0, 0, "ENTERPRISE");
    g.text(0, 13, "nine gates, then maybe ship", "mute");
    g.text(1, 0, "TRUST");
    g.meter(1, 13, 12, 0.1 + (Math.floor(s / 3) % 2) * 0.02, s, "fail");
    g.text(1, 27, "low", "fail");
    g.text(1, 36, "EXPERTISE");
    g.meter(1, 47, 12, 1, s);
    const stuck = queue.length > 1;
    g.scramble(1, 61, stuck ? "blocked" : "", since("blocked", stuck, step), step, "fail");

    g.box(T - 1, 0, 11, "EXPERT");
    const routeTop = g.line([[T, START], [T, END + 1]], "mute");
    OLD.forEach((gate, i) => {
      const leadHere = lead && lead.gate === i && lead.p === gate.at - 1;
      const waited = leadHere ? s - lead.waitedFrom : 0;
      const passing = lead && lead.gate === i + 1 && lead.p - gate.at <= 2 && lead.p >= gate.at;
      const opening = leadHere && waited > WAIT - 4;
      const labelRow = i % 2 === 0 ? T - 2 : T + 2;
      const active = leadHere || passing;
      g.center(labelRow, gate.at, gate.at, gate.label, active ? "" : "mute");
      // A closed gate is structure, so it's a line. Only the gate the expert is waiting at is solid.
      for (let r = T - 1; r <= T + 1; r++) {
        if (passing) g.put(r, gate.at, r === T ? "─" : "╎", "mute");
        else if (opening) g.put(r, gate.at, FADE[Math.min(3, Math.floor(waited - (WAIT - 4)))]);
        else if (leadHere) g.put(r, gate.at, (r + Math.floor(s * 2)) % 3 === 0 ? "▒" : "▓");
        else g.put(r, gate.at, "┃", "mute");
      }
    });
    queue.forEach((q) => g.packet(routeTop, q.prev + (q.p - q.prev) * frac - START));
    if (lead) {
      const f = lead.prev + (lead.p - lead.prev) * frac;
      g.packet(routeTop, f - START);
    }
    g.counter(T - 1, END + 2, BOX, shipped ? `SHIPPED ${String(shipped).padStart(2, " ")}` : "SHIP?", shipped ? "ok" : "mute", { age: since("ship", shipped, step), step, style: shipped ? "solid" : "dotted" });
    g.flash(T - 1, END + 2, BOX, 3 - (s - shippedAt), "ok");

    // Lean team --------------------------------------------------------------------------
    const L = 14;
    g.text(10, 0, "LEAN TEAM");
    g.text(10, 13, "experts trusted to ship", "mute");
    g.text(11, 0, "TRUST");
    g.meter(11, 13, 12, 0.92, s, "ok");
    g.text(11, 27, "high", "ok");
    g.text(11, 36, "EXPERTISE");
    g.meter(11, 47, 12, 1, s, "ok");
    g.text(11, 61, "flowing", "ok");

    g.box(L - 1, 0, 11, "EXPERT", "ok");
    const routeLean = g.line([[L, START], [L, END + 1]], "mute");
    const CHECK = 50;
    g.center(L - 2, CHECK, CHECK, "QUICK CHECK", "ok");
    g.put(L - 1, CHECK, "╎", "ok");
    g.put(L + 1, CHECK, "╎", "ok");
    const loop = g.line([[L + 2, END + 8], [L + 3, END + 8], [L + 3, 5], [L + 2, 5]], "mute");
    g.center(L + 4, 5, END + 8, "learn, then go again", "mute");
    const shift = s * 1.15;
    const SPACING = 10;
    const ago = g.stream(routeLean, shift, SPACING, "ok");
    g.stream(loop, shift + 5, SPACING, "ok");
    const leanShipped = Math.max(0, Math.floor((shift - (routeLean.length - 1)) / SPACING) + 1);
    g.counter(L - 1, END + 2, BOX, `SHIPPED ${String(leanShipped).padStart(2, " ")}`, "ok");
    g.flash(L - 1, END + 2, BOX, 2 - ago, "ok");
    return g;
  };
};

/* 2. Two lanes ------------------------------------------------------------------------------ */
// The same working day on two lanes. Perfectionism takes one idea through three long holds;
// pace sends idea after idea, loses a few, and ships far more. The clock ticks in hard steps
// (a quarter hour each) while the work glides.
export const lanes = () => {
  const W = 97;
  const A = 3;
  const B = 11;
  const START = 10;
  const END = 78;
  const STATIONS = [
    { at: 26, label: "POLISH" },
    { at: 44, label: "RE-CHECK" },
    { at: 62, label: "SIGN-OFF" }
  ];
  const BOX = 12;
  const SHIP = fit("SHIPPED 99");
  const WAIT = 72;
  const CYCLE = 320;
  const TICKS = 34;                       // quarter hours, 09:00 → 17:30, two cells each
  const PER_TICK = CYCLE / TICKS;
  const r = rand(5);
  const PLAN = Array.from({ length: 46 }, (_, i) => ({
    born: i * 7,
    breaksAt: r() < 0.2 ? 10 + Math.floor(r() * 52) : null
  }));
  const since = changes();
  return (step, frac) => {
    const s = (step % CYCLE) + frac;
    const g = new Grid(18, W);

    // Perfectionism
    g.text(A - 2, 0, "PERFECTIONISM");
    g.text(A - 2, 15, "fear of shipping", "mute");
    g.box(A - 1, 0, 9, "IDEA");
    const routeA = g.line([[A, START], [A, END + 1]], "mute");
    // The idea travels to a box, waits inside it, then carries on from the far side.
    let pos = 0;
    let left = s;
    let waitingAt = -1;
    let waited = 0;
    let arrivedA = -1;
    const visited = new Set();
    let from = START;
    for (const st of [...STATIONS.map((x) => x.at), null]) {
      const to = st === null ? END + 1 : st - BOX / 2 - 1;
      const dist = to - from;
      if (left < dist) { pos = from - START + left; left = -1; break; }
      left -= dist;
      if (st === null) { arrivedA = left; break; }
      visited.add(st);
      if (left < WAIT) { waitingAt = st; waited = left; left = -1; break; }
      left -= WAIT;
      from = st + BOX / 2;
    }
    STATIONS.forEach(({ at, label }) => {
      const here = waitingAt === at;
      const c = at - BOX / 2;
      g.box(A - 1, c, BOX, label, here ? "" : "mute", visited.has(at) ? "solid" : "dotted");
      if (here) {
        if (waited < 3) g.flash(A - 1, c, BOX, 3 - waited);
        else g.chase(A - 1, c, BOX, waited * 2.4);
        g.meter(A + 2, c, BOX, waited / WAIT, s);
      }
    });
    if (waitingAt < 0 && arrivedA < 0) g.packet(routeA, pos);
    const shippedA = arrivedA >= 0 ? 1 : 0;
    g.counter(A - 1, END + 2, SHIP, `SHIPPED ${String(shippedA).padStart(2, " ")}`, shippedA ? "ok" : "mute", { age: since("a", shippedA, step), step });
    if (arrivedA >= 0) g.flash(A - 1, END + 2, SHIP, 3 - arrivedA, "ok");

    // Pace
    g.text(B - 2, 0, "PACE");
    g.text(B - 2, 15, "ship, learn, ship again", "mute");
    g.box(B - 1, 0, 9, "IDEAS");
    const routeB = g.line([[B, START], [B, END + 1]], "mute");
    let shippedB = 0;
    let broke = 0;
    let lastArrive = 99;
    PLAN.forEach(({ born, breaksAt }) => {
      const p = s - born;
      if (p < 0) return;
      if (breaksAt !== null && p >= breaksAt) {
        broke++;
        const age = Math.floor(p - breaksAt);
        const [y, x] = routeB[breaksAt];
        if (age < 2) {
          g.put(y, x, "x", "fail");
          const d = Math.round(0.6 + (p - breaksAt) * 0.7);
          [[y - d, x], [y + d, x], [y, x - d], [y, x + d]].forEach(([yy, xx]) => g.deposit(yy, xx, age ? 0.2 : 0.45, "fail"));
        } else if (age < 6) g.put(y, x, FADE[age - 2], "fail");
        return;
      }
      if (p >= routeB.length) { shippedB++; lastArrive = Math.min(lastArrive, p - routeB.length); return; }
      g.packet(routeB, p);
    });
    g.counter(B - 1, END + 2, SHIP, `SHIPPED ${String(shippedB).padStart(2, " ")}`, "ok");
    g.flash(B - 1, END + 2, SHIP, 2 - lastArrive, "ok");
    g.scramble(B + 2, END + 4, `BROKE ${broke}`, since("x", broke, step), step, broke ? "fail" : "mute");

    // The clock: a ruler of quarter hours, a hand that snaps on every tick, a time that turns over.
    const R = 16;
    const tick = Math.min(TICKS, Math.floor(s / PER_TICK));
    const into = s - tick * PER_TICK;
    const xOf = (t) => START + t * 2;
    const hand = xOf(tick);
    g.text(R, 0, "TIME");
    for (let c = START; c <= xOf(TICKS); c++) g.put(R, c, c < hand ? "═" : "─", c < hand ? "" : "mute");
    for (let t = 0; t <= TICKS; t++) {
      const major = t % 4 === 0;
      g.put(R - 1, xOf(t), major ? "╷" : "·", t <= tick ? "" : "mute");
      if (major) g.put(R, xOf(t), "┼", t <= tick ? "" : "mute");
    }
    // The tick lands hard, then rings out.
    const ring = Math.floor(into);
    g.put(R - 1, hand, ring < 1 ? "▓" : ring < 2 ? "▒" : "▓");
    g.put(R, hand, "▓");
    if (ring < 3 && tick > 0) g.put(R, xOf(tick - 1) + 1 < hand ? hand - 1 : hand, ring < 1 ? "▒" : "═");
    const minutes = 9 * 60 + tick * 15;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    g.scramble(R, xOf(TICKS) + 3, time, ring, step);
    return g;
  };
};

/* 3. Slip is the price ----------------------------------------------------------------------- */
// One plan, five teams. The plan row is where everyone "should" be. Turn the pace up and each
// team slips off it (the red bars measure how far), yet far more work reaches the end.
// Leadership is one row among the others, not on top.
export const drift = () => {
  const W = 98;
  const TEAMS = [
    { name: "DESIGN", slip: 0.6 },
    { name: "ENGINEERING", slip: 2.2 },
    { name: "PRODUCT", slip: 1.2 },
    { name: "PARTNER TEAM", slip: 3.4, note: "hears later" },
    { name: "LEADERSHIP", slip: 4.6, note: "sees the work" }
  ];
  const START = 15;
  const END = 63;
  const SPACING = 8;
  const LOOP = 380;
  const since = changes();
  const paceAt = (t) => 0.5 - 0.5 * Math.cos(((t % LOOP) / LOOP) * Math.PI * 2);
  let phase = 0;
  let prevPhase = 0;
  let shipped = 0;
  let lastStep = -1;
  let lastShip = -99;
  return (step, frac) => {
    while (lastStep < step) {
      lastStep++;
      if (lastStep % LOOP === 0) shipped = 0;
      prevPhase = phase;
      const before = Math.floor(phase / SPACING);
      phase += 0.1 + paceAt(lastStep) * 0.95;
      const gained = Math.floor(phase / SPACING) - before;
      if (gained > 0) { shipped += gained * TEAMS.length; lastShip = lastStep; }
    }
    const t = step + frac;
    const pace = paceAt(t);
    const ph = prevPhase + (phase - prevPhase) * frac;

    const g = new Grid(16, W);
    g.text(0, 0, "PACE");
    g.meter(0, START, 22, quant(pace, 22), t);
    const caption = pace < 0.2 ? "slow: everyone waits for everyone" : pace > 0.8 ? "fast: teams slip, work ships" : "";
    g.scramble(0, START + 24, caption, since("cap", caption, step), step, "mute");

    // The plan: where every team would be if nobody slipped.
    g.text(2, 0, "PLAN", "mute");
    const plan = g.line([[2, START], [2, END + 1]], "mute");
    g.stream(plan, ph, SPACING, "mute");

    TEAMS.forEach((team, i) => {
      const row = 4 + i * 2;
      const quiet = i >= 3;
      g.text(row, 0, team.name, quiet ? "mute" : "");
      const showNote = Boolean(team.note) && pace > 0.55;
      if (showNote) g.scramble(row + 1, 0, team.note, since(`n${i}`, showNote, step), step, "mute");
      const route = g.line([[row, START], [row, END + 1]], "mute");
      const slip = team.slip * pace * 1.8;
      g.stream(route, ph + slip, SPACING, quiet ? "mute" : "");
      // Slip bars: from where the plan says the work is to where it actually is.
      if (slip >= 0.6) {
        for (let head = mod(ph, SPACING); head <= route.length - 1; head += SPACING) {
          const from = START + Math.round(head);
          const to = Math.min(END, START + Math.round(head + slip));
          g.put(row + 1, from, "╵", "fail");
          for (let c = from + 1; c <= to; c++) g.put(row + 1, c, "─", "fail");
        }
      }
      const cells = Math.round(slip);
      g.text(row, END + 3, cells ? `slip +${cells}` : "on plan", cells ? "fail" : "mute");
    });
    g.counter(6, END + 13, fit("SHIPPED 000"), `SHIPPED ${String(shipped).padStart(3, "0")}`, "ok");
    g.flash(6, END + 13, fit("SHIPPED 000"), 1 - (step - lastShip) - frac, "ok");
    g.text(15, START, "one plan, five teams, nobody waiting on the org chart", "mute");
    return g;
  };
};

/* 4. Small losses or one big one --------------------------------------------------------------------------- */
export const losses = () => {
  const W = 92;
  const H = 13;
  const X0 = 9;
  const N = 64;
  const r = rand(29);
  const pace = [];
  let v = 1.2;
  for (let i = 0; i < N; i++) {
    const dip = i > 3 && r() < 0.22;
    v = Math.max(1, v + (dip ? -(0.6 + r() * 0.4) : 0.3 + r() * 0.2));
    pace.push({ v, dip });
  }
  const top = Math.max(...pace.map((p) => p.v));
  const CLIFF = 50;
  const wait = Array.from({ length: N }, (_, i) => (i <= CLIFF ? 1 + (i / CLIFF) * (top - 1) * 0.45 : 1));
  const rowOf = (val) => H - 1 - Math.round(((val - 1) / (top - 1)) * (H - 1));
  const yOf = (val) => H - 1 - ((val - 1) / (top - 1)) * (H - 1);
  const CYCLE = 280;
  const since = changes();
  return (step, frac) => {
    const s = (step % CYCLE) + frac;
    const x = Math.min(N, s / 2.5);
    const shown = Math.floor(x);
    const g = new Grid(H + 3, W);
    g.line([[H, X0 - 1], [0, X0 - 1]], "mute");
    g.line([[H, X0 - 1], [H, X0 + N + 1]], "mute");
    g.put(H, X0 - 1, "└", "mute");
    g.text(0, 0, "VALUE", "mute");
    g.text(H + 1, X0 + N - 3, "TIME", "mute");

    for (let i = 0; i < shown; i++) {
      const c = X0 + i;
      const age = shown - 1 - i;
      const p = pace[i];
      const pr = rowOf(p.v);
      for (let rr = pr + 1; rr < H; rr++) {
        const k = mod(rr + i - Math.floor(s / 2), 4);
        g.put(rr, c, k === 0 ? "░" : k === 2 ? "·" : " ", "ok");
      }
      if (p.dip && age < 3) for (let rr = pr; rr < H; rr++) g.put(rr, c, TRAIL[age], "fail");
      g.put(pr, c, p.dip ? "▒" : "▓", p.dip ? "fail" : "ok");
      // Each break is marked where it happened; it lands with a small burst.
      if (p.dip) {
        g.put(pr - 1, c, "x", "fail");
        if (age < 2) [[pr - 1, c - 1], [pr - 1, c + 1], [pr - 2, c]].forEach(([y, xx]) => g.deposit(y, xx, age ? 0.2 : 0.5, "fail"));
      }
      if (i === CLIFF + 1) {
        const from = rowOf(wait[CLIFF]);
        const fall = Math.min(from + age, H - 1);
        for (let rr = from; rr <= fall; rr++) g.put(rr, c, rr === fall ? "▓" : "│", "fail");
      } else {
        g.put(rowOf(wait[i]), c, "▒", i > CLIFF ? "fail" : "");
      }
    }
    // The launch date: set, slipped, slipped again, then shipped all at once.
    const LAUNCHES = [24, 34, 44, CLIFF];
    const current = LAUNCHES.findIndex((l) => l >= shown);
    LAUNCHES.forEach((l, k) => {
      const c = X0 + l;
      const passed = current === -1 ? k < LAUNCHES.length - 1 : k < current;
      if (passed && k < LAUNCHES.length - 1) {
        for (let rr = 2; rr < H; rr += 2) if (g.get(rr, c) === " ") g.put(rr, c, "·", "mute");
        g.text(1, c - 3, "slipped", "mute");
      } else if (k === current) {
        for (let rr = 2; rr < H; rr++) if (g.get(rr, c) === " ") g.put(rr, c, "┆", "fail");
        g.scramble(1, c - 3, k === LAUNCHES.length - 1 ? "launch" : "launch?", since(`l${k}`, current, step), step, "fail");
      }
    });

    // The pen: a gliding head on both lines, and a cursor that sweeps smoothly.
    if (shown > 0 && shown < N) {
      const i = Math.min(N - 1, shown);
      const a = pace[i - 1];
      const b = pace[i] || a;
      const t = x - shown;
      const py = yOf(a.v) + (yOf(b.v) - yOf(a.v)) * t;
      g.glide(py, X0 + x - 1, "▓", "ok");
      g.glide(py, X0 + x - 1.9, "▒", "ok");
      const wy = yOf(wait[i - 1]) + (yOf(wait[i] ?? wait[i - 1]) - yOf(wait[i - 1])) * t;
      g.glide(wy, X0 + x - 1, "▓", i > CLIFF ? "fail" : "");
      for (let rr = 0; rr < H; rr++) if (rr % 2 === 0) g.glide(rr, X0 + x + 0.4, "┊", "mute", true);
      g.glide(py, X0 + x + 1.2, "PACE"[0], "ok", true);
      ["A", "C", "E"].forEach((ch, k) => g.glide(py, X0 + x + 2.2 + k, ch, "ok", true));
      [..."PERFECTIONISM"].forEach((ch, k) => g.glide(wy, X0 + x + 1.2 + k, ch, i > CLIFF ? "fail" : "", true));
    } else if (shown >= N) {
      g.text(rowOf(pace[N - 1].v), X0 + N + 2, "PACE", "ok");
      g.text(rowOf(wait[N - 1]), X0 + N + 2, "PERFECTIONISM", "fail");
    }
    g.text(H + 2, X0, "▓ pace: ship small, break small, climb", "ok");
    g.text(H + 2, X0 + 42, "▒ perfectionism: slip, slip, fall");
    if (s > CYCLE - 24) {
      const k = (s - (CYCLE - 24)) / 6;
      for (let rr = 0; rr < H; rr++) for (let c = X0; c < W; c++) {
        const f = Math.floor(k * 4 - hash(rr, c) * 3);
        if (g.get(rr, c) !== " " && f >= 0) g.put(rr, c, f < 4 ? FADE[f] : " ", g.cl[rr][c]);
      }
    }
    return g;
  };
};

/* 5. The org chart flattens --------------------------------------------------------------------- */
export const flatten = () => {
  const W = 86;
  const H = 18;
  const NODES = [
    { label: "VP", w: 6, tree: [0, 38], flat: [0, 23] },
    { label: "DIR", w: 7, tree: [5, 18], flat: [0, 53] },
    { label: "DIR", w: 7, tree: [5, 58], flat: [12, 38] },
    { label: "DESIGN", w: 10, tree: [10, 6], flat: [6, 6] },
    { label: "ENG", w: 7, tree: [10, 28], flat: [12, 18] },
    { label: "PM", w: 6, tree: [10, 48], flat: [12, 58] },
    { label: "DATA", w: 8, tree: [10, 67], flat: [6, 67] }
  ];
  const TREE = [
    [[3, 41], [3, 21], [4, 21]],
    [[3, 41], [3, 61], [4, 61]],
    [[8, 21], [8, 11], [9, 11]],
    [[8, 21], [8, 31], [9, 31]],
    [[8, 61], [8, 51], [9, 51]],
    [[8, 61], [8, 71], [9, 71]]
  ];
  const SPOKES = [
    [[3, 26], [4, 26], [4, 38], [5, 38]],
    [[3, 56], [4, 56], [4, 43], [5, 43]],
    [[7, 16], [7, 35]],
    [[7, 66], [7, 46]],
    [[11, 21], [10, 21], [10, 38], [9, 38]],
    [[11, 61], [10, 61], [10, 43], [9, 43]],
    [[11, 41], [9, 41]]
  ];
  const since = changes();
  const CYCLE = 380;
  // 0–150 tree · 150–162 tree lines break up · 162–186 nodes glide · 186–200 spokes draw in
  // 200–340 flat · 340–352 spokes retract · 352–376 nodes glide back
  return (step, frac) => {
    const s = (step % CYCLE) + frac;
    const g = new Grid(H, W);
    const k = s < 162 ? 0 : s < 186 ? easeInOut((s - 162) / 24) : s < 352 ? 1 : s < 376 ? 1 - easeInOut((s - 352) / 24) : 0;
    const moving = k > 0 && k < 1;
    const at = (n, kk) => [
      n.tree[0] + (n.flat[0] - n.tree[0]) * kk,
      n.tree[1] + (n.flat[1] - n.tree[1]) * kk
    ];

    const treeShown = s < 150 || s >= 376;
    if (treeShown) {
      TREE.forEach((pts, i) => {
        g.line(pts, "mute");
        const up = g.route(pts).slice(0, -1).reverse();
        g.stream(up, s * 0.35 + i * 3, 9, "");
      });
    }
    if (s >= 150 && s < 162) TREE.forEach((pts) => g.dissolveLine(pts, (s - 150) / 2, "mute"));

    const spokeProgress = s < 186 ? 0 : s < 200 ? (s - 186) / 14 : s < 340 ? 1 : s < 352 ? 1 - (s - 340) / 12 : 0;
    if (spokeProgress > 0) {
      let arrivals = 99;
      SPOKES.forEach((pts, i) => {
        const route = g.line(pts, "ok", { progress: spokeProgress });
        if (spokeProgress === 1) arrivals = Math.min(arrivals, g.stream(route, (s - 200) * 0.9 + i * 2, 5, "ok"));
      });
      if (spokeProgress === 1) {
        g.box(6, 36, 10, "WORK", "ok");
        g.flash(6, 36, 10, 2 - arrivals, "ok");
      } else {
        g.drawIn(6, 36, 10, "WORK", spokeProgress, "ok");
      }
    }

    NODES.forEach((n) => {
      if (moving) {
        // Two dither ghosts trail each gliding node.
        [[0.1, "░"], [0.05, "▒"]].forEach(([lag, ch]) => {
          const [gr, gc] = at(n, clamp(k - lag * Math.sign(s < 300 ? 1 : -1)));
          for (let x = 0; x < n.w; x++) g.glide(gr + 1, gc + x, ch, "mute", true);
        });
        const [r, c] = at(n, k);
        g.glideBox(r, c, n.w, n.label);
      } else {
        const [r, c] = at(n, k);
        g.box(Math.round(r), Math.round(c), n.w, n.label);
      }
    });
    if (treeShown) {
      g.chase(0, 38, 6, s * 2.2);
      g.scramble(1, 46, "deciding", since("vp", treeShown, step), step, "mute");
    }

    const caption = treeShown ? "every call goes up the chain, then back down"
      : s >= 200 && s < 340 ? "everyone feeds the work directly" : "";
    g.scramble(H - 1, 0, caption, since("cap", caption, step), step, caption.startsWith("everyone") ? "ok" : "mute");
    return g;
  };
};
