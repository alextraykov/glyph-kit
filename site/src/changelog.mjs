// CHANGELOG.md as HTML, for the site's Changes page. Read from the repo at build time; no dependencies.
// Only the Markdown the changelog uses: # headings, paragraphs, - lists (one level, wrapped lines
// carry on), **bold**, `code` and [links](url). A paragraph that is all bold, like **Motion**, is a
// group heading inside a release and becomes an <h3>.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** One line of inline Markdown as HTML: code spans first, so nothing inside them is read as Markdown. */
export const inline = (md) => {
  const codes = [];
  const text = esc(md.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const outside = /^https?:\/\//.test(href);
      return `<a href="${href}"${outside ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    });
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
};

/** Block Markdown as HTML. `shift` moves headings down, so a ## in the file can sit under the page's h2. */
export const markdownToHtml = (md, { shift = 0 } = {}) => {
  const out = [];
  let para = [];
  let list = null;
  const flush = () => {
    if (para.length) {
      const text = para.join(" ");
      const group = text.match(/^\*\*([^*]+)\*\*$/);
      out.push(group ? `<h${Math.min(3 + shift, 6)}>${inline(group[1])}</h${Math.min(3 + shift, 6)}>` : `<p>${inline(text)}</p>`);
      para = [];
    }
    if (list) {
      out.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      list = null;
    }
  };
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const item = line.match(/^[-*]\s+(.*)$/);
    if (!line.trim()) flush();
    else if (heading) {
      flush();
      const level = Math.min(heading[1].length + shift, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      if (para.length) flush();
      (list ??= []).push(item[1]);
    } else if (list && /^\s/.test(raw)) list[list.length - 1] += " " + line.trim();
    else {
      if (list) flush();
      para.push(line.trim());
    }
  }
  flush();
  return out.join("\n");
};

/** "0.2.0" → "v0-2-0", an anchor that needs no escaping in CSS or a URL. */
export const releaseId = (version) => "v" + version.replace(/\./g, "-");

/**
 * The changelog split at its ## headings: what comes before the first release, and each release
 * newest first, whatever order the file has them in. A heading reads "## 0.2.0 — 2026-10-20"; the
 * date is optional.
 */
export const parseChangelog = (md) => {
  const parts = md.replace(/\r\n?/g, "\n").split(/^## /m);
  const intro = parts.shift().replace(/^# .*\n/, "").trim();
  const releases = parts.map((part) => {
    const [head, ...rest] = part.split("\n");
    const m = head.trim().match(/^v?(\d+\.\d+\.\d+(?:-[\w.]+)?)(?:\s+[—–-]\s+(\d{4}-\d{2}-\d{2}))?/);
    if (!m) throw new Error(`CHANGELOG.md: "## ${head.trim()}" is not a version heading like "## 0.2.0 — 2026-10-20"`);
    return { version: m[1], date: m[2] ?? null, id: releaseId(m[1]), body: rest.join("\n").trim() };
  });
  const key = (v) => v.split(/[.-]/).slice(0, 3).map(Number);
  releases.sort((a, b) => {
    const [x, y] = [key(a.version), key(b.version)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  });
  return { intro, releases };
};

/** "2026-10-20" → "20 October 2026", the same in every time zone. */
export const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
