// Read an edited drawing back into its spec, for the types whose text says everything their data
// holds: tables, token tables, decision logs, QA checklists, now/next/later boards and colour roles.
// Charts aren't read back; their numbers are edited in the spec. A reading is only kept when the
// new spec draws exactly the edited text again, so a guess never lands silently.
import { body } from "./render/text.mjs";

/** Drop the SAMPLE DATA stamp and the blank line above it. */
const unstamp = (text) => text.replace(/\n\n\s*SAMPLE DATA\s*$/, "").replace(/\s+$/, "");
const cellsOf = (line) => line.slice(1, -1).split("│").map((c) => c.trim());

/** A box table as rows of cells. A body line whose first cell is empty continues the row above. */
function boxTable(text) {
  const lines = unstamp(text).split("\n");
  const rule = lines.findIndex((l) => l.startsWith("├"));
  if (!lines[0]?.startsWith("┌") || rule < 0) throw new Error("This doesn't read as a table: it needs a ┌ top line and a ├ rule under the header.");
  const join = (rows) =>
    rows.reduce((out, cells, i) => {
      if (i > 0 && cells[0] === "" && out.length) out[out.length - 1] = out.at(-1).map((c, k) => [c, cells[k]].filter(Boolean).join(" "));
      else out.push(cells);
      return out;
    }, []);
  const head = join(lines.slice(1, rule).map(cellsOf));
  const rows = join(lines.slice(rule + 1).filter((l) => l.startsWith("│")).map(cellsOf));
  return [head.flat().length ? head.reduce((a, b) => a.map((c, k) => [c, b[k]].filter(Boolean).join(" "))) : [], ...rows];
}

// Keep a number a number: an unchanged cell takes its original value back.
const keep = (text, original) => (original !== undefined && String(original) === text ? original : text);

const named = (keys) => (text, original = []) =>
  boxTable(text).slice(1).map((cells, i) => Object.fromEntries(keys.map((k, c) => [k, keep(cells[c] ?? "", original[i]?.[k])]).filter(([k, v]) => v !== "" || original[i]?.[k] !== undefined)));

const STATUS = { "█ done": "done", "▒ in progress": "progress", "to do": "todo", "x blocked": "blocked" };

export const READERS = {
  table: (text, original = []) => boxTable(text).map((row, r) => row.map((cell, c) => keep(cell, original[r]?.[c]))),
  tokenTable: named(["name", "value", "use"]),
  decisionLog: named(["date", "decision", "why", "owner"]),
  qaChecklist: (text) =>
    unstamp(text)
      .split("\n")
      .slice(2)
      .filter((l) => l.trim())
      .map((line) => {
        const m = line.match(/^(█ done|▒ in progress|  to do|x blocked)\s+(.*?)(?: \(([^()]*)\))?$/);
        if (!m) throw new Error(`"${line.trim()}" doesn't start with a status: █ done, ▒ in progress, to do or x blocked.`);
        return { text: m[2], status: STATUS[m[1].trim()], ...(m[3] ? { note: m[3] } : {}) };
      }),
  board: (text, original = {}) => {
    const lines = unstamp(text).split("\n");
    if (!lines[0]?.startsWith("┌")) throw new Error("This doesn't read as a now, next, later board: it needs its ┌ top line.");
    const bounds = [0, ...[...lines[0]].flatMap((ch, i) => (ch === "┬" ? [i] : [])), [...lines[0]].length - 1];
    const keys = Object.keys(original);
    const names = bounds.slice(0, -1).map((b, c) => keys[c] ?? [...lines[0]].slice(b + 1, bounds[c + 1]).join("").replace(/─/g, "").trim().toLowerCase());
    const body = lines.slice(1, -1).map((l) => [...l]);
    return Object.fromEntries(names.map((name, c) => {
      const items = [];
      for (const row of body) {
        const cell = row.slice(bounds[c] + 1, bounds[c + 1]).join("").replace(/^ /, "").trimEnd();
        if (cell.startsWith("· ")) items.push(cell.slice(2));
        else if (cell.startsWith("  ") && items.length) items[items.length - 1] += ` ${cell.trim()}`;
      }
      return [name, items];
    }));
  },
  colourRoles: (text, original = {}) => {
    const lines = unstamp(text).split("\n");
    const rows = lines.slice(1, lines.findIndex((l, i) => i > 0 && !l.trim()));
    return {
      ...original,
      roles: rows.map((line) => {
        const [lead, ...swatches] = line.split("██ ");
        const [role, token] = lead.trim().split(/\s{2,}/);
        const [light, dark] = swatches.map((s) => s.match(/^#[0-9a-f]{6}/i)?.[0]);
        const before = original.roles?.find((r) => r.role === role);
        return { role, ...(token && token !== "" ? { token } : {}), light, ...(dark ? { dark } : {}), use: before?.use ?? "words" };
      })
    };
  }
};

export const readable = (kind) => Boolean(READERS[kind]);

/**
 * The spec an edited drawing comes from. Columns and wrapping don't have to be tidy: the reading is
 * drawn again and read a second time, and the two readings must agree, or nothing is kept.
 */
export function readBack(spec, text) {
  const reader = READERS[spec.kind];
  if (!reader) throw new Error(`A ${spec.kind} can't be read back from its drawing. Change its spec and redraw it.`);
  const data = reader(text, spec.data);
  const next = { ...spec, data };
  const again = reader(body(next), spec.data);
  if (JSON.stringify(again) !== JSON.stringify(data)) {
    const list = (d) => (Array.isArray(d) ? d : Array.isArray(d?.roles) ? d.roles : Object.values(d ?? {}).flat());
    const [a, b] = [list(data), list(again)];
    const at = a.findIndex((item, i) => JSON.stringify(item) !== JSON.stringify(b[i]));
    throw new Error(`Row ${at + 1} of the drawing can't be read back exactly: it reads as ${JSON.stringify(a[at])}, which draws as ${JSON.stringify(b[at])}.`);
  }
  return next;
}
