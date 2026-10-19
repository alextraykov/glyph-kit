// The teasers: five short films, one point each, drawn from time alone on the same engine as the
// launch film. Pick one with ?scene=floppy | bars | frame | madeup | fidelity.
// Copy rule: only the film's own lines, plain labels, numbers, and the kit's real output.
import { resolve } from "../skills/glyph-kit/scripts/registry.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import {
  B, C, CW, FOOT, M, SIZE, STAGE, beat, boxSize, building, cells, counted, ctx, endCard, endCardCues, figure, file, fileFrame, footer, press, pressCue, text, typed, wire
} from "./lib.js";

const load = (p) => fetch(`../skills/glyph-kit/examples/${p}`).then((r) => r.json());
const centreX = (w) => (SIZE - w) / 2;

// ── 1. One floppy disk ──────────────────────────────────────────────────────────────────────────
// 1.44 MB = 1,474,560 bytes. The median screenshot of a figure is 22.8 KB (23,347 B): 63 fit.
// The median figure as text is 354 B: 4,165 fit. The label holds 21 × 3 = 63 cells, one per screenshot.
const FLOPPY = [
  "┌───────────────────────────┐",
  "│    ┌─────────────┐  ▐▌    │",
  "│    │             │        │",
  "│    └─────────────┘        │",
  "│                           │",
  "│ ┌───────────────────────┐ │",
  "│ │ 1.44 MB               │ │",
  "│ │                       │ │",
  "│ │                       │ │",
  "│ │                       │ │",
  "│ └───────────────────────┘ │",
  "└───────────────────────────┘"
];
const floppy = {
  dur: beat(20),
  about: "One floppy disk. 10 s. A 1.44 MB disk holds 63 screenshots of a chart, or 4,165 of the chart as text (medians from the kit's measurements).",
  T: { slow: [beat(1), beat(5)], fast: [beat(6), beat(7)], line: beat(9), press: beat(13), end: beat(13) },
  draw(t) {
    const { T } = this;
    if (t < T.press) {
      const fs = 22, cw = fs * CW, lh = fs * 1.25, w = 29 * cw, gap = 80;
      const xs = [centreX(2 * w + gap), centreX(2 * w + gap) + w + gap], y = 300;
      xs.forEach((x, side) => {
        const box = { ch: FLOPPY.map((l) => [...l]), cl: FLOPPY.map((l) => [...l].map(() => "gk-f")) };
        box.cl[6] = [...FLOPPY[6]].map((ch, i) => (i > 3 && i < 12 ? "" : "gk-f"));
        cells(box, x, y, fs);
        const [t0, t1] = side ? T.fast : T.slow;
        const p = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
        const fx = x + 4 * cw, fy = y + 7 * lh, fw = 21 * cw, fh = 3 * lh;
        ctx.fillStyle = C.ink;
        if (side === 0) {
          // One block per screenshot, filled in steps.
          const n = Math.floor(p * 63);
          for (let k = 0; k < n; k++) ctx.fillRect(fx + (k % 21) * cw + 1, fy + Math.floor(k / 21) * lh + 3, cw - 2, lh - 6);
        } else {
          // One dot per figure: 85 × 49 = 4,165.
          const n = Math.floor(p * 4165), dw = fw / 85, dh = fh / 49;
          for (let k = 0; k < n; k++) ctx.fillRect(fx + (k % 85) * dw, fy + Math.floor(k / 85) * dh, Math.max(1, dw - 0.6), Math.max(1, dh - 0.4));
        }
        const v = counted(side ? 4165 : 63, t, t0, t1);
        if (v !== null) {
          text(v, x, y + 12 * lh + 90, 66);
          text(side ? "the chart as text" : "screenshots of the chart", x, y + 12 * lh + 128, 22, C.caption);
        }
      });
      typed("Less to send.", t, T.line, T.line + beat(1), M, 880, 44);
    }
    if (t >= T.end) endCard(t, T.end + 0.3);
    footer();
    press(t, [T.press]);
  },
  cues() {
    const { T } = this;
    return [
      { t: 0, type: "room", d: this.dur },
      { t: T.slow[0], type: "disk", steps: 9, every: 0.22 },
      { t: T.fast[0], type: "disk", steps: 12, every: 0.07, quicken: 0.88 },
      { t: T.fast[1], type: "land", deg: 5, oct: 5 },
      { t: T.line, type: "type", d: beat(1) },
      pressCue(T.press, { quietReveal: true }),
      ...endCardCues(T.end + 0.3)
    ];
  },
  storyboard: [
    [0.3, "Two floppy disks drawn in box lines, labels reading 1.44 MB, both empty.", "1.44 MB", "Room tone."],
    [beat(3), "The left disk fills slowly, one block per screenshot of a chart. The count climbs.", "24 · screenshots of the chart", "Soft floppy head steps at a slow pace."],
    [beat(5.6), "The left disk is full at 63 and stops.", "63", "The steps stop."],
    [beat(6.6), "The right disk fills almost at once, one dot per chart as text.", "2,900 · the chart as text", "A short quickening run of steps."],
    [beat(10), "Both full: 63 against 4,165. The film's line types under them.", "63 · 4,165 · Less to send.", "The blip on 4,165, then typing."],
    [beat(16), "The press clears to the end card: the four glyphs and the name.", "Glyph kit", "The press, the name typing in."]
  ]
};

// ── 2. The bars ─────────────────────────────────────────────────────────────────────────────────
// A text chart drawn by eye (38% drawn longer than 62%) against the kit's, drawn from the numbers.
const WRONG = "yes  ██████████████  38%\nno   ████████        62%";
let RIGHT = null;
const bars = {
  dur: beat(16),
  about: "The bars. 8 s. A text chart drawn by eye, where 38% is longer than 62%, against the same chart drawn by the kit from the numbers. Illustrative values.",
  T: { type: [beat(0.5), beat(2)], error: beat(3), press: beat(6), land: beat(8), press2: beat(12) },
  prepare() {
    const spec = { kind: "barChart", source: "Illustrative", data: [{ label: "yes", value: 38, text: "38%" }, { label: "no", value: 62, text: "62%" }] };
    RIGHT = figure(resolve(spec).render(spec.data, { width: 24 }));
  },
  draw(t) {
    // Both charts sit in the same place, centred, so one swaps for the other under the press.
    const { T } = this, fs = 44, y = 470, x = centreX(Math.max(24, boxSize(RIGHT.box, fs).w / (fs * CW)) * fs * CW);
    if (t < T.press) {
      text("drawn by a model", x, y - 70, 22, C.caption);
      const lines = WRONG.split("\n");
      const shown = Math.floor(Math.max(0, Math.min(1, (t - T.type[0]) / (T.type[1] - T.type[0]))) * WRONG.length);
      let used = 0;
      lines.forEach((l, r) => {
        const part = l.slice(0, Math.max(0, shown - used));
        used += l.length + 1;
        // The error state: two short flashes on the wrong bar, then still, in red.
        const flash = r === 0 && t >= T.error && (t - T.error > beat(1) || Math.floor((t - T.error) / 0.12) % 2 === 0);
        text(part, x, y + r * fs * 1.4, fs, flash ? C.fail : C.ink);
      });
    } else if (t < T.press2) {
      text("drawn by the kit", x, y - 70, 22, C.caption);
      cells(building(RIGHT, t, T.press), x, y - fs * 0.95, fs);
    }
    if (t >= T.press2) endCard(t, T.press2 + 0.3);
    footer();
    press(t, [T.press, T.press2]);
  },
  cues() {
    const { T } = this;
    return [
      { t: 0, type: "room", d: this.dur },
      { t: T.type[0], type: "type", d: T.type[1] - T.type[0] },
      { t: T.error, type: "error" },
      pressCue(T.press),
      { t: T.land, type: "land", deg: 5, oct: 5 },
      pressCue(T.press2, { quietReveal: true }),
      ...endCardCues(T.press2 + 0.3)
    ];
  },
  storyboard: [
    [beat(1.6), "A text chart types in, labelled as drawn by a model.", "drawn by a model", "Typing."],
    [beat(3.1), "The 38% bar is longer than the 62% bar. It flashes red twice, then stays red.", "", "The error beep."],
    [beat(6.3), "The press; the same chart builds in, drawn by the kit from the numbers.", "drawn by the kit", "The press."],
    [beat(9.5), "The bars match their numbers.", "38% · 62%", "The blip as it lands."],
    [beat(15), "End card.", "Glyph kit", "The press, the name typing in."]
  ]
};

// ── 3. One frame ────────────────────────────────────────────────────────────────────────────────
// One frame at 30 fps is 33,333 μs. A figure takes a median of 4.0 μs to draw: 8,333 in one frame.
const frameScene = {
  dur: beat(14),
  about: "One frame. 7 s. One frame of video lasts 33,333 μs; a figure takes a median of 4.0 μs to draw, so 8,333 fit in one frame.",
  T: { box: beat(0.5), fill: [beat(2), beat(4)], line: beat(5.5), press: beat(10) },
  draw(t) {
    const { T } = this;
    if (t < T.press) {
      const w = 800, h = 450, x = centreX(w), y = 240;
      if (t >= T.box) {
        text("1 frame · 1/30 s", x, y - 24, 22, C.caption);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
      // 8,333 cells, filled left to right in the press's steps: 125 × 67 = 8,375; the last 42 stay empty.
      const p = Math.max(0, Math.min(1, (t - T.fill[0]) / (T.fill[1] - T.fill[0])));
      const n = Math.floor(p * 8333), cols = 125, rows = 67, cw = (w - 16) / cols, ch = (h - 16) / rows;
      ctx.fillStyle = C.ink;
      for (let k = 0; k < n; k++) {
        const col = Math.floor(k / rows), row = k % rows;
        ctx.fillRect(x + 8 + col * cw, y + 8 + row * ch, Math.max(1, cw - 1.6), Math.max(1, ch - 1.6));
      }
      const v = counted(8333, t, T.fill[0], T.fill[1]);
      if (v !== null) {
        text(v, x, y + h + 90, 66);
        text("figures", x + v.length * 66 * CW + 20, y + h + 90, 22, C.caption);
      }
      typed("To draw a figure  4.0 μs", t, T.line, T.line + beat(1), x, y + h + 140, 22, C.caption);
    }
    if (t >= T.press) endCard(t, T.press + 0.3);
    footer();
    press(t, [T.press]);
  },
  cues() {
    const { T } = this;
    return [
      { t: 0, type: "room", d: this.dur },
      { t: T.box, type: "tick" },
      { t: T.fill[0], type: "roll", d: T.fill[1] - T.fill[0] },
      { t: T.fill[1], type: "land", deg: 5, oct: 5 },
      { t: T.line, type: "type", d: beat(1), g: 0.6 },
      pressCue(T.press, { quietReveal: true }),
      ...endCardCues(T.press + 0.3)
    ];
  },
  storyboard: [
    [beat(1), "A single frame of video drawn as a box, labelled 1 frame · 1/30 s. Empty.", "1 frame · 1/30 s", "Room tone, one hard-disk tick."],
    [beat(3), "The frame fills with tiny cells, left to right; the count climbs.", "4,166 · figures", "Hard-disk chatter as it counts."],
    [beat(6.5), "Full: 8,333 figures in one frame. The film's stat line types under it.", "8,333 · To draw a figure 4.0 μs", "The blip as it lands; typing."],
    [beat(13), "End card.", "Glyph kit", "The press, the name typing in."]
  ]
};

// ── 4. Made-up numbers ──────────────────────────────────────────────────────────────────────────
// The kit's real refusal, then the same funnel with an illustrative source and its real stamp.
let REFUSAL = "";
let STAMPED = null;
const madeup = {
  dur: beat(18),
  about: "Made-up numbers. 9 s. A funnel that grows is refused with the kit's own sentence; the same funnel marked illustrative gets the SAMPLE DATA stamp.",
  T: { data: [beat(0.5), beat(2)], refuse: [beat(3), beat(5.5)], press: beat(8), stamp: beat(11), press2: beat(14) },
  prepare() {
    try {
      body({ kind: "funnel", title: "Signups", source: "Analytics export", data: [{ label: "visited", value: 1200 }, { label: "signed up", value: 1800 }] });
    } catch (e) {
      REFUSAL = e.message;
    }
    const spec = { kind: "funnel", source: "Illustrative", data: [{ label: "visited", value: 1200 }, { label: "signed up", value: 640 }, { label: "paid", value: 90 }] };
    STAMPED = figure(resolve(spec).render(spec.data, { width: 20 }));
  },
  draw(t) {
    const { T } = this, y = 380;
    if (t < T.press) {
      text("funnel", M, y - 60, 22, C.caption);
      typed("visited     1,200", t, T.data[0], T.data[0] + beat(0.6), M, y, 44);
      typed("signed up   1,800", t, T.data[0] + beat(0.8), T.data[1], M, y + 62, 44);
      // The refusal, word-wrapped, typed in red.
      const words = REFUSAL.split(" "), rows = [""];
      words.forEach((w) => ((rows.at(-1) + " " + w).trim().length > 40 ? rows.push(w) : (rows[rows.length - 1] = (rows.at(-1) + " " + w).trim())));
      const total = rows.join("").length;
      let before = 0;
      rows.forEach((r, i) => {
        const t0 = T.refuse[0] + ((T.refuse[1] - T.refuse[0]) * before) / total, t1 = t0 + ((T.refuse[1] - T.refuse[0]) * r.length) / total;
        if (t >= t0) typed(r, t, t0, t1, M, y + 170 + i * 48, 33, C.fail);
        before += r.length;
      });
    } else if (t < T.press2) {
      const fs = 33, { h } = boxSize(STAMPED.box, fs);
      text("funnel · source: Illustrative", M, y - 60, 22, C.caption);
      cells(building(STAMPED, t, T.press), M, y - 20, fs);
      if (t >= T.stamp) text("SAMPLE DATA", SIZE - M, y - 20 + h + 70, 33, C.caption, "right");
    }
    if (t >= T.press2) endCard(t, T.press2 + 0.3);
    footer();
    press(t, [T.press, T.press2]);
  },
  cues() {
    const { T } = this;
    return [
      { t: 0, type: "room", d: this.dur },
      { t: T.data[0], type: "type", d: T.data[1] - T.data[0] },
      { t: T.refuse[0], type: "error" },
      { t: T.refuse[0] + 0.3, type: "type", d: T.refuse[1] - T.refuse[0] - 0.3, g: 0.6 },
      pressCue(T.press),
      { t: T.stamp, type: "stamp" },
      pressCue(T.press2, { quietReveal: true }),
      ...endCardCues(T.press2 + 0.3)
    ];
  },
  storyboard: [
    [beat(2.3), "A funnel's data types in; the second step is bigger than the first.", "visited 1,200 · signed up 1,800", "Typing."],
    [beat(6), "The kit refuses it. Its own sentence types in red.", "(the kit's real refusal)", "The error beep, then typing."],
    [beat(9.8), "The press; the same funnel marked illustrative builds in.", "funnel · source: Illustrative", "The press."],
    [beat(12), "SAMPLE DATA lands under it.", "SAMPLE DATA", "The stamp."],
    [beat(17), "End card.", "Glyph kit", "The press, the name typing in."]
  ]
};

// ── 5. Text to the thing ────────────────────────────────────────────────────────────────────────
// The settings wireframe as text, then as the glyph-drawn prototype, deck and report, each moving.
let WIRE = null;
const FILES = {
  html: file("Prototype", [
    "┌─ settings.html ───────────┐", "│ Settings                  │", "│ Profile │ Notifications   │", "│           ━━━━━━━━━━━━━   │",
    "│ Email me when ready [ ■]  │", "│ Weekly summary      [■ ]  │", "│ Digest day [ Monday   ▼]  │", "│                           │",
    "│     [ Cancel ] [[ Save ]] │", "│ ░░░░░░░░░░░░░             │", "└───────────────────────────┘"
  ], (g, s) => {
    const on = Math.floor(s / 10) % 2 === 1;
    g.text(5, 22, on ? "[ ■]" : "[■ ]");
    g.text(8, 17, on ? "[[ Save ]]" : " [ Save ] ");
  }),
  deck: file("Deck", [
    "┌─ review.html ─────────────┐", "│ HOW IT WAS READ           │", "│ Every stylesheet read     │", "│                           │",
    "│ ┌─────┐  ┌─────┐  ┌────┐  │", "│ │ 350 ├─►│ 750 ├─►│ 47 │  │", "│ └─────┘  └─────┘  └────┘  │", "│                           │",
    "│ ▓▓▓▓░░░░░░░░      04 / 12 │", "│                           │", "└───────────────────────────┘"
  ], (g, s) => {
    g.stream(g.route([[5, 8], [5, 10]]), s * 0.6, 3);
    g.stream(g.route([[5, 17], [5, 19]]), s * 0.6 + 1, 3);
    g.meter(8, 2, 12, (Math.floor(s / 6) % 13) / 12, s);
  }),
  pdf: file("PDF report", [
    "┌─ audit.pdf ───────────────┐", "│ ░▒▓█                      │", "│ Pave motion audit         │", "│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒      │",
    "│ ┌───────────────────────┐ │", "│ │ 01 ░░░░░░░░░░░░░░░░░░ │ │", "│ │ 02 ░░░░░░░░░░░░░      │ │", "│ │ 03 ░░░░░░░░░░░░░░░░   │ │",
    "│ └───────────────────────┘ │", "│                     1 / 6 │", "└───────────────────────────┘"
  ], (g, s) => [5, 6, 7].forEach((r, i) => g.meter(r, 7, 18 - i * 3, Math.min(1, Math.max(0, (s - i * 8) / 24)), s)))
};
const fidelity = {
  dur: beat(22),
  about: "Text to the thing. 11 s. The settings wireframe as text, then the same screen as a prototype, a deck and a report, each drawn in glyphs and moving. Ends on the sound logo.",
  T: { wire: beat(0.25), presses: [beat(5), beat(9), beat(13), beat(17)], logo: [17.5, 18, 18.5, 19].map(beat), name: beat(19.5) },
  async prepare() {
    const wf = (await load("wireframes.json")).find((s) => s.kind === "screen");
    WIRE = figure(resolve(wf).render(wf.data, wf.options ?? {}));
  },
  draw(t) {
    const { T } = this, [p1, p2, p3, p4] = T.presses;
    const show = (box, fs) => {
      const { w, h } = boxSize(box, fs);
      cells(box, centreX(w), STAGE.y + (STAGE.h - h) / 2, fs);
    };
    if (t < p1) show(building(WIRE, t, T.wire), 28);
    else if (t < p2) show(fileFrame(FILES.html, t, p1), 30);
    else if (t < p3) show(fileFrame(FILES.deck, t, p2), 30);
    else if (t < p4) show(fileFrame(FILES.pdf, t, p3), 30);
    else {
      const big = 88, cw = big * CW, x0 = (SIZE - 7 * cw) / 2;
      ["░", "▒", "▓", "█"].forEach((g, i) => t >= T.logo[i] && text(g, x0 + i * 2 * cw, 500, big));
      typed("Glyph kit", t, T.name, T.name + beat(0.75), SIZE / 2, 610, 55, C.ink, "center");
    }
    footer();
    press(t, T.presses);
  },
  cues() {
    const { T } = this;
    return [
      { t: 0, type: "room", d: this.dur },
      { t: 0, type: "pad", d: T.presses[3] + 0.5, every: 4 },
      ...T.presses.slice(0, 3).map((p) => pressCue(p)),
      pressCue(T.presses[3], { quietReveal: true }),
      ...T.logo.map((t, k) => ({ t, type: "logoKey", deg: [6, 8, 10, 12][k], oct: 4, step: k })),
      { t: T.name, type: "swell", d: this.dur - T.name },
      { t: T.name, type: "type", d: beat(0.75), g: 0.8 }
    ];
  },
  storyboard: [
    [beat(3), "The settings wireframe builds in as text.", "", "The bed: calm lo-fi."],
    [beat(7), "Press: the same screen as settings.html, drawn in glyphs. The switch flips; Save wakes up.", "settings.html", "The press."],
    [beat(11), "Press: the deck. Work passes along the flow.", "review.html", "The press."],
    [beat(15), "Press: the report. The summary fills in.", "audit.pdf", "The press."],
    [beat(18.7), "Press to the end card: the four glyphs type in with the sound logo.", "", "The start-up chime: four soft tones rising F, A, C, E."],
    [beat(21.5), "The name.", "Glyph kit", "The swell rings out as the name types."]
  ]
};

const SCENES = { floppy, bars, frame: frameScene, madeup, fidelity };
const name = new URLSearchParams(location.search).get("scene");
const scene = SCENES[name] ?? floppy;
window.__about = scene.about;
await wire({ dur: scene.dur, draw: (t) => scene.draw(t), cues: () => scene.cues(), storyboard: scene.storyboard, prepare: () => scene.prepare?.() });
