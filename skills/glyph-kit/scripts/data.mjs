// Data from files: "data": "@results.csv" or "@results.json", resolved next to the spec file, so
// the numbers come from the file and not from a model's memory. When a spec has no source, its
// source line names the file. Node only (it reads files); no dependencies.
import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve as resolvePath } from "node:path";

/** Parse CSV text into rows: one object per line, keyed by the header. Numbers become numbers.
 *  Handles quoted fields, commas and line breaks inside quotes, and "" as an escaped quote. */
export function parseCsv(text) {
  const records = [];
  let field = "";
  let record = [];
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") record.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      if (record.some((f) => f.trim() !== "")) records.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  record.push(field);
  if (record.some((f) => f.trim() !== "")) records.push(record);
  const [header, ...rows] = records;
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  const value = (v) => {
    const t = v.trim();
    return t !== "" && !Number.isNaN(Number(t)) ? Number(t) : t;
  };
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, value(r[i] ?? "")])));
}

/** Read the file a "@path" points at, relative to the spec's folder. */
export function readData(ref, baseDir) {
  const path = resolvePath(baseDir, ref.slice(1));
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new Error(`The data file ${ref.slice(1)} wasn't found next to the spec (looked in ${dirname(path)}).`);
  }
  const ext = extname(path).toLowerCase();
  if (ext === ".csv") return parseCsv(text);
  if (ext === ".json") return JSON.parse(text);
  throw new Error(`Data files can be .csv or .json; ${basename(path)} is neither.`);
}

/** Every spec inside a file: one spec, a list, a deck's slides or a report's figures. */
const specsIn = (doc) =>
  Array.isArray(doc) ? doc : doc?.sections ? doc.sections.flatMap((s) => s.figures ?? []) : doc?.slides ? doc.slides.filter((s) => s.kind) : doc?.kind ? [doc] : [];

/** Load "@file" data in place, for every spec in a document. Returns the document. */
export function loadData(doc, baseDir) {
  for (const spec of specsIn(doc)) {
    if (typeof spec.data !== "string" || !spec.data.startsWith("@")) continue;
    const file = spec.data.slice(1);
    spec.data = readData(spec.data, baseDir);
    if (!String(spec.source ?? "").trim()) spec.source = `Data from ${basename(file)}`;
  }
  return doc;
}
