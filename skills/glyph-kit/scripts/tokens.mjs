// Token guardrails: a compact plain-ASCII form for model context, a rough cost estimate, and a real
// count through Anthropic's token-counting endpoint when an API key is set. No dependencies.

// Every glyph maps to one ASCII character, so columns and centring stay where they were.
const COMPACT = {
  "█": "#", "▓": "#", "▒": "=", "░": ":", "·": ".", "■": "#", "□": "o",
  "▉": "#", "▊": "#", "▋": "#", "▌": "#", "▍": "|", "▎": "|", "▏": "|", "▐": "|", "▕": "|",
  "▁": "_", "▂": ".", "▃": "-", "▄": "-", "▅": "=", "▆": "+", "▇": "*", "▀": "^",
  "─": "-", "━": "-", "┄": "-", "═": "=", "│": "|", "┃": "|", "║": "|", "┆": "|", "╎": "|", "┊": "|", "╷": "|", "╵": "|", "↕": "|",
  "►": ">", "◄": "<", "▲": "^", "▼": "v", "→": ">", "–": "-", "“": '"', "”": '"', "×": "x"
};
const JUNCTIONS = "┌┐└┘├┤┬┴┼┏┓┗┛┣┫┳┻╋╔╗╚╝╠╣╦╩╬╭╮╰╯";

/** A figure in plain ASCII (# = : . - | +), same layout, one byte per cell. */
export const compact = (text) => [...text].map((ch) => COMPACT[ch] ?? (JUNCTIONS.includes(ch) ? "+" : ch)).join("");

/**
 * A rough text-token estimate, not a measurement. The heuristic: every non-ASCII character (block,
 * shade, box drawing) counts as one token, since rare three-byte characters are seldom merged with
 * their neighbours; each run of spaces counts as one; other ASCII counts as one token per four
 * characters, as for English. Real counts come from countTokens() below.
 */
export function estimateTextTokens(text) {
  let tokens = 0;
  for (const run of text.match(/ +|\n|[\x21-\x7e]+|[^\x00-\x7f]/g) ?? []) {
    if (run === "\n" || run[0] === " ") tokens += 1;
    else if (run.charCodeAt(0) > 127) tokens += 1;
    else tokens += Math.ceil(run.length / 4);
  }
  return tokens;
}

/** Image tokens by Anthropic's published formula, ceil(w/28) × ceil(h/28), for a picture of w × h px. */
export const imageTokens = (w, h) => Math.ceil(w / 28) * Math.ceil(h / 28);

/** Estimated image tokens for a screenshot of a text figure. Pixel size per column and row is fitted
 *  to the 44 screenshots measured in reference/measurements.json (2× density, with padding):
 *  width ≈ 15.65 px × columns + 64, height ≈ 31.06 px × rows + 73. */
export function estimateImageTokens(text) {
  const lines = text.split("\n");
  const cols = Math.max(...lines.map((l) => [...l].length));
  return imageTokens(Math.round(cols * 15.65 + 64), Math.round(lines.length * 31.06 + 73));
}

/** Compare the two estimates. `costlier` is true when the text likely costs more than its image. */
export function budget(text) {
  const asText = estimateTextTokens(text);
  const asImage = estimateImageTokens(text);
  return { asText, asImage, asCompact: estimateTextTokens(compact(text)), costlier: asText > asImage };
}

/**
 * Count tokens for real with the Messages count_tokens endpoint. Needs an API key; returns null
 * without one. `content` is a string or a list of content blocks (text or base64 image).
 * Pass `fetch` to test it without the network.
 */
export async function countTokens(content, { key = globalThis.process?.env?.ANTHROPIC_API_KEY, model = "claude-opus-5-5", fetch: send = globalThis.fetch } = {}) {
  if (!key) return null;
  const res = await send("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, messages: [{ role: "user", content }] })
  });
  if (!res.ok) throw new Error(`Counting tokens failed (${res.status}): ${await res.text()}`);
  return (await res.json()).input_tokens;
}
