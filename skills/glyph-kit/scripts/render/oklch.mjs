// OKLCH: lightness 0–1, chroma (how colourful, 0 is grey), hue in degrees. Equal steps look equal, so
// the theme rules measure in it. Conversions from Björn Ottosson's OKLab, through linear sRGB.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** A hex colour as { l, c, h }. */
export function oklch(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/** Linear sRGB for an OKLCH colour, possibly outside 0–1. */
function linear(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (L, C, H) => linear(L, C, H).every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** The most chroma a screen can show at this lightness and hue, up to `cap`. */
export function maxChroma(L, H, cap = 0.4) {
  if (inGamut(L, cap, H)) return cap;
  let [lo, hi] = [0, cap];
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** An OKLCH colour as hex, its chroma lowered until a screen can show it. */
export function hexOf(L, C, H) {
  const l = Math.min(1, Math.max(0, L));
  return "#" + linear(l, Math.min(C, maxChroma(l, H)), H).map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, "0")).join("");
}

/** Degrees between two hues, 0–180. */
export const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Distance between two colours in OKLab: under about 0.02 is hard to tell apart. */
export function distance(x, y) {
  const [p, q] = [oklch(x), oklch(y)];
  const ab = (o) => [o.c * Math.cos((o.h * Math.PI) / 180), o.c * Math.sin((o.h * Math.PI) / 180)];
  const [[a1, b1], [a2, b2]] = [ab(p), ab(q)];
  return Math.hypot(p.l - q.l, a1 - a2, b1 - b2);
}
