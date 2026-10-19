// Glyph kit feedback: a message, an optional email and the page it came from, sent to the owner as one
// email. No dependencies and no store: the limits live in a signed cookie, a signed ticket and this
// instance's memory, and the one bot check (Turnstile) runs only when someone presses Send.
//
//   GET  /api/feedback   a ticket, when the form opens: it holds the time, so a send too soon is refused
//   POST /api/feedback   { message, email, page, website, ticket, token }
//
// Environment: RESEND_API_KEY and FEEDBACK_FROM_EMAIL (or CONTACT_FROM_EMAIL) send the email;
// TURNSTILE_SECRET_KEY checks the bot token; FEEDBACK_TO_EMAIL changes where it goes. The signing key is
// FEEDBACK_SIGNING_KEY, or derived from the Turnstile secret so there's one fewer thing to set.
// Without them, outside production, messages land in `outbox` (and in FEEDBACK_OUTBOX, a file, if set).
import { appendFileSync } from "node:fs";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TO = () => process.env.FEEDBACK_TO_EMAIL || "hi@traykov.cc";
const MAX_BODY_BYTES = 8_192;
const MIN_MESSAGE = 3;
export const MAX_MESSAGE = 2_000;
const MAX_EMAIL = 254;
const MAX_LINKS = 3;
// A person reads the form and types; a script posts at once. The ticket is good for two hours.
export const MIN_SECONDS = 3;
const MAX_TICKET_AGE = 2 * 60 * 60_000;
// Per visitor (the cookie): three messages in fifteen minutes. Per address (this instance's memory):
// eight tries in ten minutes, sent or not. Everyone together, per instance: forty an hour.
const VISITOR = { count: 3, window: 15 * 60_000 };
const ADDRESS = { count: 8, window: 10 * 60_000 };
const EVERYONE = { count: 40, window: 60 * 60_000 };
const COOKIE = "gk_feedback";
const TURNSTILE_ACTION = "feedback";

const SAY = {
  message: `Write a message, up to ${MAX_MESSAGE.toLocaleString("en")} characters.`,
  email: "Check the email, or leave it empty.",
  links: `Up to ${MAX_LINKS} links in one message.`,
  ticket: "The form was open too long. Press Send again.",
  fast: "That was quick. Press Send again.",
  again: "You've already sent this one.",
  plenty: (minutes) => `You've sent ${VISITOR.count} in a row. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  many: (minutes) => `That's a lot of messages at once. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  check: "The spam check didn't pass. Press Send again.",
  origin: "Send feedback from the Glyph kit site.",
  paused: "Feedback can't be sent right now. Email hi@traykov.cc instead.",
};

// ── Signing ────────────────────────────────────────────────────────────────────────────────────

function signingKey() {
  if (process.env.FEEDBACK_SIGNING_KEY) return process.env.FEEDBACK_SIGNING_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.RESEND_API_KEY;
  if (secret) return createHmac("sha256", secret).update("glyph-kit feedback signing").digest("hex");
  return process.env.VERCEL_ENV === "production" ? null : "glyph-kit feedback, local only";
}

const b64 = (text) => Buffer.from(text).toString("base64url");
const mac = (key, text) => createHmac("sha256", key).update(text).digest("base64url");

function sign(key, value) {
  const payload = b64(JSON.stringify(value));
  return `${payload}.${mac(key, payload)}`;
}

/** The value inside a signed string, or null when it was changed or isn't one of ours. */
function unsign(key, signed) {
  if (typeof signed !== "string" || signed.length > 512) return null;
  const [payload, sig] = signed.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(mac(key, payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// ── Limits held in memory: one instance's view, gone when it stops. A floor under the cookie. ────

const memory = new Map();
const used = new Map(); // tickets already spent, so one ticket sends once

/** Room left under a limit: { ok } or { ok: false, minutes } until the oldest try drops out. */
function room(key, limit, now) {
  const times = (memory.get(key) ?? []).filter((t) => now - t < limit.window);
  memory.set(key, times);
  if (times.length < limit.count) return { ok: true };
  return { ok: false, minutes: Math.max(1, Math.ceil((times[0] + limit.window - now) / 60_000)) };
}

function note(key, now) {
  memory.get(key)?.push(now) ?? memory.set(key, [now]);
  // Keep the map small: forget keys whose tries have all aged out.
  if (memory.size > 5_000) for (const [k, times] of memory) if (!times.some((t) => now - t < EVERYONE.window)) memory.delete(k);
}

function spend(ticketId, now) {
  for (const [id, at] of used) if (now - at > MAX_TICKET_AGE) used.delete(id);
  if (used.has(ticketId)) return false;
  used.set(ticketId, now);
  return true;
}

/** Forget every limit. For tests. */
export function resetLimits() {
  memory.clear();
  used.clear();
}

// ── Requests ───────────────────────────────────────────────────────────────────────────────────

function allowedOrigins() {
  const configured = String(process.env.FEEDBACK_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const vercel = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean).map((host) => `https://${host}`);
  // The site lives on its subdomain and at traykov.cc/glyph-kit, which passes requests through to here.
  const site = ["https://glyph-kit.traykov.cc", "https://traykov.cc", "https://www.traykov.cc", "https://glyph-kit-zeta.vercel.app"];
  return new Set([...site, ...vercel, ...configured]);
}

function originAllowed(origin) {
  if (allowedOrigins().has(origin)) return true;
  // Local runs: any port on this computer.
  return process.env.VERCEL_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

function clientAddress(request) {
  const real = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return (real || forwarded || "unknown").trim();
}

function readCookie(request, name) {
  for (const part of String(request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function cookieHeader(request, value) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; Max-Age=${Math.round(VISITOR.window / 1000)}; HttpOnly; SameSite=Lax${secure}`;
}

const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function reply(status, payload, extra = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...HEADERS, ...extra } });
}

const refuse = (status, code, error, extra) => reply(status, { error, code }, extra);

// ── What a message may hold ────────────────────────────────────────────────────────────────────

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const LINK = /\bhttps?:\/\/|\bwww\./giu;
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/u;

/** { message, email, page } cleaned, or { error, code } with the sentence to show. */
export function readMessage(data) {
  const message = typeof data?.message === "string" ? data.message.replace(/\r\n?/gu, "\n").trim() : "";
  const length = [...message].length;
  if (length < MIN_MESSAGE || length > MAX_MESSAGE || CONTROL.test(message)) return { error: SAY.message, code: "message" };
  if ((message.match(LINK) ?? []).length > MAX_LINKS) return { error: SAY.links, code: "links" };
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email && (email.length > MAX_EMAIL || !EMAIL.test(email))) return { error: SAY.email, code: "email" };
  return { message, email, page: readPage(data?.page) };
}

/** The page it was sent from, when it's one of the site's own; anything else is noted as unknown. */
function readPage(value) {
  try {
    const url = new URL(String(value ?? ""));
    const local = process.env.VERCEL_ENV !== "production" && /^(localhost|127\.0\.0\.1)$/u.test(url.hostname);
    if (!local && !allowedOrigins().has(url.origin)) return "Not known";
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return "Not known";
  }
}

const fingerprint = (message) => createHash("sha256").update(message.toLowerCase().replace(/\s+/gu, " ")).digest("base64url").slice(0, 16);

// ── The bot check ──────────────────────────────────────────────────────────────────────────────

async function verifyTurnstile(token, request, address) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.VERCEL_ENV !== "production") return true; // local runs without keys
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }
  if (typeof token !== "string" || !token || token.length > 2_048) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (address !== "unknown") form.set("remoteip", address);
  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(5_000),
  });
  if (!verification.ok) return false;
  const result = await verification.json();
  if (!result.success) return false;
  // Cloudflare's test keys answer for example.com with no action: fine on a computer, never live.
  if (result.metadata?.result_with_testing_key) return process.env.VERCEL_ENV !== "production";
  if (result.action !== TURNSTILE_ACTION) return false;
  const origin = request.headers.get("origin");
  return !result.hostname || result.hostname === new URL(origin).hostname;
}

// ── Delivery ───────────────────────────────────────────────────────────────────────────────────

export const outbox = [];

const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** One readable email: the message first, then where and when it came from. */
export function compose({ message, email, page }, now) {
  const first = message.split("\n")[0];
  const short = [...first].length > 60 ? `${[...first].slice(0, 59).join("").trimEnd()}…` : first;
  const text = [
    message,
    "",
    "──",
    `Page   ${page}`,
    `Sent   ${WHEN.format(now)} UTC`,
    `Email  ${email ? `${email} (reply to this email to answer)` : "Not given"}`,
  ].join("\n");
  return { subject: `Glyph kit feedback: ${short}`, text, ...(email ? { replyTo: email } : {}) };
}

async function deliver(item) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.VERCEL_ENV === "production") throw new Error("Email delivery is not configured");
    outbox.push(item);
    console.info(`Feedback (not sent, no email set up):\n${item.subject}\n\n${item.text}\n`);
    if (process.env.FEEDBACK_OUTBOX) appendFileSync(process.env.FEEDBACK_OUTBOX, `${JSON.stringify(item)}\n`);
    return;
  }
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [TO()], subject: item.subject, text: item.text, ...(item.replyTo ? { reply_to: item.replyTo } : {}) }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!sent.ok) throw new Error(`Resend answered with status ${sent.status}`);
}

// ── Handlers ───────────────────────────────────────────────────────────────────────────────────

/** A ticket for the form that just opened. */
export async function GET() {
  const key = signingKey();
  if (!key) return refuse(503, "paused", SAY.paused);
  return reply(200, { ticket: sign(key, { at: Date.now(), id: randomBytes(9).toString("base64url") }), wait: MIN_SECONDS });
}

export async function POST(request) {
  try {
    return await receive(request);
  } catch (error) {
    console.error("Feedback failed:", error instanceof Error ? error.message : "Unknown error");
    return refuse(503, "paused", SAY.paused);
  }
}

async function receive(request) {
  const now = Date.now();
  const key = signingKey();
  if (!key) return refuse(503, "paused", SAY.paused);

  const origin = request.headers.get("origin") ?? "";
  if (!originAllowed(origin)) return refuse(403, "origin", SAY.origin);

  // Every try counts against the address, sent or not, so a flood stops here before any work.
  const address = createHmac("sha256", key).update(clientAddress(request)).digest("base64url");
  const perAddress = room(`address:${address}`, ADDRESS, now);
  if (!perAddress.ok) return refuse(429, "many", SAY.many(perAddress.minutes), { "Retry-After": String(perAddress.minutes * 60) });
  note(`address:${address}`, now);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) return refuse(413, "message", SAY.message);
  if (!String(request.headers.get("content-type") ?? "").includes("application/json")) return refuse(415, "message", SAY.message);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return refuse(413, "message", SAY.message);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return refuse(400, "message", SAY.message);
  }
  if (!data || typeof data !== "object") return refuse(400, "message", SAY.message);

  // The hidden field: people never see it, form-filling scripts fill it. They're told it went.
  if (typeof data.website === "string" && data.website.trim()) {
    console.info("Feedback dropped: the hidden field was filled.");
    return reply(200, { ok: true });
  }

  // The visitor's own quota, in the cookie: { from, count, last } where last is the latest message.
  const quota = unsign(key, readCookie(request, COOKIE));
  const fresh = !quota || typeof quota.from !== "number" || now - quota.from >= VISITOR.window;
  const visitor = fresh ? { from: now, count: 0, last: "" } : quota;
  if (visitor.count >= VISITOR.count) {
    const minutes = Math.max(1, Math.ceil((visitor.from + VISITOR.window - now) / 60_000));
    return refuse(429, "many", SAY.plenty(minutes), { "Retry-After": String(minutes * 60) });
  }
  const everyone = room("everyone", EVERYONE, now);
  if (!everyone.ok) return refuse(429, "many", SAY.many(everyone.minutes), { "Retry-After": String(everyone.minutes * 60) });

  const ticket = unsign(key, data.ticket);
  if (!ticket || typeof ticket.at !== "number" || typeof ticket.id !== "string" || now - ticket.at > MAX_TICKET_AGE) {
    return refuse(400, "ticket", SAY.ticket);
  }
  if (now - ticket.at < MIN_SECONDS * 1000) return refuse(400, "fast", SAY.fast);

  const read = readMessage(data);
  if (read.error) return refuse(400, read.code, read.error);
  const print = fingerprint(read.message);
  if (print === visitor.last) return refuse(409, "again", SAY.again);

  if (!(await verifyTurnstile(data.token, request, clientAddress(request)))) return refuse(400, "check", SAY.check);
  if (!spend(ticket.id, now)) return refuse(400, "ticket", SAY.ticket);

  await deliver(compose(read, now));
  note("everyone", now);
  const next = sign(key, { from: visitor.from, count: visitor.count + 1, last: print });
  return reply(200, { ok: true }, { "Set-Cookie": cookieHeader(request, next) });
}
