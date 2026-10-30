// Palettes shared by every rendered form. Each theme names colour roles, not colours:
//   bg page, ink text, muted secondary text, data the measured thing, frame structure,
//   flag problems, ok passes, panel a quiet surface behind figures.
// "phosphor" is Synapse's palette; "gilt" is Our Saints'. "halloween" is pumpkin, bruise purple and
// bone on near-black. In every palette problems are the darker of flag and ok, about 2 to 1 apart
// as drawn and with weak red or weak green, so the two differ in lightness as well as hue.
import { distance, hexOf, hueGap, maxChroma, oklch } from "./oklch.mjs";

export const PALETTES = {
  paper: { bg: "#f7f6f1", panel: "#efede6", ink: "#151513", muted: "#6b6a64", data: "#151513", frame: "#a3a199", flag: "#651b13", ok: "#2f743e" },
  ink: { bg: "#0d0d0c", panel: "#171715", ink: "#f2f0e8", muted: "#9a988f", data: "#f2f0e8", frame: "#5c5b56", flag: "#dc7351", ok: "#89f1b5" },
  phosphor: { bg: "#0d1117", panel: "#151b23", ink: "#c9d1d9", muted: "#8b949e", data: "#58d68d", frame: "#3d4752", flag: "#d47b47", ok: "#7df4ab" },
  gilt: { bg: "#000000", panel: "#0f0d0a", ink: "#eee9dd", muted: "#918b80", data: "#c9a227", frame: "#4f483d", flag: "#cb6d65", ok: "#edc23e" },
  halloween: { bg: "#0f0c11", panel: "#1a1420", ink: "#ece3d0", muted: "#a99db0", data: "#f2801f", frame: "#5d4673", flag: "#ff5a8a", ok: "#d6f590" }
};

// A palette's own ramp for ░ ▒ ▓ █ in the density grids. Palettes without one draw the grid in data.
export const RAMPS = {
  halloween: ["#3b2a4c", "#6b3f78", "#b8572f", "#f2801f"]
};

export const ROLES = ["bg", "panel", "ink", "muted", "data", "frame", "flag", "ok"];

// What each role must reach against the page and the panel colour, and why.
const NEEDS = { ink: [4.5, "Words"], muted: [4.5, "Words"], flag: [4.5, "Words"], ok: [4.5, "Words"], data: [3, "Marks"], frame: [1.5, "Lines"] };
const SURFACE = { bg: "page colour", panel: "panel colour" };

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
export const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const toHex = (cs) => "#" + cs.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const ratio = (fg, bg) => contrastRatio(fg, bg).toFixed(1).replace(/\.0$/, "");

/** The nearest colour that reaches `need` against every surface: the same hue, stepped darker on a
 *  light page and lighter on a dark one. */
function nearest(hex, surfaces, need) {
  const dark = luminance(surfaces[0]) < 0.2;
  const [r, g, b] = rgb(hex);
  for (let k = 1; k <= 100; k++) {
    const t = k / 100;
    const c = dark ? toHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]) : toHex([r * (1 - t), g * (1 - t), b * (1 - t)]);
    if (surfaces.every((s) => contrastRatio(c, s) >= need)) return c;
  }
  return dark ? "#ffffff" : "#000000";
}

/** The hex fallback of a design-system token: "var(--x, #1f4fd6)" or "#1f4fd6". */
const fallback = (value) => String(value).trim().match(/(#[0-9a-f]{6}|#[0-9a-f]{3})\s*\)*\s*$/i)?.[1] ?? null;

function check(colors, ramp, roles) {
  const surfaces = ["bg", "panel"];
  for (const [role, [need, what]] of Object.entries(NEEDS)) {
    if (!roles.has(role) && !roles.has("bg") && !roles.has("panel")) continue;
    for (const s of surfaces) {
      if (contrastRatio(colors[role], colors[s]) >= need) continue;
      const fix = nearest(colors[role], [colors.bg, colors.panel], need);
      throw new Error(`The ${role} colour ${colors[role]} on the ${SURFACE[s]} ${colors[s]} is ${ratio(colors[role], colors[s])} to 1. ${what} in this colour need ${need} to 1. ${fix} passes.`);
    }
  }
  if (!ramp) return;
  if (!Array.isArray(ramp) || ramp.length !== 4 || !ramp.every((c) => HEX.test(c))) throw new Error("A ramp is four hex colours, lightest to strongest, one for each of ░ ▒ ▓ █.");
  for (let i = 1; i < 4; i++) {
    if (contrastRatio(ramp[i], colors.bg) <= contrastRatio(ramp[i - 1], colors.bg) || contrastRatio(ramp[i], ramp[i - 1]) < 1.2)
      throw new Error(`Ramp step ${i + 1} (${ramp[i]}) needs to stand further from the page than step ${i} (${ramp[i - 1]}), so the grid still reads from light to strong.`);
  }
  for (const s of surfaces) {
    if (contrastRatio(ramp[3], colors[s]) < 3)
      throw new Error(`The ramp's strongest step ${ramp[3]} on the ${SURFACE[s]} ${colors[s]} is ${ratio(ramp[3], colors[s])} to 1. Marks need 3 to 1. ${nearest(ramp[3], [colors.bg, colors.panel], 3)} passes.`);
  }
}

// ── How a theme's colours relate ────────────────────────────────────────────────────────────────
// Four rules, measured in OKLCH (reference/colour.md). They warn rather than refuse: a theme that
// breaks one still reads, because every role also has a word or a glyph.
const HUED = 0.04; // chroma under this has no hue worth matching
const TINTED = 0.01; // a neutral under this is grey, and fits any theme
const RULE = { rampHue: 25, rampEnd: 0.05, opposite: 150, apart: 0.15, okHue: 30, neutralHue: 30, neutralChroma: 0.06 };
const NEUTRALS = ["bg", "panel", "frame", "muted"];
const NAMES = { bg: "page", panel: "panel", ink: "ink", muted: "muted", frame: "frame", data: "data" };
const RED = 27, GREEN = 145;

const and = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const deg = (d) => `${Math.round(d)}°`;
const need = (role) => NEEDS[role]?.[0] ?? 0;
const article = (role) => (/^[aeiou]/.test(role) ? "An" : "A");

/** OKLCH lightness, chroma and hue as hex, stepped away from the page until it reaches `min` on every surface. */
function fit(L, C, H, min, surfaces, dark) {
  for (let l = L; l >= 0 && l <= 1; l += dark ? 0.005 : -0.005) {
    const hex = hexOf(l, C, H);
    if (surfaces.every((s) => contrastRatio(hex, s) >= min)) return hex;
  }
  return dark ? "#ffffff" : "#000000";
}

/** The hue in the arc from `from`, `width` degrees round, nearest to `target`. */
function nearestIn(target, from, width) {
  const d = (((target - from) % 360) + 360) % 360;
  if (d <= width) return target;
  return (d - width < 360 - d ? from + width : from) % 360;
}

/**
 * Where a theme's colours break the four rules: [message], each naming the pair and a colour that fits.
 *   1. Data sets the hue: the ramp is the data hue getting stronger, and its last step is the data colour.
 *   2. Problems sit opposite data (150° to 210° away) and are the most colourful role.
 *   3. Passes are 0.15 or more apart from problems in lightness, apart in hue, and quieter.
 *   4. The page, panel, frame and muted colours are the data hue at low chroma.
 * The hue parts skip a grey data colour, which has no hue to follow.
 */
export function relations(colors, ramp = null) {
  const o = Object.fromEntries(ROLES.map((r) => [r, oklch(colors[r])]));
  const surfaces = [colors.bg, colors.panel];
  const dark = luminance(colors.bg) < 0.2;
  const hued = o.data.c >= HUED;
  const H = o.data.h;
  const out = [];

  // 1. The ramp follows the data hue and ends on the data colour.
  if (ramp && hued) {
    const off = ramp.map((hex, i) => ({ hex, i, ...oklch(hex) })).filter((s) => s.c >= HUED && hueGap(s.h, H) > RULE.rampHue);
    if (off.length) {
      const one = off.length === 1;
      out.push(`Ramp step${one ? "" : "s"} ${and(off.map((s) => s.i + 1))} (${off.map((s) => s.hex).join(", ")}) ${one ? "is" : "are"} ${and(off.map((s) => deg(hueGap(s.h, H))))} off the data hue, so the grid reads as more than one colour. ${and(off.map((s) => hexOf(s.l, s.c, H)))} ${one ? "fits" : "fit"}.`);
    }
  }
  if (ramp && distance(ramp[3], colors.data) > RULE.rampEnd)
    out.push(`The ramp's strongest step ${ramp[3]} isn't the data colour ${colors.data}, so █ in a grid and █ in a bar mean different things. ${colors.data} fits.`);

  // 2. Problems sit opposite data, and nothing else is as colourful.
  if (hued && o.flag.c >= HUED && hueGap(o.flag.h, H) < RULE.opposite) {
    const side = (((o.flag.h - H) % 360) + 360) % 360 < 180 ? H + RULE.opposite : H + 360 - RULE.opposite;
    const loudest = Math.max(...ROLES.filter((r) => r !== "flag").map((r) => o[r].c));
    out.push(`Problems (${colors.flag}) are ${deg(hueGap(o.flag.h, H))} from data (${colors.data}) round the colour wheel, so they don't stand apart from it. Opposite data is 150° to 210° away. A flag of ${fit(o.flag.l, Math.max(o.flag.c, loudest + 0.02), side % 360, need("flag"), surfaces, dark)} fits.`);
  }
  for (const role of ["data", "ink", "muted", "frame", "bg", "panel"]) {
    if (o[role].c < o.flag.c) continue;
    const name = role === "data" ? "Data" : `The ${NAMES[role]} colour`;
    out.push(`${name} (${colors[role]}) is as colourful as problems (${colors.flag}) or more, so it draws the eye first. Only problems may out-shout data. ${article(role)} ${role} of ${fit(o[role].l, o.flag.c * 0.8, o[role].h, need(role), surfaces, dark)} fits.`);
  }
  // Only problems may out-shout a coloured data: passes, words and neutrals stay at or under it.
  if (hued)
    for (const role of ["ok", "ink", "muted", "frame", "bg", "panel"]) {
      if (o[role].c <= o.data.c + 0.005 || o[role].c >= o.flag.c) continue;
      const name = role === "ok" ? "Passes" : `The ${NAMES[role]} colour`;
      out.push(`${name} (${colors[role]}) ${role === "ok" ? "are" : "is"} more colourful than data (${colors.data}), so ${role === "ok" ? "they draw" : "it draws"} the eye before it. Only problems may out-shout data. ${article(role)} ${role} of ${fit(o[role].l, o.data.c, o[role].h, need(role), surfaces, dark)} fits.`);
    }
  if (ramp && o.data.c < o.flag.c) {
    const loud = ramp.map((hex, i) => ({ hex, i, ...oklch(hex) })).filter((s) => s.c >= o.flag.c);
    if (loud.length) {
      const top = loud.at(-1);
      out.push(`Ramp step ${top.i + 1} (${top.hex}) is as colourful as problems (${colors.flag}) or more, so the grid draws the eye before they do. ${hexOf(top.l, o.flag.c * 0.8, top.h)} fits.`);
    }
  }

  // 3. Passes read apart from problems without colour, and are quieter. One ok fixes all three.
  const near = Math.abs(o.ok.l - o.flag.l) < RULE.apart;
  const sameHue = o.ok.c >= HUED && o.flag.c >= HUED && hueGap(o.ok.h, o.flag.h) < RULE.okHue;
  const loudOk = o.ok.c >= o.flag.c;
  if (near || sameHue || loudOk) {
    const h = sameHue ? (o.flag.h + ((((o.ok.h - o.flag.h) % 360) + 360) % 360 < 180 ? 60 : 300)) % 360 : o.ok.h;
    const c = Math.min(o.ok.c, o.flag.c * 0.75);
    const gap = RULE.apart + 0.03;
    // Problems are the darker of the two (docs/palette-lightness.md): a lighter pass, else a darker
    // problem, else the other way round. Moving problems can't fix a pass's hue or loudness.
    const tries = near
      ? [["ok", hexOf(o.flag.l + gap, c, h)], ...(sameHue || loudOk ? [] : [["flag", hexOf(o.ok.l - gap, o.flag.c, o.flag.h)]]), ["ok", hexOf(o.flag.l - gap, c, h)]]
      : [["ok", fit(o.ok.l, c, h, need("ok"), surfaces, dark)]];
    const fits = ([role, hex]) => oklch(hex).l <= 0.92 && surfaces.every((s) => contrastRatio(hex, s) >= need(role)) && Math.abs(oklch(hex).l - (role === "ok" ? o.flag.l : o.ok.l)) >= RULE.apart;
    const [role, hex] = tries.find(fits) ?? tries[0];
    const fix = `${article(role)} ${role} of ${hex} fits.`;
    const pair = `Problems (${colors.flag}) and passes (${colors.ok})`;
    if (near) out.push(`${pair} are ${Math.abs(o.ok.l - o.flag.l).toFixed(2)} apart in lightness, so they read the same without colour. ${fix}`);
    if (sameHue) out.push(`${pair} are ${deg(hueGap(o.ok.h, o.flag.h))} apart in hue, so colour doesn't tell them apart. ${fix}`);
    if (loudOk) out.push(`Passes (${colors.ok}) are as colourful as problems (${colors.flag}) or more, so a pass catches the eye like a problem. ${fix}`);
  }

  // 4. The neutrals are the data hue at low chroma.
  const stray = NEUTRALS.map((role) => {
    const n = o[role];
    const why = [n.c > RULE.neutralChroma && "too colourful", hued && n.c >= TINTED && hueGap(n.h, H) > RULE.neutralHue && `${deg(hueGap(n.h, H))} off`].filter(Boolean);
    return why.length && { role, why, fix: fit(n.l, Math.min(n.c, 0.03), hued ? H : n.h, need(role), surfaces, dark) };
  }).filter(Boolean);
  if (stray.length) {
    const one = stray.length === 1;
    out.push(`The ${and(stray.map((s) => NAMES[s.role]))} colour${one ? " isn't" : "s aren't"} the data hue at low chroma (${stray.map((s) => `${colors[s.role]} is ${and(s.why)}`).join(", ")}), so ${one ? "it looks" : "they look"} borrowed from another theme. ${and(stray.map((s) => s.fix))} ${one ? "fits" : "fit"}.`);
  }
  return out;
}

/**
 * Every role from one data hue, on a light or dark page, so the four rules and every contrast check
 * hold: neutrals are the hue barely tinted, problems take the opposite hue nearest red and the most
 * chroma the screen allows, passes the hue nearest green that stays clear of both, lighter and quieter
 * than problems, and the ramp climbs to the data colour in even steps of contrast.
 * Returns { colors, ramp }.
 */
export function mixedTheme(hue, dark) {
  const H = ((hue % 360) + 360) % 360;
  const tone = dark ? { bg: [0.17, 0.035], panel: [0.215, 0.04], ink: [0.95, 0.015] } : { bg: [0.975, 0.01], panel: [0.945, 0.018], ink: [0.22, 0.02] };
  const c = Object.fromEntries(Object.entries(tone).map(([role, [L, C]]) => [role, hexOf(L, C, H)]));
  const surfaces = [c.bg, c.panel];
  const reach = (L, C, h, min) => fit(L, C, h, min, surfaces, dark);
  const near = dark ? 0.3 : 0.9;
  c.muted = reach(near, 0.035, H, 4.8);
  c.frame = reach(near, 0.04, H, 1.7);
  // 5° inside the 150°–210° arc, so rounding to hex can't land a problem on its edge.
  const flagHue = nearestIn(RED, H + RULE.opposite + 5, 350 - 2 * RULE.opposite);
  let okHue = GREEN;
  for (let d = 0; d <= 180; d++) {
    const hit = [GREEN - d, GREEN + d].map((h) => (h + 360) % 360).find((h) => hueGap(h, flagHue) >= 60 && hueGap(h, H) >= 30);
    if (hit != null) {
      okHue = hit;
      break;
    }
  }
  const gap = RULE.apart + 0.03;
  let flagL, okL;
  if (dark) {
    // As dark as words allow, or lighter if that buys chroma, leaving room for a pass that still
    // reads as a colour rather than as the text.
    const low = oklch(reach(0.3, 0.4, flagHue, 4.8)).l;
    flagL = low;
    for (let l = low; l <= 0.9 - gap; l += 0.01) if (maxChroma(l, flagHue) > maxChroma(flagL, flagHue) + 0.005) flagL = l;
    okL = flagL + gap;
  } else {
    // Passes as light as words allow; problems darker by the gap, or darker still if that buys chroma.
    okL = oklch(reach(near, 0.08, okHue, 4.8)).l;
    flagL = okL - gap;
    for (let l = flagL; l >= 0.2; l -= 0.01) if (maxChroma(l, flagHue) > maxChroma(flagL, flagHue) + 0.005) flagL = l;
  }
  const flagC = maxChroma(flagL, flagHue);
  c.flag = dark ? reach(flagL, flagC, flagHue, 4.8) : hexOf(flagL, flagC, flagHue);
  const f = oklch(c.flag);
  c.data = reach(near, f.c * 0.9, H, 4.5);
  const d = oklch(c.data);
  const okC = Math.min(maxChroma(okL, okHue), f.c * 0.7, d.c);
  c.ok = reach(okL, okC, okHue, 4.8);
  if (Math.abs(oklch(c.ok).l - f.l) < RULE.apart) c.ok = hexOf(f.l + (dark ? gap : -gap), okC, okHue);
  const strongest = contrastRatio(c.data, c.bg);
  const ramp = [1, 2, 3].map((i) => fit(tone.bg[0], d.c * (0.3 + 0.175 * i), H, strongest ** (i / 4), [c.bg], dark)).concat(c.data);
  return { colors: c, ramp };
}

/** The hue of a mixed theme's colour: a hex colour or degrees. */
function mixedHue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!HEX.test(String(value))) throw new Error(`A mixed theme starts from one colour, like "#7a5cff", or a hue in degrees, like 290, not ${value}.`);
  const { c, h } = oklch(String(value));
  if (c < HUED) throw new Error(`${value} is grey, so it has no hue to build a mixed theme from. Give a colour, or a hue in degrees like 290.`);
  return h;
}

/** Theme notes from the colours given since the log was last cleared, so the command line can list them. */
export const themeLog = new Set();

/**
 * A theme ready to draw with. theme: a palette name, or { base?, mixed?, <role>: "#hex", ramp?: [4 hex] }.
 * mixed: one colour or hue that every role is derived from (mixedTheme); base then only says light or dark.
 * map: a design-system map whose `roles` block points roles at its tokens; those colours are written
 * as the token's var() in CSS (so the user's own CSS wins) and as its hex fallback everywhere else.
 * Every supplied colour is checked for contrast; a failure names the pair and a colour that passes.
 * How the colours relate is checked too (relations), as warnings, which also go to themeLog.
 * Returns { base, colors (hex), css (CSS values), ramp (hex or null), dark, warnings }.
 */
export function resolveTheme(theme, { map } = {}) {
  const spec = theme == null ? {} : typeof theme === "string" ? fromName(theme) : theme;
  if (typeof spec !== "object" || Array.isArray(spec)) throw new Error("A theme is a palette name or an object of role colours.");
  const base = spec.base ?? "paper";
  if (!PALETTES[base]) throw new Error(`There is no theme called ${base}. Use ${Object.keys(PALETTES).join(", ")}, or a theme file.`);
  const mixed = spec.mixed != null ? mixedTheme(mixedHue(spec.mixed), luminance(PALETTES[base].bg) < 0.2) : null;
  const colors = { ...PALETTES[base], ...mixed?.colors };
  const css = { ...colors };
  const roles = new Set(mixed ? ROLES : []);
  for (const [role, token] of Object.entries(map?.roles ?? {})) {
    if (!ROLES.includes(role)) throw new Error(`The map's roles block names ${role}, which isn't a role. Roles: ${ROLES.join(", ")}.`);
    const value = map.tokens?.[token];
    if (value == null) throw new Error(`The map points ${role} at the token ${token}, which isn't in its tokens.`);
    const hex = fallback(value);
    if (!hex) throw new Error(`The token ${token} has no fallback colour, so its contrast can't be checked. Write it as var(--color-primary, #1f4fd6).`);
    colors[role] = hex.toLowerCase();
    css[role] = String(value).trim();
    roles.add(role);
  }
  for (const [key, value] of Object.entries(spec)) {
    if (key === "base" || key === "ramp" || key === "mixed") continue;
    if (!ROLES.includes(key)) throw new Error(`A theme has no role called ${key}. Roles: ${ROLES.join(", ")}, and ramp.`);
    if (!HEX.test(String(value))) throw new Error(`Write the ${key} colour as a hex value like #1f4fd6, not ${value}.`);
    colors[key] = css[key] = String(value).toLowerCase();
    roles.add(key);
  }
  const chosen = spec.ramp ? spec.ramp.map?.((c) => String(c).toLowerCase()) ?? spec.ramp : mixed?.ramp ?? null;
  const ramp = chosen ?? RAMPS[base] ?? null;
  if (roles.size || chosen) check(colors, ramp, roles);
  // The rules look at colours you chose; the built-in palettes are measured in reference/colour.md.
  const warnings = roles.size || chosen ? relations(colors, ramp) : [];
  for (const w of warnings) themeLog.add(w);
  return { base, colors, css, ramp, dark: luminance(colors.bg) < 0.2, warnings };
}

/** A theme by name: a palette, or "mixed:#7a5cff" (on paper) and "mixed:#7a5cff:dark" (on ink). */
function fromName(name) {
  const m = name.match(/^mixed:([^:]+)(?::(dark|light))?$/);
  if (!m) return { base: name };
  return { base: m[2] === "dark" ? "ink" : "paper", mixed: /^\d+(\.\d+)?$/.test(m[1]) ? Number(m[1]) : m[1] };
}

/** A palette's hex colours, by name or theme object. Defaults to paper. */
export const palette = (theme) => resolveTheme(theme).colors;

/** CSS custom properties for a resolved theme (or a name), e.g. --gk-r-bg. A ramp adds --gk-r-ramp1…4. */
export function themeCss(theme, prefix = "--gk-r-") {
  const t = theme?.colors ? theme : resolveTheme(theme);
  const vars = Object.entries(t.css).map(([k, v]) => `${prefix}${k}:${v}`);
  if (t.ramp) vars.push(...t.ramp.map((c, i) => `${prefix}ramp${i + 1}:${c}`), `${prefix}ramp-o:1`);
  return vars.join(";");
}

/** CSS custom properties for a palette, e.g. --gk-r-bg. */
export const paletteCss = (name, prefix = "--gk-r-") => themeCss(name, prefix);

/** Spacing tokens shared by HTML, report, deck and SVG output. One place to make everything breathe. */
export const SPACING = {
  figurePadX: 32, // px around a figure, left and right
  figurePadY: 28, // px above and below
  figureLine: 1.25, // line height of text figures: tall enough to read, short enough that │ joins the next row
  sectionGap: 96, // px between report sections
  measure: 68 // characters per line of body text
};
