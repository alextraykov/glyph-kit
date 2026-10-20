// Unicode text on a fixed character grid. Widths are terminal-style cells, not
// UTF-16 units or code points. This module has no Node-only APIs so standalone
// moving pages can inline it unchanged.

const markRe = /\p{Mark}/u;
const emojiRe = /\p{Emoji_Presentation}|\p{Regional_Indicator}/u;
const rtlRe = /[\p{Script=Arabic}\p{Script=Hebrew}\u0700-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/u;

const segmenters = new Map();
const segmenter = (granularity, lang) => {
  try {
    const key = `${granularity}:${lang ?? ""}`;
    if (!segmenters.has(key)) segmenters.set(key, typeof Intl?.Segmenter === "function" ? new Intl.Segmenter(lang, { granularity }) : null);
    return segmenters.get(key);
  } catch {
    return null;
  }
};

// Printable ASCII, box drawing, blocks and the kit's other one-cell symbols never combine and are
// never wide, so text made only of them skips segmentation: one cluster and one cell each.
const simpleRe = /^[\x20-\x7e\u00b7\u00d7\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u2190-\u21ff\u2500-\u25a1\u25b2\u25ba\u25bc\u25c4]*$/;

/** Extended grapheme clusters when Intl.Segmenter exists; code points otherwise. */
export function graphemes(value) {
  const text = String(value ?? "");
  if (simpleRe.test(text)) return [...text];
  const seg = segmenter("grapheme");
  return seg ? [...seg.segment(text)].map((part) => part.segment) : [...text];
}

const code = (ch) => ch.codePointAt(0) ?? 0;
const wideCodePoint = (cp) =>
  cp >= 0x1100 &&
  (cp <= 0x115f ||
    cp === 0x2329 || cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd));

/** Width of one grapheme cluster in character cells. */
export function cellWidth(cluster) {
  const chars = [...String(cluster ?? "")];
  if (!chars.length) return 0;
  if (emojiRe.test(chars.join("")) || chars.includes("\ufe0f") || chars.filter((ch) => /\p{Regional_Indicator}/u.test(ch)).length >= 2) return 2;
  const visible = chars.find((ch) => ch !== "\u200d" && ch !== "\ufe0e" && ch !== "\ufe0f" && !markRe.test(ch));
  if (!visible) return 0;
  return wideCodePoint(code(visible)) ? 2 : 1;
}

/** Display width in character cells. */
export const width = (value) => {
  const text = String(value ?? "");
  return simpleRe.test(text) ? text.length : graphemes(text).reduce((sum, cluster) => sum + cellWidth(cluster), 0);
};

/** One entry per display cell. A wide cluster owns its first cell; the second is an empty continuation. */
export function cells(value) {
  const out = [];
  for (const cluster of graphemes(value)) {
    const n = cellWidth(cluster);
    if (!n) {
      if (out.length) {
        let i = out.length - 1;
        while (i > 0 && out[i] === "") i--;
        out[i] += cluster;
      }
      continue;
    }
    out.push(cluster, ...Array(n - 1).fill(""));
  }
  return out;
}

/** Text cut by cut() in this process, with the cells it had: the command line reports these,
 *  so whoever wrote the spec can shorten a label instead of finding "…" in the figure. */
export const cutLog = new Map();

/** Cut to at most `max` cells without splitting a cluster. Removed text is marked. */
export function cut(value, max, mark = "…") {
  const text = String(value ?? "");
  const limit = Math.max(0, Math.floor(max));
  if (width(text) <= limit) return text;
  if (!cutLog.has(text) && cutLog.size < 100) cutLog.set(text, limit);
  const suffix = width(mark) <= limit ? String(mark) : "";
  const room = limit - width(suffix);
  let used = 0;
  let out = "";
  for (const cluster of graphemes(text)) {
    const n = cellWidth(cluster);
    if (used + n > room) break;
    out += cluster;
    used += n;
  }
  return out + suffix;
}

export const padEnd = (value, n) => String(value ?? "") + " ".repeat(Math.max(0, n - width(value)));
export const padStart = (value, n) => " ".repeat(Math.max(0, n - width(value))) + String(value ?? "");

export function center(value, n, fill = " ") {
  const text = String(value ?? "");
  const gap = Math.max(0, n - width(text));
  return fill.repeat(Math.floor(gap / 2)) + text + fill.repeat(Math.ceil(gap / 2));
}

const chunks = (word, max) => {
  const out = [];
  let line = "";
  for (const cluster of graphemes(word)) {
    if (line && width(line) + cellWidth(cluster) > max) {
      out.push(line);
      line = "";
    }
    line += cluster;
  }
  if (line || !out.length) out.push(line);
  return out;
};

/** Wrap words to a cell width. Spaceless scripts fall back to grapheme boundaries. */
export function wrap(value, max, lang) {
  const limit = Math.max(1, Math.floor(max));
  const lines = [];
  for (const para of String(value ?? "").split("\n")) {
    const spaced = /\s/u.test(para);
    let words;
    if (spaced) words = para.split(/\s+/u).filter(Boolean);
    else {
      const seg = segmenter("word", lang);
      words = seg ? [...seg.segment(para)].map((part) => part.segment).filter(Boolean) : [para];
    }
    let line = "";
    for (const word of words) {
      const parts = width(word) > limit ? chunks(word, limit) : [word];
      for (const part of parts) {
        if (!line) line = part;
        else if (width(line) + (spaced ? 1 : 0) + width(part) <= limit) line += (spaced ? " " : "") + part;
        else {
          lines.push(line);
          line = part;
        }
        if (width(line) === limit && parts.length > 1) {
          lines.push(line);
          line = "";
        }
      }
    }
    lines.push(line);
  }
  return lines;
}

export const upper = (value, lang) => String(value ?? "").toLocaleUpperCase(lang);
export const formatNumber = (value, lang) => new Intl.NumberFormat(lang).format(value);
export const isRtl = (value) => rtlRe.test(String(value ?? ""));
