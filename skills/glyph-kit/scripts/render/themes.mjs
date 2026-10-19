// Palettes shared by every rendered form. Each theme names colour roles, not colours:
//   bg page, ink text, muted secondary text, data the measured thing, frame structure,
//   flag problems, ok passes, panel a quiet surface behind figures.
// "phosphor" is Synapse's palette; "gilt" is Our Saints'.
export const PALETTES = {
  paper: { bg: "#f7f6f1", panel: "#efede6", ink: "#151513", muted: "#6d6c66", data: "#151513", frame: "#a3a199", flag: "#c4401c", ok: "#0a7a50" },
  ink: { bg: "#0d0d0c", panel: "#171715", ink: "#f2f0e8", muted: "#9a988f", data: "#f2f0e8", frame: "#5c5b56", flag: "#ef7c56", ok: "#4cc58f" },
  phosphor: { bg: "#0d1117", panel: "#151b23", ink: "#c9d1d9", muted: "#8b949e", data: "#58d68d", frame: "#3d4752", flag: "#f0883e", ok: "#58d68d" },
  gilt: { bg: "#000000", panel: "#0f0d0a", ink: "#eee9dd", muted: "#918b80", data: "#c9a227", frame: "#4f483d", flag: "#e49a7d", ok: "#c9a227" }
};

/** A palette by name, falling back to paper. */
export const palette = (name) => PALETTES[name] ?? PALETTES.paper;

/** CSS custom properties for a palette, e.g. --gk-r-bg. */
export const paletteCss = (name, prefix = "--gk-r-") =>
  Object.entries(palette(name)).map(([k, v]) => `${prefix}${k}:${v}`).join(";");

/** Spacing tokens shared by HTML, report, deck and SVG output. One place to make everything breathe. */
export const SPACING = {
  figurePadX: 32, // px around a figure, left and right
  figurePadY: 28, // px above and below
  figureLine: 1.25, // line height of text figures: tall enough to read, short enough that │ joins the next row
  sectionGap: 96, // px between report sections
  measure: 68 // characters per line of body text
};
