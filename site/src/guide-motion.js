// How to use: each section's figure acts out what the section says, with the kit's own motion.
// Work travels along lines, bars grow from their axis, numbers count, words settle through the
// scramble ramp, and whatever isn't in focus dims. Borders never move. Each figure starts from the
// figure the kit drew (the <pre>'s text), plays on the kit's 120 ms step while on screen, loops with
// a pause, and shows a still that makes the same point under reduced motion.
import { Grid, clamp } from "./kit/live/grid.mjs";

const RAMP = " .:+*#%@";
const BEAT = 4; // steps per beat: 480 ms
const BOX = "┌┐└┘─│├┤┬┴┼┄┆╔╗╚╝═║";

/** The figure's text as rows of characters. */
export const parse = (text) => {
  const lines = text.replace(/\n+$/, "").split("\n").map((l) => [...l]);
  return { lines, rows: lines.length, cols: Math.max(...lines.map((l) => l.length)) };
};
const fresh = (b) => {
  const g = new Grid(b.rows, b.cols);
  b.lines.forEach((l, r) => l.forEach((ch, c) => g.put(r, c, ch)));
  const [sr, sc] = find(b, "SAMPLE DATA");
  if (sr >= 0) g.text(sr, sc, "SAMPLE DATA", "fail");
  return g;
};
const find = (b, s, from = 0) => {
  for (let r = from; r < b.rows; r++) {
    const c = b.lines[r].join("").indexOf(s);
    if (c >= 0) return [r, c];
  }
  return [-1, -1];
};
/** Text that settles left to right through the ramp, `age` steps after it changed. */
const scramble = (g, r, c, s, age, cls = "") =>
  [...s].forEach((ch, i) => g.put(r, c + i, age >= i * 0.5 + 2 || ch === " " ? ch : RAMP[1 + ((r * 7 + c + i * 3 + Math.floor(age)) % 7)], cls));
/** Dim every letter in a region, leaving lines alone. */
const dim = (g, b, r0, r1, c0, c1) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const ch = b.lines[r]?.[c];
    if (ch && ch !== " " && !BOX.includes(ch) && !"►◄▲▼→".includes(ch)) g.put(r, c, ch, "mute");
  }
};
const centred = (s, w) => { const n = [...s].length, l = Math.floor((w - n) / 2); return " ".repeat(Math.max(0, l)) + s + " ".repeat(Math.max(0, w - n - l)); };

// ── Flows: work travels box to box; the box it reaches is in focus, the rest dim ─────────────────
function flowBoxes(b) {
  const top = b.lines[0];
  const boxes = [];
  top.forEach((ch, c) => { if (ch === "┌") boxes.push({ c0: c }); if (ch === "┐") boxes.at(-1).c1 = c; });
  return boxes.map((x) => ({ ...x, label: b.lines[1].slice(x.c0 + 1, x.c1).join("").trim() }));
}
function flow(b, { dwell = () => BEAT, travel = 3, finale = 3 * BEAT, hold = 2 * BEAT, onBox, hidden } = {}) {
  const boxes = flowBoxes(b);
  // The timeline: [box k in focus for dwell(k)], then [work travels to box k + 1].
  const parts = [];
  let t = 0;
  boxes.forEach((x, k) => {
    const d = k === boxes.length - 1 ? finale : dwell(k);
    parts.push({ type: "box", k, from: t, to: t + d });
    t += d;
    if (k < boxes.length - 1) parts.push({ type: "go", k, from: t, to: t + travel }), (t += travel);
  });
  const cycle = t + hold;
  const frame = (step, frac) => {
    const s = (step % cycle) + frac;
    const g = fresh(b);
    const part = parts.find((p) => s >= p.from && s < p.to);
    const focus = part ? (part.type === "box" ? part.k : -1) : null;
    const reached = part ? (part.type === "box" ? part.k : part.k) : boxes.length - 1;
    boxes.forEach((x, k) => {
      if (hidden && k > reached) for (let r = 0; r < 3; r++) for (let c = x.c0; c <= x.c1; c++) g.put(r, c, " ");
      if (hidden && k > reached && k > 0) for (let c = boxes[k - 1].c1 + 1; c < x.c0; c++) g.put(1, c, " ");
      if (focus !== null && k !== focus && !(hidden && k > reached)) dim(g, b, 1, 1, x.c0, x.c1);
    });
    if (part?.type === "go") {
      const a = boxes[part.k], z = boxes[part.k + 1];
      const route = g.route([[1, a.c1 + 1], [1, z.c0 - 1]]);
      if (hidden) for (let c = a.c1 + 1; c < z.c0; c++) g.put(1, c, " ");
      g.packet(route, ((s - part.from) / travel) * (route.length + 2));
    }
    if (part?.type === "box" && onBox) onBox(g, boxes[part.k], part.k, s - part.from, boxes);
    if (!part && onBox) onBox(g, boxes.at(-1), boxes.length - 1, Infinity, boxes);
    return g;
  };
  return { make: () => frame, still: cycle - 1 };
}
const setLabel = (g, x, s, age = Infinity, cls = "") => scramble(g, 1, x.c0 + 1, centred(s, x.c1 - x.c0 - 1), age, cls);

export const MOTIONS = {
  // Start: ask → spec → draws → any format; the last box cycles the formats.
  start: (b) => flow(b, {
    finale: 7 * 3,
    onBox: (g, x, k, s, boxes) => {
      if (k !== boxes.length - 1) return;
      const formats = ["any format", "markdown", "mdx", "html", "deck", "pdf", "svg"];
      const i = Number.isFinite(s) ? Math.min(formats.length - 1, Math.floor(s / 3)) : 0;
      setLabel(g, x, formats[i], Number.isFinite(s) ? s - i * 3 : Infinity, i ? "ok" : "");
    }
  }),
  // MDX: the spec becomes a component; at build time it arrives as a drawing and lights.
  mdx: (b) => flow(b, {
    finale: 3 * BEAT,
    onBox: (g, x, k, s, boxes) => {
      if (k !== boxes.length - 1) return;
      setLabel(g, x, x.label, Infinity, "ok"); // arrived: built, so it lights
    }
  }),
  // Decks: a presenter's click, a box a beat; the figure slide steps 1/3, 2/3, 3/3.
  deck: (b) => flow(b, {
    dwell: (k) => (k === 2 ? 3 * BEAT : BEAT),
    finale: 2 * BEAT,
    onBox: (g, x, k, s, boxes) => {
      if (k === 2 && Number.isFinite(s)) setLabel(g, x, `figure · ${Math.min(3, 1 + Math.floor(s / BEAT))}/3`, s % BEAT);
      if (k === boxes.length - 1) setLabel(g, x, x.label, Infinity, "ok");
    }
  }),
  // Reports: the pages draw in one after another and the PDF lands.
  pdf: (b) => flow(b, {
    hidden: true,
    finale: 3 * BEAT,
    onBox: (g, x, k, s, boxes) => {
      if (k === boxes.length - 1) setLabel(g, x, x.label, Infinity, "ok");
    }
  }),
  // Layouts: the slots fill in order and the page lands.
  layouts: (b) => flow(b, {
    onBox: (g, x, k, s, boxes) => {
      if (k === boxes.length - 1) setLabel(g, x, x.label, Infinity, "ok");
    }
  }),
  // SVG: the text figure travels to shapes and lands as a file.
  svg: (b) => flow(b, {
    onBox: (g, x, k, s, boxes) => {
      if (k === boxes.length - 1) setLabel(g, x, x.label, Infinity, "ok");
    }
  }),

  // Quality: each glyph acts out its meaning. Measured fills, projected extends after it, the
  // current one steps along, empty stays empty.
  glyphs: (b) => {
    const [r1, c1] = find(b, "███"), [r2] = find(b, "▓▓▓"), [r3] = find(b, "░░░");
    const cycle = 12 + 12 + 6 * BEAT;
    const frame = (step) => {
      const s = step % cycle, g = fresh(b);
      const done = Math.min(3, Math.floor(s / 4)), proj = s < 12 ? 0 : clamp(Math.floor((s - 12) / 4) + 1, 0, 3);
      for (let i = 0; i < 3; i++) {
        g.put(r1, c1 + i, i < done ? "█" : " ");
        g.put(r3, c1 + i, s < 12 ? " " : i < proj ? "░" : " ");
        g.put(r2, c1 + i, s >= 24 ? (i === Math.floor((s - 24) / BEAT) % 3 ? "▓" : " ") : "▓");
      }
      return g;
    };
    return { make: () => frame, still: 23 };
  },

  // Markdown: bars grow from the axis while the values count up, then the figure holds still.
  markdown: (b) => {
    const bars = [];
    b.lines.forEach((l, r) => {
      const cells = l.map((ch, c) => ("█▉▊▋▌▍▎▏".includes(ch) ? c : -1)).filter((c) => c >= 0);
      const m = l.join("").match(/(\d+)%\s*$/);
      if (cells.length && m) bars.push({ r, c0: cells[0], glyphs: cells.map((c) => l[c]), value: Number(m[1]), vc: l.join("").lastIndexOf(m[1]) });
    });
    const grow = 10, cycle = grow + 12 * BEAT;
    const frame = (step, frac) => {
      const s = Math.min(grow, (step % cycle) + frac), p = s / grow, g = fresh(b);
      bars.forEach((x) => {
        const n = x.glyphs.length, head = p * n;
        x.glyphs.forEach((ch, i) => {
          const d = head - i;
          g.put(x.r, x.c0 + i, p >= 1 ? ch : d >= 3 ? "█" : d >= 2 ? "▓" : d >= 1 ? "▒" : d > 0 ? "░" : " ");
        });
        g.text(x.r, x.vc, String(Math.round(x.value * p)).padStart(String(x.value).length, " "));
      });
      return g;
    };
    return { make: () => frame, still: grow };
  },

  // HTML: the wireframe in use, one action a beat. Its notes light as their behaviour happens:
  // [1] the email switch, off by default, is turned on; [2] Save wakes once something changed.
  html: (b) => {
    const [er, ec] = find(b, "[ ■] on"), [wr, wc] = find(b, "[■ ] off"), [dr, dc] = find(b, "Monday");
    const [sr, sc] = find(b, "[[ Save ]]"), [n1r, n1c] = find(b, "[1]"), [n2r, n2c] = find(b, "[2]");
    const fc = b.lines[sr]?.indexOf("║") ?? -1;
    const cycle = 10 * BEAT;
    const frame = (step) => {
      const s = step % cycle, g = fresh(b);
      const on = s >= BEAT;
      g.text(er, ec, on ? (s < BEAT + 1 ? "[▒▒] on " : "[ ■] on ") : "[■ ] off");
      g.text(n1r, n1c, "[1]", on ? "ok" : "mute");
      g.text(n2r, n2c, "[2]", on ? "ok" : "mute");
      if (!on) g.text(sr, sc, "[[ Save ]]", "mute");
      if (s >= 2 * BEAT) g.text(wr, wc, s < 2 * BEAT + 1 ? "[▒▒] off" : "[ ■] on ");
      if (s >= 3 * BEAT) scramble(g, dr, dc, "Friday", s - 3 * BEAT);
      const p = s - 4 * BEAT;
      if (p >= 0 && p < 3) for (let i = 2; i < 8; i++) g.put(sr, sc + i, ["▓", "▒", "░"][p]);
      if (p >= 3 && fc >= 0) scramble(g, sr, fc + 2, "Saved", p - 3, "ok");
      return g;
    };
    return { make: () => frame, still: 8 * BEAT };
  },

  // Before you hand over: the checks tick, one a beat; the count and the meter follow.
  handover: (b) => {
    const items = [];
    b.lines.forEach((l, r) => { if (l.join("").includes("to do")) items.push(r); });
    const [hr] = find(b, "of"), meterAt = b.lines[hr].join("").indexOf("[ ") + 2;
    const cycle = BEAT + items.length * BEAT + 6 * BEAT;
    const frame = (step) => {
      const s = step % cycle, g = fresh(b);
      const n = clamp(Math.floor((s - BEAT) / BEAT) + 1, 0, items.length);
      items.forEach((r, i) => { if (i < n) g.text(r, 0, "█ done ", "ok"); });
      g.text(hr, 0, `${n} of ${items.length} done`, n === items.length ? "ok" : "");
      for (let i = 0; i < items.length; i++) g.put(hr, meterAt + i, i < n ? "█" : "░", i < n ? "ok" : "");
      return g;
    };
    return { make: () => frame, still: cycle - 1 };
  },

  // When it looks wrong: work takes the "no" path, gets fixed, comes back, passes both checks, and
  // ready to send lights green.
  wrong: (b) => {
    const vc = b.lines[2].indexOf("┬");
    const [d1] = find(b, "boxes line up?"), [d2] = find(b, "fits 80 columns?"), [rd] = find(b, "ready to send");
    const arrow = b.lines[d1].join("");
    const from = arrow.indexOf("├") + 1, to = arrow.indexOf("►") - 1;
    const right = b.cols - 1;
    const nodes = { start: [0, 2, 0, vc * 2 + 1], d1: [d1 - 1, d1 + 1, 0, from - 1], fix: [d1 - 1, d1 + 2, to + 2, right], d2: [d2 - 1, d2 + 1, 0, from - 1], fix2: [d2 - 1, d2 + 2, to + 2, right], ready: [rd - 1, rd + 1, 0, vc * 2 + 1] };
    const legs = [
      ["start", BEAT], ["go", [[3, vc], [4, vc]]], ["d1", BEAT], ["go", [[d1, from], [d1, to]]], ["fix", 2 * BEAT],
      ["go", [[d1, to], [d1, from]]], ["d1", 2], ["go", [[d1 + 2, vc], [d1 + 3, vc]]], ["d2", BEAT],
      ["go", [[d2 + 2, vc], [d2 + 3, vc]]], ["ready", 3 * BEAT]
    ];
    let t = 0;
    const parts = legs.map(([kind, v]) => { const d = kind === "go" ? 3 : v; const p = { kind, v, from: t, to: t + d }; t += d; return p; });
    const cycle = t + 2 * BEAT;
    const frame = (step, frac) => {
      const s = (step % cycle) + frac, g = fresh(b);
      const part = parts.find((p) => s >= p.from && s < p.to);
      const focus = part?.kind === "go" ? null : part?.kind;
      if (part) Object.entries(nodes).forEach(([name, [r0, r1, c0, c1]]) => { if (name !== focus) dim(g, b, r0, r1, c0, c1); });
      if (part?.kind === "go") { const route = g.route(part.v); g.packet(route, ((s - part.from) / 3) * (route.length + 2)); }
      if (!part || focus === "ready") { const [rr, rc] = find(b, "ready to send"); g.text(rr, rc, "ready to send", "ok"); }
      return g;
    };
    return { make: () => frame, still: cycle - 1 };
  }
};

// ── In the page ─────────────────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const { autoplay } = await import("./kit/live/play.mjs");
  document.querySelectorAll("[data-guide-motion]").forEach((pre) => {
    const motion = MOTIONS[pre.dataset.guideMotion];
    if (!motion) return;
    try {
      const { make, still } = motion(parse(pre.textContent));
      // Hold the panel at the drawn figure's size, so a frame with less on it never shifts the page.
      pre.style.minWidth = `${pre.getBoundingClientRect().width}px`;
      pre.style.minHeight = `${pre.getBoundingClientRect().height}px`;
      autoplay(pre, make, still, { solo: false });
    } catch {
      // The figure the kit drew stays as it is.
    }
  });
}
