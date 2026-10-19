import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { GET, MAX_MESSAGE, MIN_SECONDS, POST, compose, outbox, resetLimits } from "../api/feedback.mjs";

// Local rules: no keys, so the bot check passes and messages land in the outbox.
delete process.env.VERCEL_ENV;
delete process.env.TURNSTILE_SECRET_KEY;
delete process.env.RESEND_API_KEY;

const ORIGIN = "https://glyph-kit.traykov.cc";
const ticket = async () => (await (await GET()).json()).ticket;
const post = (body, { ip = "192.0.2.1", cookie, origin = ORIGIN } = {}) =>
  POST(new Request(`${ORIGIN}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "X-Real-IP": ip, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ page: `${ORIGIN}/kinds/`, token: "t", ...body }),
  }));
const read = async (response) => ({ status: response.status, ...(await response.json()), cookie: response.headers.get("set-cookie")?.split(";")[0] });

/** A ticket from a form opened long enough ago. */
async function opened() {
  const t = await ticket();
  mock.timers.tick(MIN_SECONDS * 1000 + 1);
  return t;
}

test.beforeEach(() => {
  resetLimits();
  mock.method(console, "info", () => {});
  outbox.length = 0;
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-19T14:03:00Z") });
});
test.afterEach(() => (mock.timers.reset(), mock.restoreAll()));

test("feedback arrives as one readable item, with the page and the time", async () => {
  const r = await read(await post({ message: "The Data tab could show units.", email: "a@example.com", ticket: await opened() }));
  assert.equal(r.status, 200);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].subject, "Glyph kit feedback: The Data tab could show units.");
  assert.equal(outbox[0].replyTo, "a@example.com");
  assert.match(outbox[0].text, /^The Data tab could show units\.\n/u);
  assert.match(outbox[0].text, /Page {3}https:\/\/glyph-kit\.traykov\.cc\/kinds\//u);
  assert.match(outbox[0].text, /Sent {3}.*19 Oct 2026, 14:03 UTC/u);
});

test("a send right after the form opens is refused, and works after the wait", async () => {
  const t = await ticket();
  assert.equal((await read(await post({ message: "Too quick", ticket: t }))).code, "fast");
  mock.timers.tick(MIN_SECONDS * 1000 + 1);
  assert.equal((await read(await post({ message: "Too quick", ticket: t }))).status, 200);
});

test("the hidden field drops the message but says it went", async () => {
  const r = await read(await post({ message: "Cheap pills", website: "http://spam.example", ticket: await opened() }));
  assert.equal(r.status, 200);
  assert.equal(outbox.length, 0);
});

test("a flood from one address is refused with a sentence", async () => {
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await read(await post({ message: `Flood ${i}`, ticket: await ticket() }, { ip: "203.0.113.7" }))).status);
  assert.deepEqual(codes.slice(-4), [429, 429, 429, 429]);
  const r = await read(await post({ message: "One more", ticket: await opened() }, { ip: "203.0.113.7" }));
  assert.match(r.error, /^That's a lot of messages at once\. Try again in \d+ minutes?\.$/u);
  assert.equal(outbox.length, 0);
});

test("one visitor gets three in fifteen minutes, from any address", async () => {
  let cookie;
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    const r = await read(await post({ message: `Note ${i}`, ticket: await opened() }, { ip: `198.51.100.${i}`, cookie }));
    cookie = r.cookie ?? cookie;
    statuses.push(r.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  mock.timers.tick(15 * 60_000);
  assert.equal((await read(await post({ message: "Later", ticket: await opened() }, { ip: "198.51.100.9", cookie }))).status, 200);
});

test("limits on what a message holds", async () => {
  const code = async (body, opts) => (await read(await post({ ticket: await opened(), ...body }, opts))).code;
  assert.equal(await code({ message: "a".repeat(MAX_MESSAGE + 1) }), "message");
  assert.equal(await code({ message: "hi" }), "message");
  assert.equal(await code({ message: "bell \u0007 here" }), "message");
  assert.equal(await code({ message: "https://a.co https://b.co https://c.co https://d.co" }), "links");
  assert.equal(await code({ message: "Hello", email: "nope" }), "email");
  assert.equal(await code({ message: "Hello", token: "" }, { ip: "192.0.2.9" }), undefined, "no keys: the check is skipped locally");
  assert.equal(await code({ message: "Hello", ticket: "made.up" }), "ticket");
  assert.equal(await code({ message: "Hello" }, { origin: "https://elsewhere.example" }), "origin");
});

test("one ticket sends once, and the same message twice is caught", async () => {
  const t = await opened();
  const first = await read(await post({ message: "Only once", ticket: t }));
  assert.equal((await read(await post({ message: "Something new", ticket: t }, { ip: "192.0.2.2" }))).code, "ticket");
  assert.equal((await read(await post({ message: "only  once", ticket: await opened() }, { cookie: first.cookie }))).code, "again");
});

test("a page from elsewhere is noted as not known", () => {
  assert.match(compose({ message: "Hi", email: "", page: "Not known" }, Date.now()).text, /Email {2}Not given/u);
});

test("production without keys says it's paused instead of failing", async () => {
  process.env.VERCEL_ENV = "production";
  try {
    const r = await read(await GET());
    assert.equal(r.status, 503);
    assert.match(r.error, /^Feedback can't be sent right now\./u);
  } finally {
    delete process.env.VERCEL_ENV;
  }
});
