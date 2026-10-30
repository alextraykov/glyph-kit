// Palettes shared by every rendered form. Each theme names colour roles, not colours:
//   bg page, ink text, muted secondary text, data the measured thing, frame structure,
//   flag problems, ok passes, panel a quiet surface behind figures.
// "phosphor" is Synapse's palette; "gilt" is Our Saints'. "halloween" is pumpkin, bruise purple and
// bone on near-black. In every palette problems are the darker of flag and ok, about 2 to 1 apart
// (paper 1.7) as drawn and with weak red or weak green, so the two differ in lightness as well as hue.
export const PALETTES = {
  paper: { bg: "#f7f6f1", panel: "#efede6", ink: "#151513", muted: "#6b6a64", data: "#151513", frame: "#a3a199", flag: "#6e2218", ok: "#2f743e" },
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

/**
 * A theme ready to draw with. theme: a palette name, or { base?, <role>: "#hex", ramp?: [4 hex] }.
 * map: a design-system map whose `roles` block points roles at its tokens; those colours are written
 * as the token's var() in CSS (so the user's own CSS wins) and as its hex fallback everywhere else.
 * Every supplied colour is checked for contrast; a failure names the pair and a colour that passes.
 * Returns { base, colors (hex), css (CSS values), ramp (hex or null), dark }.
 */
export function resolveTheme(theme, { map } = {}) {
  const spec = theme == null ? {} : typeof theme === "string" ? { base: theme } : theme;
  if (typeof spec !== "object" || Array.isArray(spec)) throw new Error("A theme is a palette name or an object of role colours.");
  const base = spec.base ?? "paper";
  if (!PALETTES[base]) throw new Error(`There is no theme called ${base}. Use ${Object.keys(PALETTES).join(", ")}, or a theme file.`);
  const colors = { ...PALETTES[base] };
  const css = { ...colors };
  const roles = new Set();
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
    if (key === "base" || key === "ramp") continue;
    if (!ROLES.includes(key)) throw new Error(`A theme has no role called ${key}. Roles: ${ROLES.join(", ")}, and ramp.`);
    if (!HEX.test(String(value))) throw new Error(`Write the ${key} colour as a hex value like #1f4fd6, not ${value}.`);
    colors[key] = css[key] = String(value).toLowerCase();
    roles.add(key);
  }
  const ramp = spec.ramp ? spec.ramp.map?.((c) => String(c).toLowerCase()) ?? spec.ramp : RAMPS[base] ?? null;
  if (roles.size || spec.ramp) check(colors, ramp, roles);
  return { base, colors, css, ramp, dark: luminance(colors.bg) < 0.2 };
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
