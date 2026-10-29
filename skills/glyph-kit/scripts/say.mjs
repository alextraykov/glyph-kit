import { ROW_NAMES, SCREEN_NAMES } from "./areas/wireframes.mjs";

export const SAY_MAX_LENGTH = 600;
const ACTIONS = new Set(["add", "back", "cancel", "close", "continue", "create", "delete", "edit", "export", "invite", "next", "open", "preview", "remove", "save", "search", "send", "submit", "update"]);
const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const clone = (value) => JSON.parse(JSON.stringify(value));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function quotes(text) {
  const found = [];
  for (const [open, close] of [["“", "”"], ["‘", "’"], ["\"", "\""]]) {
    const esc = (value) => value === "\"" ? "\\\"" : value;
    const re = new RegExp(`${esc(open)}([^${esc(close)}]+)${esc(close)}`, "g");
    for (const match of text.matchAll(re)) found.push({ value: match[1], index: match.index });
  }
  return found.sort((a, b) => a.index - b.index);
}

function unquote(value) {
  return clean(value).replace(/[“”‘’\"]/g, "").replace(/[.!?;,:]+$/, "").trim();
}

function maskQuoted(text) {
  let out = "";
  let quote = "";
  for (const char of text) {
    if (!quote) {
      if (char === "“") quote = "”";
      else if (char === "‘") quote = "’";
      else if (char === '"') quote = char;
      out += quote ? " " : char;
    } else {
      out += " ";
      if (char === quote) quote = "";
    }
  }
  return out;
}

function label(value, capitalize = false) {
  let out = unquote(value).replace(/^(?:a|an|the)\s+/i, "");
  if (capitalize && /^[a-z]/.test(out)) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

function splitClauses(text) {
  const out = [];
  let start = 0;
  let quote = "";
  const flush = (end) => {
    const value = clean(text.slice(start, end)).replace(/^(?:and|then)\s+/i, "");
    if (value) out.push(value);
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!quote) {
      if (ch === "“") quote = "”";
      else if (ch === "‘") quote = "’";
      else if (ch === "\"") quote = ch;
      else if (/[.!?\n]/.test(ch)) flush(i + 1);
      else if (ch === "," && !/^(?:no|actually|instead|scrap that|I mean)$/i.test(text.slice(start, i).trim()) && /^,\s*(?:a|an)\s+(?:name|email|username|text|search|heading|header|checkbox|tick|radio|toggle|switch|dropdown|select|image|picture|table|list|empty|loading|divider|gap|space|button|field|input)\b/i.test(text.slice(i))) {
        flush(i);
        start = i + 1;
      }
      else if (/\s/.test(ch)) {
        const tail = text.slice(i);
        const connector = tail.match(/^\s+(?:and\s+then|after\s+that|then)\s+/i);
        if (connector) {
          flush(i);
          i += connector[0].length - 1;
          start = i + 1;
          continue;
        }
        const nextRow = tail.match(/^\s+and\s+(?=(?:a|an)\s+(?:name|email|username|text|search|heading|header|checkbox|tick|radio|toggle|switch|dropdown|select|image|picture|table|list|empty|loading|divider|gap|space|button|field|input)\b)/i);
        if (nextRow) {
          flush(i);
          i += nextRow[0].length - 1;
          start = i + 1;
        }
      }
    } else if (ch === quote) quote = "";
  }
  flush(text.length);
  return out.map((part) => part.replace(/^[,;\s]+|[,;\s]+$/g, "").trim()).filter(Boolean);
}

function rowsAt(spec, layer = "screen") {
  if (layer === "overlay") return spec.data.overlay?.rows ?? [];
  return spec.data.rows;
}

function allRows(spec) {
  return [...(spec?.data?.rows ?? []), ...(spec?.data?.overlay?.rows ?? [])];
}

function nextId(spec) {
  const n = allRows(spec).reduce((max, row) => {
    const match = String(row.id ?? "").match(/^row-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `row-${String(n).padStart(3, "0")}`;
}

function listItems(value) {
  const source = clean(value).replace(/[.!?;]+$/, "");
  const protectedValues = [];
  let text = "";
  for (let i = 0; i < source.length;) {
    const open = source[i];
    const close = open === "“" ? "”" : open === "‘" ? "’" : open === "\"" ? "\"" : "";
    if (close) {
      const end = source.indexOf(close, i + 1);
      if (end >= 0) {
        const token = `ZZQ${protectedValues.length}ZZ`;
        protectedValues.push(source.slice(i + 1, end));
        text += token;
        i = end + 1;
        continue;
      }
    }
    text += source[i++];
  }
  return text.split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s+or\s+|\s*\|\s*/i).map((part) => {
    const token = part.match(/^ZZQ(\d+)ZZ$/);
    if (token) return protectedValues[Number(token[1])];
    return label(part, true);
  }).filter(Boolean);
}

function after(text, expressions) {
  for (const re of expressions) {
    const match = text.match(re);
    if (match) return match[1];
  }
  return "";
}

function canonical(values, candidate) {
  return values.find((value) => String(value).toLowerCase() === String(candidate).toLowerCase()) ?? candidate;
}

function typeIn(value) {
  const low = String(value).toLowerCase();
  const names = Object.entries(ROW_NAMES)
    .flatMap(([type, aliases]) => aliases.map((alias) => ({ type, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  return names.find(({ alias }) => new RegExp(`(?:^|\\b)${alias.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?:\\b|$)`, "i").test(low))?.type ?? null;
}

function quotedOrTail(text, patterns, fallback = "") {
  const qs = quotes(text);
  return qs[0]?.value || after(text, patterns) || fallback;
}

function findType(text, spec) {
  const low = text.replace(/[“‘\"][^”’\"]*[”’\"]/g, " quoted value ").toLowerCase().trim();
  if (/^nothing here yet(?:\b|:)/i.test(low)) return "empty";
  if (/\bvideo buttons?\b/.test(low)) return null;
  if (/^options?\s*:.*\bas\s+radio\b/.test(low)) return "radio";
  if (/^.+\s+(?:toggle|switch)\s+(?:on|off|enabled|disabled)$/.test(low)) return "toggle";
  if (/^give me two choices\b/.test(low)) return [...ACTIONS].some((word) => new RegExp(`\\b${word}\\b`).test(low)) ? "buttons" : "radio";
  if (/^two\s+choices?\b/.test(low)) return [...ACTIONS].some((word) => new RegExp(`\\b${word}\\b`).test(low)) ? "buttons" : "radio";
  if (/^either\b/.test(low)) return "radio";
  if (/^pick one(?: of)?\b/.test(low)) return "radio";
  const simple = low
    .replace(/^(?:please\s+)?(?:add|create|draw|put|show)\s+(?:(?:in|on)\s+)?/i, "")
    .replace(/^(?:a|an|the|some|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i, "");
  if (/^radio\b/i.test(simple)) return "radio";
  if (/^.+\s+buttons?\b/i.test(simple)) return "buttons";
  const names = Object.entries(ROW_NAMES).flatMap(([type, aliases]) => aliases.map((alias) => ({ type, alias }))).sort((a, b) => b.alias.length - a.alias.length);
  for (const { type, alias } of names) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^${escaped}(?:\\b|$)`, "i").test(simple)) return type;
    if (type === "buttons" && new RegExp(`\\b${escaped}s?\\s*(?:[:,]|$)`, "i").test(simple)) return type;
  }
  if (/^(?:name|email|username|password|project|team|account|phone|address)\s+field\b/.test(simple)) return "input";
  if (/^text box\b/.test(simple) || /^box to type in\b/.test(simple) || /^box\s+(?:for|called|labelled|labeled|named)\b/.test(simple) || /^somewhere to type\b/.test(simple)) return "input";
  if (/^columns?\b/.test(simple) || /^grid of\b/.test(simple)) return "table";
  if (/^two\s+radio\s+options\b/.test(low)) return "radio";
  if (/^items\s*:|^entries\s*:|^rows\s*:/.test(simple)) return "list";
  if (/^placeholder lines?\b/.test(simple)) return "skeleton";
  if (/^nothing here yet\b/.test(simple)) return "empty";
  if (/^checkbox\b|^tick box\b|^check\b/.test(simple)) return "checkbox";
  if (/^box\s*[.!?]?$/.test(simple)) return spec.data.title || spec.data.rows.length ? "input" : null;
  return null;
}

function parseRow(text, type, spec, layer) {
  const qs = quotes(text).map((x) => clean(x.value));
  const row = { type };
  if (["heading", "text", "muted"].includes(type)) {
    const value = quotedOrTail(text, [/\b(?:saying|reading|called|titled|named|that says|that reads)\s+(.+)$/i, /:\s*(.+)$/]);
    if (!value) return null;
    row.text = qs.length ? qs[0] : label(value);
    return row;
  }
  if (type === "input") {
    let value = after(text, [
      /\b(?:text box|box to type in|box|somewhere to type|field|input)\s+(?:for|called|labelled|labeled|named)\s+(?:the\s+)?(.+?)(?:\s+with\s+placeholder.*)?$/i,
      /\b(?:name|email|username|password|project|team|account|phone|address)\s+field\b/i
    ]) || (qs.length > 1 && /\bplaceholder\b/i.test(text) ? qs[0] : qs[0]);
    if (!value) {
      const typed = text.match(/\b(?:type|enter)\s+(?:the\s+)?(.+)$/i);
      value = typed ? typed[1] : "Text";
    }
    const common = text.match(/\b(name|email|username|password|project|team|account|phone|address)\s+field\b/i);
    if (common && (!qs.length || /\bplaceholder\b/i.test(text))) value = common[1];
    row.label = label(value, Boolean(common) || !qs.length) || "Text";
    const placeholder = qs.length > 1 ? qs.at(-1) : after(text, [/\bplaceholder\s+(?:is\s+)?(.+)$/i]);
    if (placeholder) row.placeholder = label(placeholder);
    return row;
  }
  if (type === "search") {
    let value = qs[0] || after(text, [/\b(?:search|find)(?:\s+box|\s+field)?\s+(?:for|labelled|labeled|placeholder|called|:)\s+(.+)$/i, /\bplaceholder\s+(?:is\s+)?(.+)$/i]) || "Search";
    if (!qs.length && /^search\s+for\s+/i.test(text)) value = `Search ${value}`;
    row.placeholder = label(value, !qs.length);
    return row;
  }
  if (type === "buttons") {
    let source = text.replace(/,?\s+(?:on the right|aligned? right|right aligned|align(?:ed)? to the right)\b.*$/i, "");
    const primary = source.match(/,?\s*([^,]+?)\s+is\s+(?:the\s+)?(?:main|primary)(?:\s+one)?\b/i)?.[1];
    source = source.replace(/,?\s*[^,]+?\s+is\s+(?:the\s+)?(?:main|primary)(?:\s+one)?\b.*$/i, "");
    let items = [];
    const named = source.match(/\bbutton\s+(?:called|named)\s+(.+)$/i);
    const singular = source.match(/\b(?:a|an|the)?\s*(.+?)\s+button\s*$/i);
    if (named) items = qs.length ? [qs[0]] : [label(named[1])];
    else if (qs.length === 1 && /\bbutton\b/i.test(source) && !/\bbuttons\b/i.test(source)) items = [qs[0]];
    else if (/\bbutton\b/i.test(source) && !/\bbuttons\b/i.test(source) && singular) items = [label(singular[1])];
    else {
      source = source.replace(/^(?:give me\s+)?two\s+choices?\s*[:,]?\s*/i, "");
      let list = after(source, [/\b(?:buttons|actions)\s*:\s*(.+)$/i, /^(.+?)\s+buttons\b/i, /^(.+?)\s+actions\b/i]);
      if (!list && qs.length) items = qs.map((item) => item);
      if (!list && !qs.length) list = source;
      if (list) {
        list = list.replace(/^(?:a|an|the)\s+/i, "").replace(/\b(?:buttons|actions)\b/i, "");
        items = listItems(list);
      }
    }
    if (!items.length) return null;
    row.items = items.map((item) => ({ label: item, ...(primary && item.toLowerCase() === label(primary).toLowerCase() ? { primary: true } : {}) }));
    if (/\b(?:on the right|aligned? right|right aligned|align(?:ed)? to the right)\b/i.test(text)) row.align = "right";
    return row;
  }
  if (type === "checkbox" || type === "toggle") {
    let value = qs[0];
    if (!value) {
      value = text.replace(/^(?:a|an|the|some)\s+/i, "")
        .replace(/^(?:checkbox|tick box|check|toggle|switch)\b/i, "")
        .replace(/^\s*(?:for|called|labelled|labeled|named)?\s*[:,]?\s*/i, "")
        .replace(/\s*,?\s*(?:not checked|unchecked|unticked|checked|ticked|enabled|disabled|on|off)\s*$/i, "")
        .replace(/\s+(?:checkbox|tick box|toggle|switch)\s*$/i, "")
        .replace(/^[,;:\s]+|[,;:\s]+$/g, "");
    }
    value = qs[0] || label(value, true);
    if (!value) return null;
    row.label = value;
    if (type === "checkbox") row.checked = /\b(?:checked|ticked|enabled)\b/i.test(text) && !/\b(?:not checked|unchecked|unticked|disabled)\b/i.test(text);
    else row.on = /\b(?:on|enabled)\b/i.test(text) && !/\b(?:off|disabled)\b/i.test(text);
    return row;
  }
  if (type === "radio") {
    let list = after(text, [
      /\b(?:options?|choices?)\s*[:,]\s*(.+?)(?:\s+as\s+radio)?$/i,
      /\b(?:radio options?)\s*,\s*(.+)$/i,
      /\b(?:radio buttons?)\s+(?:for|called)\s+.+?:\s*(.+)$/i,
      /\b(?:pick one(?: of)?|either)\s*[:,]?\s*(.+)$/i
    ]);
    const selectedClause = list?.match(/[;,]\s*([^,;]+?)\s+selected\b/i);
    if (selectedClause && list) list = list.slice(0, selectedClause.index);
    if (!list && qs.length > 1) list = qs.slice(1).join(",");
    if (!list && qs.length === 1) list = qs[0];
    if (!list) {
      const tail = text.match(/\b(?:two|three|four|five|\d+)\s+(?:radio\s+)?(?:options?|choices?)\s*,\s*(.+)$/i);
      list = tail?.[1] ?? "";
    }
    const options = listItems(list);
    if (!options.length) {
      const prev = rowsAt(spec, layer).at(-1);
      if (/\b(?:no|actually|instead|make those|make that|make it)\b/i.test(text) && prev?.type === "buttons") options.push(...prev.items.map((item) => item.label));
    }
    if (!options.length) return null;
    row.options = options;
    const selected = text.match(/\b([^,;]+?)\s+selected\b/i)?.[1];
    if (selected) row.selected = canonical(options, label(selected));
    else if (/\bradio options\b/i.test(text)) row.selected = options[0];
    return row;
  }
  if (type === "select") {
    const choosingFrom = /^\s*(?:choose from|a\s+menu\s+of)\b/i.test(text);
    const value = choosingFrom ? "Choose one" : qs[0] || after(text, [
      /\b(?:dropdown|select|picker|menu)\s*[, :]\s*(.+?)(?=\s*,?\s*(?:set|value|with|selected|options?)\b|$)/i,
      /\b(?:dropdown|select|picker|menu)\s+(?:for|called|labelled|labeled)\s+(.+?)(?=\s+(?:set|value|with|selected|options?)\b|$)/i
    ]);
    const setValue = text.match(/\bvalue\s+(?:is\s+)?[“\"]([^”\"]+)[”\"]/i)?.[1]
      || text.match(/\bset\s+to\s+[“\"]?([^”\";,]+)[”\"]?/i)?.[1]
      || text.match(/\b(?:set(?:\s+to)?|value(?:\s+is)?|choose|select)\s+[“\"]?([^”\";,]+)[”\"]?/i)?.[1];
    const trailingQuote = qs.length > 1 ? qs.at(-1) : "";
    const optionsRaw = after(text, [/\boptions?\s*[:,]?\s*(.+)$/i]);
    const options = optionsRaw ? listItems(optionsRaw) : choosingFrom ? qs : [];
    row.label = label(value || "Choose one", true);
    const chosen = choosingFrom ? options[0] : setValue || trailingQuote || options[0];
    if (chosen) row.value = label(chosen);
    if (options.length) row.options = options;
    return row;
  }
  if (type === "tabs" || type === "list") {
    let value = after(text, [
      /\b(?:tabs?|segments?)\s*(?:for|called|:)?\s*(.+)$/i,
      /\bsections across the top\s*:?\s*(.+)$/i,
      /\b(?:list of|list with rows?|list(?=\s*:)|items|entries|rows)\s*:?\s*(.+)$/i
    ]);
    if (type === "tabs" && value) value = value.replace(/[,;]?\s*[^,;]+?\s+selected\b.*$/i, "");
    const items = listItems(value || (qs.length ? qs.join(",") : ""));
    if (!items.length) return null;
    if (type === "tabs") {
      row.items = items;
      const selected = text.match(/(?:,|;)?\s*([^,;]+?)\s+selected\b/i)?.[1];
      if (selected) row.selected = canonical(items, label(selected));
    } else row.items = items;
    return row;
  }
  if (type === "table") {
    const body = text.replace(/^\s*(?:a\s+)?(?:table|grid)\b/i, "");
    const rowIndex = body.search(/\b(?:with\s+)?rows?\s*(?::|\s)/i);
    let columnPart = rowIndex >= 0 ? body.slice(0, rowIndex) : body;
    const rowPart = rowIndex >= 0 ? body.slice(rowIndex).replace(/^\s*(?:with\s+)?rows?\s*(?::|\s)/i, "") : "";
    columnPart = columnPart.replace(/^\s*(?:(?:with|of)\s+)?columns?\s*:?\s*/i, "").replace(/^\s*of\s+/i, "").replace(/\s+and\s*$/i, "").replace(/\s+with\s*$/i, "");
    const columns = listItems(columnPart);
    if (!columns.length) return null;
    row.columns = columns;
    row.rows = [];
    if (rowPart) {
      const quotedRows = quotes(rowPart).map(({ value }) => clean(value));
      const rawRows = quotedRows.length ? quotedRows : rowPart.split(/\s*;\s*/).filter(Boolean);
      row.rows = quotedRows.length > 1 && !quotedRows.some((value) => /[,|]/.test(value))
        ? [quotedRows]
        : rawRows.map((line) => line.split(/\s*[,|]\s*/).map((cell) => label(cell)).filter(Boolean));
    }
    return row;
  }
  if (type === "image") {
    row.label = label(qs[0] || after(text, [/\b(?:of|for|labelled|labeled|called|named)\s+(.+)$/i]) || "image");
    return row;
  }
  if (type === "skeleton") {
    const raw = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:loading\s+)?(?:placeholder\s+)?lines?\b/i)?.[1]
      || text.match(/\bplaceholder\s+lines?\s*:\s*(\d+)\b/i)?.[1];
    const count = raw ? Number(raw) || NUMBERS[raw.toLowerCase()] : undefined;
    if (count && count >= 1 && count <= 16) row.lines = count;
    return row;
  }
  if (type === "empty") {
    const action = text.match(/\baction\s+[“\"]([^”\"]+)/i)?.[1];
    const emptyText = qs[0] || after(text, [/\b(?:empty state|nothing here yet|empty message|saying)\s*[:,]?\s*(.+?)(?=\s+with action\b|$)/i]) || "Nothing here yet";
    row.text = qs.length ? emptyText : label(emptyText);
    if (action) row.action = clean(action);
    return row;
  }
  if (type === "space" || type === "divider") return row;
  return null;
}

function firstMatch(rows, type) {
  return [...rows].reverse().find((row) => row.type === type) ?? rows.at(-1) ?? null;
}

function operation(clause, spec, layer, index) {
  const raw = clean(clause);
  const text = raw.replace(/[.!?]+$/, "");
  const dispatch = maskQuoted(text);
  const low = text.toLowerCase();
  const rows = rowsAt(spec, layer);
  if (/^undo(?:\s+that)?$/i.test(text)) return { op: "undo" };
  const rename = dispatch.match(/^(?:rename|retitle)\s+(?:this\s+)?screen\s+to\s+(.+)$/i) || dispatch.match(/^call\s+this\s+screen\s+(.+)$/i);
  if (rename) {
    const value = text.match(/^(?:rename|retitle)\s+(?:this\s+)?screen\s+to\s+(.+)$/i)?.[1] || text.match(/^call\s+this\s+screen\s+(.+)$/i)?.[1] || "";
    return { op: "retitle", title: quotes(value)[0]?.value || label(value) };
  }
  if (/^(?:a\s+|an\s+|the\s+)?(?:dialog|modal)\b.*\bover\s+(?:it|the screen|that)\b/i.test(dispatch)) {
    const title = quotes(text)[0]?.value || text.match(/\b(?:called|titled|named)\s+(.+?)\s+over\b/i)?.[1];
    if (title) return { op: "overlay", title: label(title) };
  }
  const container = text.match(new RegExp(`^(?:a|an|the|new)\\s+(${SCREEN_NAMES.join("|")})\\s+(?:called|titled|named)\\s+(.+)$`, "i"));
  if (container) {
    const title = quotes(container[2])[0]?.value || container[2];
    if (title) return { op: "retitle", title: label(title) };
  }
  if (/^(?:a\s+)?header\b/i.test(text) && !/\bheading\b/i.test(text) && !spec.data.title) {
    const title = quotes(text)[0]?.value || text.match(/\b(?:called|titled|named|for)\s+(.+)$/i)?.[1];
    if (title) return { op: "retitle", title: label(title) };
  }
  if (/^(?:a\s+)?box\b/i.test(text) && !/^a?\s*text box\b/i.test(text) && !spec.data.title && !spec.data.rows.length) {
    const title = quotes(text)[0]?.value || text.match(/\b(?:for|called|named)\s+(.+)$/i)?.[1];
    if (title) return { op: "retitle", title: label(title) };
  }
  if (/^(?:note that|add a note|make a note|note this)\b/i.test(dispatch)) {
    const target = firstMatch(rows);
    let note = raw.replace(/^.*?\b(?:note that|add a note\s*:?|make a note that|note this)\s*/i, "");
    if (/^note this field\b/i.test(raw)) note = raw.replace(/^note\s+/i, "");
    note = note.replace(/^(save|this field|this|the list)\s+/i, (_, start) => `${start} `);
    note = clean(note).replace(/^(?:that\s+)?/i, "");
    if (target && note) {
      note = /^[A-Z]/.test(note) ? note : note[0].toUpperCase() + note.slice(1);
      if (!/[.!?]$/.test(note)) note += ".";
      return { op: "note", id: target.id, layer, text: note };
    }
  }
  const rowRename = text.match(/^(?:rename|retitle)\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
  if (rowRename) {
    const targetType = typeIn(rowRename[1]);
    const named = rowRename[1].match(/^(.+?)\s+(?:field|box|button|tab|toggle|switch|checkbox)$/i)?.[1];
    const target = targetType ? [...rows].reverse().find((row) => row.type === targetType && (!named || [row.label, row.placeholder, row.text].some((value) => String(value ?? "").toLowerCase() === label(named).toLowerCase()))) : null;
    if (target) {
      const value = quotes(rowRename[2])[0]?.value || label(rowRename[2]);
      const field = target.type === "search" ? "placeholder" : ["heading", "text", "muted", "empty"].includes(target.type) ? "text" : "label";
      return { op: "set", id: target.id, layer, field, value };
    }
  }
  const remove = text.match(/^(?:remove|delete|take out|scrap)\s+(?:the\s+)?(.+?)$/i);
  if (remove) {
    const targetText = remove[1].toLowerCase();
    let target;
    const ordinal = targetText.match(/\b(first|second|third|last)\s+row\b/);
    if (ordinal) target = rows[ordinal[1] === "first" ? 0 : ordinal[1] === "second" ? 1 : ordinal[1] === "third" ? 2 : rows.length - 1];
    else {
      const type = typeIn(targetText);
      const named = targetText.match(/^(.+?)\s+(?:field|box|button|tab|toggle|switch|checkbox)$/i)?.[1];
      target = type ? [...rows].reverse().find((row) => row.type === type && (!named || [row.label, row.placeholder, row.text].some((v) => String(v ?? "").toLowerCase() === label(named).toLowerCase()))) : null;
    }
    if (target) return { op: "remove", id: target.id, layer };
  }
  const moveLast = /^move the last row to the top\b/i.test(dispatch);
  const move = text.match(/^(?:move|put)\s+(?:the\s+)?(.+?)\s+(to the bottom|at the bottom|bottom|to the top|at the top|top|below the (.+)|after the (.+))$/i);
  if (move || moveLast) {
    const what = moveLast ? "last row" : move[1].toLowerCase();
    const type = typeIn(what);
    const named = what.match(/^(.+?)\s+(?:field|box|button|tab|toggle|switch|checkbox)$/i)?.[1];
    const target = moveLast ? rows.at(-1) : type ? [...rows].reverse().find((row) => row.type === type && (!named || [row.label, row.placeholder, row.text].some((v) => String(v ?? "").toLowerCase() === label(named).toLowerCase()))) : null;
    if (target) {
      let afterId = null;
      if (/bottom/i.test(move?.[2] ?? "")) afterId = rows.at(-1)?.id ?? null;
      const anchorText = move?.[3] || move?.[4];
      if (anchorText) {
        const anchorType = typeIn(anchorText);
        afterId = anchorType ? [...rows].reverse().find((row) => row.type === anchorType)?.id ?? null : null;
      }
      return { op: "move", id: target.id, after: afterId, layer };
    }
  }
  const toggleEdit = /^(?:tick|check|clear|uncheck|turn|set)\b/i.test(text) || /^switch\s+(?:it|that|the\s+(?:toggle|switch))\b/i.test(text);
  if (toggleEdit) {
    const rowDefinition = /^(?:tick\s+box|checkbox)\b/i.test(text) || /^check\s+.+[,;]\s*(?:ticked|checked)\b/i.test(text);
    const targetType = /\b(?:checkbox|box|check|tick)\b/i.test(text) ? "checkbox" : /\b(?:toggle|switch|summary|mode)\b/i.test(text) ? "toggle" : null;
    const named = text.match(/^(?:tick|check|clear|uncheck|turn|set|switch)\s+(?:the\s+)?(.+?)(?:\s+(?:on|off|enabled|disabled|checked|unchecked|ticked|unticked))?$/i)?.[1]?.replace(/^(?:checkbox|toggle|switch|box)(?:\s+(?:for|called))?\s*/i, "");
    let resolvedType = targetType;
    if (!resolvedType && /^(?:check|clear|uncheck|tick)\b/i.test(text)) resolvedType = "checkbox";
    if (!resolvedType && /^(?:turn|set|switch)\b/i.test(text) && /\b(?:on|off|enabled|disabled)\b/i.test(text)) resolvedType = "toggle";
    const isOrdinal = named?.match(/\b(first|second|third|last)\b/i)?.[1]?.toLowerCase();
    const typedRows = resolvedType ? rows.filter((row) => row.type === resolvedType) : [];
    const ordinalIndex = isOrdinal === "first" ? 0 : isOrdinal === "second" ? 1 : isOrdinal === "third" ? 2 : isOrdinal === "last" ? typedRows.length - 1 : -1;
    const target = rowDefinition ? null : ordinalIndex >= 0 ? typedRows[ordinalIndex] : resolvedType ? [...typedRows].reverse().find((row) => (!named || /^(?:it|that|this|the toggle|the switch|the checkbox|the box)$/i.test(named) || [row.label, row.text].some((value) => String(value ?? "").toLowerCase() === label(named).toLowerCase()))) : null;
    if (target && (target.type === "checkbox" || target.type === "toggle")) {
      const on = /\b(?:tick|check|on|enabled|checked)\b/i.test(text) && !/\b(?:clear|uncheck|off|disabled|unchecked|not checked)\b/i.test(text);
      return { op: "set", id: target.id, layer, field: target.type === "checkbox" ? "checked" : "on", value: on };
    }
    if (resolvedType && !rowDefinition) return { op: "add", row: { type: "text", text: raw, unread: true }, layer, after: rows.at(-1)?.id ?? null, temp: `draft-${index + 1}`, unread: true };
  }
  if (/^(?:make|set|select|choose)\b/i.test(text) && /\bselected(?:\s+(?:option|tab))?\s*$/i.test(text)) {
    const target = [...rows].reverse().find((row) => ["radio", "tabs", "select"].includes(row.type));
    if (target) {
      let value = text.match(/\b(?:make|set|select|choose)\s+(?:the\s+)?(.+?)\s+(?:the\s+)?selected(?:\s+(?:option|tab))?\s*$/i)?.[1] ?? "";
      value = value.replace(/\b(?:option|tab)\b/gi, "").trim();
      const options = target.type === "tabs" ? target.items ?? [] : target.options ?? [];
      const ordinal = value.match(/^(first|second|third|last)(?:\s+radio)?$/i);
      if (ordinal) {
        const position = ordinal[1].toLowerCase() === "first" ? 0 : ordinal[1].toLowerCase() === "second" ? 1 : ordinal[1].toLowerCase() === "third" ? 2 : options.length - 1;
        value = options[position] ?? "";
      }
      const match = options.find((option) => String(option).toLowerCase() === label(value).toLowerCase());
      if (value && (match != null || (target.type === "select" && !options.length && !ordinal))) {
        return { op: "set", id: target.id, layer, field: target.type === "select" ? "value" : "selected", value: match ?? label(value) };
      }
    }
    return { op: "add", row: { type: "text", text: raw, unread: true }, layer, after: rows.at(-1)?.id ?? null, temp: `draft-${index + 1}`, unread: true };
  }
  const chooseValue = text.match(/^(?:select|choose)\s+(?:the\s+)?(.+?)(?:\s+(?:option|tab))?$/i);
  if (chooseValue && !/^choose from\b/i.test(text) && !/^select\s+[“"].+?[”"]\s*,\s*value\b/i.test(text)) {
    if (!/[,:;]|\b(?:value|options?|field|dropdown|menu)\b/i.test(chooseValue[1])) {
    const target = [...rows].reverse().find((row) => ["radio", "tabs", "select"].includes(row.type));
    if (target) {
      const values = target.type === "tabs" ? target.items : target.type === "radio" ? target.options : target.options ?? [];
      const value = label(chooseValue[1]);
      if (target.type === "select" && !values.length) return { op: "set", id: target.id, layer, field: "value", value };
      const match = values.find((option) => String(option).toLowerCase() === value.toLowerCase());
      if (match != null) return { op: "set", id: target.id, layer, field: target.type === "select" ? "value" : "selected", value: match };
      return { op: "add", row: { type: "text", text: raw, unread: true }, layer, after: rows.at(-1)?.id ?? null, temp: `draft-${index + 1}`, unread: true };
      }
    }
  }
  const setValue = text.match(/^set\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
  if (setValue) {
    const target = [...rows].reverse().find((row) => row.type === "select" && (!setValue[1] || setValue[1].toLowerCase().includes(row.label.toLowerCase()) || row.label.toLowerCase().includes(setValue[1].toLowerCase().replace(/^the\s+/, "")) || rows.filter((candidate) => candidate.type === "select").length === 1));
    if (target) return { op: "set", id: target.id, layer, field: "value", value: canonical(target.options ?? [], label(setValue[2])) };
  }
  const fieldEdit = text.match(/^(?:change|rename|set)\s+(?:the\s+)?(?:input\s+)?(label|placeholder|value|image label|button label|heading|text)\s+to\s+(.+)$/i);
  if (fieldEdit) {
    const target = rows.at(-1);
    if (target) {
      const field = fieldEdit[1].toLowerCase().includes("image") ? "label" : fieldEdit[1].toLowerCase().includes("button") ? "items" : fieldEdit[1].toLowerCase() === "heading" || fieldEdit[1].toLowerCase() === "text" ? "text" : fieldEdit[1].toLowerCase();
      let value = quotes(fieldEdit[2])[0]?.value || label(fieldEdit[2]);
      if (field === "items") value = [{ ...target.items?.[0], label: value }];
      return { op: "set", id: target.id, layer, field, value };
    }
  }
  const namedEdit = text.match(/^(?:make|change|set)\s+(?:the\s+)?(heading|header|search|input|field|checkbox|toggle|switch|dropdown|select|button|text|caption|hint)\s+(?:say|read|labelled|labeled|to)\s+(.+)$/i);
  if (namedEdit) {
    const targetType = typeIn(namedEdit[1]);
    const target = targetType ? [...rows].reverse().find((row) => row.type === targetType) : null;
    if (target) {
      const value = quotes(namedEdit[2])[0]?.value || label(namedEdit[2]);
      const field = target.type === "search" ? "placeholder" : ["heading", "text", "muted", "empty"].includes(target.type) ? "text" : "label";
      return { op: "set", id: target.id, layer, field, value };
    }
  }
  const correction = /^(?:no|actually|instead|scrap that|I mean)\b/i.test(dispatch) || /^make (?:those|that|it|this)\b/i.test(dispatch);
  const base = text.replace(/^(?:no|actually|instead|scrap that|I mean)\b[,:\s-]*/i, "").replace(/^make (?:those|that|it|this)\s+/i, "");
  const type = findType(base, spec);
  if (type) {
    let row = parseRow(base, type, spec, layer);
    if (!row && correction && type === "radio") {
      const target = rows.at(-1);
      if (target?.type === "buttons") row = { type: "radio", options: target.items.map((item) => item.label) };
    }
    if (row && correction) {
      const target = rows.at(-1);
      if (target) {
        if (type === "radio" && !row.options && target.items) row.options = target.items.map((item) => typeof item === "string" ? item : item.label);
        if (type === "search" && (row.placeholder === "Search" || !row.placeholder)) row.placeholder = target.placeholder ?? target.label ?? row.placeholder;
        if (type === "select" && !row.options && target.options) { row.options = target.options; row.value = target.options[0]; }
        if (type === "checkbox" && target.on != null) row.checked = target.on;
        if (type === "heading" && !row.text) row.text = target.text ?? target.label ?? "";
        if (type === "search" && row.placeholder === "Search" && target.type === "input") row.placeholder = target.label ?? row.placeholder;
        return { op: "replace", id: target.id, layer, row };
      }
    }
    if (row) return { op: "add", row, layer, after: rows.at(-1)?.id ?? null, temp: `draft-${index + 1}` };
  }
  return { op: "add", row: { type: "text", text: raw, unread: true }, layer, after: rows.at(-1)?.id ?? null, temp: `draft-${index + 1}`, unread: true };
}

function publicSpec(spec) {
  const out = clone(spec);
  delete out._say;
  return out;
}

function withStableIds(spec) {
  const out = clone(spec);
  const used = new Set();
  const needsId = [];
  for (const row of allRows(out)) {
    if (typeof row.id === "string" && row.id && !used.has(row.id)) used.add(row.id);
    else needsId.push(row);
  }
  let next = 1;
  for (const row of needsId) {
    let candidate;
    do {
      candidate = `row-${String(next++).padStart(3, "0")}`;
    } while (used.has(candidate));
    row.id = candidate;
    used.add(candidate);
  }
  return out;
}

function mutate(spec, change, idMap, makeId) {
  const data = spec.data;
  if (change.op === "retitle") { data.title = change.title; return; }
  if (change.op === "overlay") { data.overlay = { title: change.title, rows: [] }; return; }
  if (change.op === "add") {
    const layer = change.layer === "overlay" ? "overlay" : "screen";
    if (layer === "overlay" && !data.overlay) data.overlay = { title: "Dialog", rows: [] };
    const list = layer === "overlay" ? data.overlay.rows : data.rows;
    const row = { ...clone(change.row), id: makeId() };
    if (change.temp) idMap.set(change.temp, row.id);
    const afterId = idMap.get(change.after) ?? change.after;
    const at = afterId ? list.findIndex((item) => item.id === afterId) + 1 : list.length;
    list.splice(at > 0 ? at : list.length, 0, row);
    return;
  }
  const layer = change.layer === "overlay" ? "overlay" : "screen";
  const list = layer === "overlay" ? data.overlay?.rows ?? [] : data.rows;
  const id = idMap.get(change.id) ?? change.id;
  const at = list.findIndex((row) => row.id === id);
  if (at < 0) return;
  if (change.op === "replace") list[at] = { ...clone(change.row), id: list[at].id };
  else if (change.op === "set") list[at][change.field] = clone(change.value);
  else if (change.op === "remove") list.splice(at, 1);
  else if (change.op === "move") {
    const [row] = list.splice(at, 1);
    const afterId = idMap.get(change.after) ?? change.after;
    const anchor = afterId ? list.findIndex((item) => item.id === afterId) : -1;
    list.splice(anchor >= 0 ? anchor + 1 : (change.after == null ? 0 : list.length), 0, row);
  } else if (change.op === "note") {
    const notes = data.notes ?? (data.notes = {});
    const noteId = String(Object.keys(notes).length + 1);
    list[at].note = noteId;
    notes[noteId] = change.text;
  }
}

/** Read one typed or speech segment into screen operations. */
export function read(sentence, spec = { kind: "screen", data: { title: "", rows: [] } }) {
  if (typeof sentence !== "string") throw new TypeError("Type a screen description first.");
  if (sentence.length > SAY_MAX_LENGTH) throw new RangeError(`Keep a screen description under ${SAY_MAX_LENGTH} characters.`);
  const source = clean(sentence);
  if (!source) return [];
  if (spec?.kind !== "screen" || !spec.data || !Array.isArray(spec.data.rows)) throw new TypeError("The spoken builder needs a screen spec.");
  const virtual = withStableIds(spec);
  const changes = [];
  const clauses = splitClauses(source);
  const undoClause = clauses.findIndex((clause) => /^undo(?:\s+that)?[.!?]*$/i.test(clause));
  if (undoClause >= 0 && clauses.length > 1) {
    const layer = virtual.data.overlay ? "overlay" : "screen";
    return [{ op: "add", row: { type: "text", text: source, unread: true }, layer, after: rowsAt(virtual, layer).at(-1)?.id ?? null, temp: "draft-undo-mixed", unread: true }];
  }
  let active = virtual.data.overlay ? "overlay" : "screen";
  let index = 0;
  for (const clause of clauses) {
    const change = operation(clause, virtual, active, index++);
    if (change.op === "undo") return [change];
    changes.push(change);
    if (change.op === "overlay") {
      virtual.data.overlay = { title: change.title, rows: [] };
      active = "overlay";
    }
    if (change.op === "add") {
      const list = rowsAt(virtual, change.layer ?? active);
      list.push({ ...change.row, id: change.temp });
    } else if (change.op === "retitle") virtual.data.title = change.title;
    else if (change.op === "replace") {
      const list = rowsAt(virtual, change.layer ?? active);
      const at = list.findIndex((row) => row.id === change.id);
      if (at >= 0) list[at] = { ...change.row, id: list[at].id };
    } else if (change.op === "remove") {
      const list = rowsAt(virtual, change.layer ?? active);
      const at = list.findIndex((row) => row.id === change.id);
      if (at >= 0) list.splice(at, 1);
    } else if (change.op === "set") {
      const target = rowsAt(virtual, change.layer ?? active).find((row) => row.id === change.id);
      if (target) target[change.field] = change.value;
    } else if (change.op === "note") {
      const target = rowsAt(virtual, change.layer ?? active).find((row) => row.id === change.id);
      if (target) target.note = "1";
    } else if (change.op === "move") {
      const list = rowsAt(virtual, change.layer ?? active);
      const at = list.findIndex((row) => row.id === change.id);
      if (at >= 0) {
        const [row] = list.splice(at, 1);
        const anchor = change.after == null ? -1 : list.findIndex((item) => item.id === change.after);
        list.splice(anchor >= 0 ? anchor + 1 : change.after == null ? 0 : list.length, 0, row);
      }
    }
  }
  return changes;
}

/** Apply a spoken transaction without mutating the supplied screen. */
export function apply(spec, changes = []) {
  if (spec?.kind !== "screen" || !spec.data || !Array.isArray(spec.data.rows)) throw new TypeError("The spoken builder needs a screen spec.");
  if (!Array.isArray(changes)) throw new TypeError("Screen changes must be a list.");
  const base = withStableIds(spec);
  const history = base._say?.history ?? [];
  if (changes.length === 1 && changes[0]?.op === "undo") {
    const previous = history.at(-1);
    if (!previous) return publicSpec(base);
    const out = clone(previous);
    out._say = { history: history.slice(0, -1) };
    return out;
  }
  if (!changes.length) return base;
  const out = clone(base);
  const nextHistory = [...history, publicSpec(base)].slice(-32);
  const idMap = new Map();
  const makeId = () => nextId(out);
  for (const change of changes) mutate(out, change, idMap, makeId);
  if (!out.source && [...out.data.rows, ...(out.data.overlay?.rows ?? [])].some((row) => [row.height, row.lines].some((value) => typeof value === "number"))) {
    out.source = "Screen description supplied by the author.";
  }
  out._say = { history: nextHistory };
  return out;
}

export function screenSpec(spec) { return publicSpec(spec); }
export const HINT_WORDS = Object.freeze(Object.entries(ROW_NAMES).map(([type, words]) => ({ type, words: [...words] })));
