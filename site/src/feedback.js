// Feedback: a short form in a dialog, opened from the footer. It asks the server for a ticket when it
// opens (the time it opened, signed) and runs the one bot check only when Send is pressed. Nothing
// about it loads or runs until someone opens it.
const dialog = document.querySelector("[data-feedback]");
const openers = document.querySelectorAll("[data-feedback-open]");

if (dialog && typeof dialog.showModal === "function") {
  const form = dialog.querySelector("form");
  const message = form.elements.namedItem("message");
  const email = form.elements.namedItem("email");
  const trap = form.elements.namedItem("website");
  const send = form.querySelector("[data-feedback-send]");
  const status = form.querySelector("[data-feedback-status]");
  const count = form.querySelector("[data-feedback-count]");
  const pageOut = form.querySelector("[data-feedback-page]");
  const checkBox = form.querySelector("[data-feedback-check]");
  const done = dialog.querySelector("[data-feedback-done]");
  const max = Number(message.maxLength) || 2000;
  // On traykov.cc the site sits under /glyph-kit and passes this path through; elsewhere it's at /api.
  const endpoint = /^(www\.)?traykov\.cc$/.test(location.hostname) ? "/glyph-kit/api/feedback" : dialog.dataset.endpoint;
  const SAY = {
    message: `Write a message, up to ${max.toLocaleString("en")} characters.`,
    email: "Check the email, or leave it empty.",
    offline: "It didn't send. Check your connection and press Send again.",
    check: "The spam check didn't load. Press Send again, or email hi@traykov.cc.",
  };

  let ticket = null;
  let wait = 3;
  let openedAt = 0;
  let sending = false;

  const say = (text, state) => {
    status.textContent = text;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };
  const mark = (field, bad) => (bad ? field.setAttribute("aria-invalid", "true") : field.removeAttribute("aria-invalid"));

  const getTicket = async () => {
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      ticket = data.ticket;
      wait = Number(data.wait) || 3;
      openedAt = Date.now();
    } catch {
      ticket = null;
    }
  };

  // The bot check: Cloudflare Turnstile, loaded when the form opens and run only on Send. It stays
  // invisible unless Cloudflare wants a click, and then it shows in the form.
  let turnstileLoading;
  const loadTurnstile = () =>
    (turnstileLoading ??= new Promise((resolve, reject) => {
      const ready = () => Reflect.get(window, "turnstile");
      if (ready()) return resolve(ready());
      // The Builder's page loads it already; wait for that copy instead of loading a second.
      if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.append(script);
      }
      const started = Date.now();
      const poll = setInterval(() => {
        if (ready()) (clearInterval(poll), resolve(ready()));
        else if (Date.now() - started > 15_000) (clearInterval(poll), (turnstileLoading = undefined), reject(new Error("Turnstile didn't load")));
      }, 100);
    }));

  const runCheck = async () => {
    const turnstile = await loadTurnstile();
    return new Promise((resolve, reject) => {
      checkBox.replaceChildren();
      let id;
      const finish = (fn, value) => {
        clearTimeout(timer);
        try { turnstile.remove(id); } catch {}
        checkBox.hidden = true;
        fn(value);
      };
      // A minute, in case Cloudflare asks for a click.
      const timer = setTimeout(() => finish(reject, new Error("timeout")), 60_000);
      id = turnstile.render(checkBox, {
        sitekey: dialog.dataset.sitekey,
        action: "feedback",
        execution: "execute",
        appearance: "interaction-only",
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        callback: (token) => finish(resolve, token),
        "error-callback": () => finish(reject, new Error("check failed")),
        "before-interactive-callback": () => {
          checkBox.hidden = false;
          say("One more step: tick the box.");
        },
      });
      turnstile.execute(checkBox);
    });
  };

  const showCount = () => {
    const left = max - [...message.value].length;
    count.textContent = left <= 200 ? `${left.toLocaleString("en")} left` : "";
  };

  const reset = () => {
    form.reset();
    form.hidden = false;
    done.hidden = true;
    delete dialog.dataset.sent;
    say("");
    showCount();
    [message, email].forEach((f) => mark(f, false));
  };

  const open = () => {
    if (!done.hidden) reset();
    const path = location.pathname.replace(/^\/glyph-kit(?=\/|$)/, "") || "/";
    pageOut.textContent = path === "/" ? "Home" : path;
    dialog.showModal();
    message.focus();
    getTicket();
    loadTurnstile().catch(() => {});
  };

  openers.forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", open);
  });
  dialog.querySelectorAll("[data-feedback-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
  // A click on the shade around the form closes it; what's typed stays for next time.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  message.addEventListener("input", () => (showCount(), mark(message, false)));
  email.addEventListener("input", () => mark(email, false));
  message.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) form.requestSubmit();
  });

  const post = (token) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        message: message.value,
        email: email.value,
        page: `${location.origin}${location.pathname}`,
        website: trap.value,
        ticket,
        token,
      }),
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const text = message.value.trim();
    if (text.length < 3 || [...text].length > max) {
      mark(message, true);
      say(SAY.message, "error");
      return message.focus();
    }
    if (email.value.trim() && !email.checkValidity()) {
      mark(email, true);
      say(SAY.email, "error");
      return email.focus();
    }
    sending = true;
    send.disabled = true;
    say("Sending…");
    try {
      if (!ticket) await getTicket();
      // Someone quick still waits out the minimum here, quietly, instead of being refused.
      const early = openedAt + wait * 1000 + 200 - Date.now();
      if (early > 0) await new Promise((r) => setTimeout(r, early));
      let token;
      try {
        token = await runCheck();
      } catch {
        return say(SAY.check, "error");
      }
      say("Sending…");
      const response = await post(token);
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        ticket = null;
        form.hidden = true;
        done.hidden = false;
        dialog.dataset.sent = "";
        done.querySelector("button").focus();
        return;
      }
      // A stale ticket gets a fresh one for the next press.
      if (data.code === "ticket" || data.code === "fast") await getTicket();
      if (data.code === "message" || data.code === "links") mark(message, true);
      if (data.code === "email") mark(email, true);
      say(data.error || SAY.offline, "error");
    } catch {
      say(SAY.offline, "error");
    } finally {
      sending = false;
      send.disabled = false;
    }
  });
}
