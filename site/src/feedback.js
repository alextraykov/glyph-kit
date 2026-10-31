// Feedback: the speech-bubble button in the header and the link in the footer open one dialog. The
// message goes to a function on traykov.cc, which emails it to Alexander. The anti-spam check loads
// the first time the dialog opens, so pages that never open it never load it.
const dialog = document.querySelector("[data-feedback-dialog]");
const form = dialog?.querySelector("[data-feedback-form]");

if (dialog && form) {
  const status = form.querySelector("[data-feedback-status]");
  const sendButton = form.querySelector("[data-feedback-send]");
  const message = form.elements.namedItem("message");
  const email = form.elements.namedItem("email");
  const checkBox = form.querySelector("[data-feedback-check]");
  const siteKey = form.dataset.sitekey;
  let widget = null;
  let checkFailed = false;
  let opener = null;

  const say = (text, tone) => {
    status.textContent = text;
    if (tone) status.dataset.tone = tone;
    else delete status.dataset.tone;
  };

  // The home page already loads Cloudflare's script for the builder; other pages load it here.
  const loadCheck = () => {
    if (!siteKey || widget !== null || checkFailed) return;
    widget = "loading";
    if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onerror = () => { checkFailed = true; };
      document.head.append(script);
    }
    const render = (tries = 0) => {
      const turnstile = Reflect.get(window, "turnstile");
      if (turnstile?.render) {
        try {
          widget = turnstile.render(checkBox, {
            sitekey: siteKey,
            action: "glyph-kit-feedback",
            appearance: "interaction-only",
            theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
            // The box stays folded away unless Cloudflare needs a click. A failed check leaves an
            // empty frame behind, so it stays folded and the server answers.
            "before-interactive-callback": () => { checkBox.dataset.asking = ""; },
            "after-interactive-callback": () => { delete checkBox.dataset.asking; },
            "error-callback": () => { checkFailed = true; delete checkBox.dataset.asking; },
          });
        } catch { checkFailed = true; }
      } else if (tries < 50 && !checkFailed) setTimeout(() => render(tries + 1), 200);
      else checkFailed = true;
    };
    render();
  };
  const token = () => {
    const turnstile = Reflect.get(window, "turnstile");
    try { return typeof widget === "string" && widget !== "loading" ? String(turnstile?.getResponse(widget) ?? "") : ""; } catch { return ""; }
  };
  // The check runs in the background, so a quick send can beat it. Wait for its token, up to 8 s;
  // past that, or if it failed, send anyway and let the server say what went wrong.
  const checked = async () => {
    for (let waited = 0; siteKey && !checkFailed && !token() && waited < 8000; waited += 200) await new Promise((r) => setTimeout(r, 200));
    return token();
  };

  const open = (from) => {
    opener = from;
    delete form.dataset.state;
    say("");
    dialog.showModal();
    message.focus();
    loadCheck();
  };
  const close = () => dialog.close();
  dialog.addEventListener("close", () => {
    if (form.dataset.state === "sent") form.reset();
    opener?.focus();
  });
  // A click on the dim page around the dialog closes it, like Escape.
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest("[data-feedback]");
    if (trigger) open(trigger);
    else if (target?.closest("[data-feedback-close]")) close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!message.value.trim()) {
      say("Write a message first.", "problem");
      message.focus();
      return;
    }
    if (!email.checkValidity()) {
      say("Check the email address, or leave it empty.", "problem");
      email.focus();
      return;
    }
    sendButton.disabled = true;
    say("Sending…");
    try {
      const reply = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          message: message.value,
          email: email.value,
          website: form.elements.namedItem("website").value,
          page: location.pathname,
          "cf-turnstile-response": await checked(),
        }),
      });
      const data = await reply.json().catch(() => ({}));
      if (!reply.ok) throw new Error(data.error || "Feedback couldn't be sent just now. Try again, or email hi@traykov.cc.");
      form.dataset.state = "sent";
      say("Sent. Thank you.", "good");
      form.querySelector(".feedback__done [data-feedback-close]").focus();
    } catch (error) {
      say(error instanceof TypeError ? "Feedback couldn't be sent just now. Try again, or email hi@traykov.cc." : error.message, "problem");
    } finally {
      sendButton.disabled = false;
      const turnstile = Reflect.get(window, "turnstile");
      if (typeof widget === "string" && widget !== "loading") try { turnstile?.reset(widget); } catch {}
    }
  });
}
