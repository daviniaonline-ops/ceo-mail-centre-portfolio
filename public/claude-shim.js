/*
 * claude-shim.js
 *
 * Inside claude.ai the Claude viewer gives the page `window.claude`: a shared
 * database (db), the viewer's identity (user), Claude drafting (sample) and
 * Claude's browser pane (mcp). This shim stands in for it everywhere else.
 *
 * Three modes:
 *
 *   1. Inside claude.ai   -> the real window.claude exists; this file does nothing.
 *   2. Local server       -> on localhost with `npm start`. Drafting goes through
 *                            server.js to the Anthropic API when ANTHROPIC_API_KEY
 *                            is set. Records are saved in this browser.
 *   3. Portfolio demo     -> any other host (Netlify, GitHub Pages), a file:// open,
 *                            or ?demo=1. Loads fictional sample people and simulates
 *                            Claude's replies. No API key, no server, nothing sent
 *                            anywhere. Add ?demo=0 to turn it off.
 *
 * Not available outside claude.ai in any mode: the shared database and
 * "Sync new activity" (it needs the Claude desktop app's browser).
 */
(function () {
  "use strict";
  if (window.claude && typeof window.claude.use === "function") return;

  const LS_KEY = "ceo-mail-centre-v1";
  const SEED_KEY = "ceo-mail-centre-demo-seeded";
  const qs = new URLSearchParams(location.search);
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const DEMO = qs.get("demo") === "1" || (qs.get("demo") !== "0" && (location.protocol === "file:" || !isLocal));

  /* ------------------------------------------------------------------ */
  /* Demo data: fictional people only. Seeded once, before the app loads. */
  /* ------------------------------------------------------------------ */
  function demoItems() {
    const now = Date.now(), D = 86400000, H = 3600000;
    const hub = "https://buildfromabroad.com/join?offer=starter-hub";
    const welcome = (n) => `Hi ${n}, thanks for following Build From Abroad 😊 We share practical, honest tips for starting or running a business in Nigeria from abroad, plus six free classes here: ${hub}\n\nQuick question so I can point you to the right thing: are you exploring an idea, already running something, or just curious for now?`;
    const ex = { example: true, source: "sync", goal: "auto", draft: "", notes: "" };
    return [
      Object.assign({}, ex, { id: "demo-1", brand: "bfa", platform: "instagram", type: "dm", name: "Tolu Adeyemi", handle: "@tolu.builds", status: "replied", touches: 1, createdAt: now - 2 * D,
        message: "Thank you! I'm in Leeds and want to open a small bakery in Ibadan, but I don't know who to trust with the money.",
        history: [{ from: "me", text: welcome("Tolu"), at: now - 2 * D }, { from: "them", text: "Thank you! I'm in Leeds and want to open a small bakery in Ibadan, but I don't know who to trust with the money.", at: now - 20 * H }] }),
      Object.assign({}, ex, { id: "demo-2", brand: "bfa", platform: "threads", type: "comment", name: "Chidi Okafor", handle: "@chidi.ok", status: "new", touches: 0, createdAt: now - 5 * H,
        message: "Is it better to register the company before testing the idea, or test first?", history: [{ from: "them", text: "Is it better to register the company before testing the idea, or test first?", at: now - 5 * H }] }),
      Object.assign({}, ex, { id: "demo-3", brand: "cb", platform: "linkedin", type: "comment", name: "Sarah Mensah", handle: "in/sarah-mensah", status: "new", touches: 0, createdAt: now - 8 * H,
        message: "Huge difference on that redesign. Our accountancy site still looks like 2012.", history: [{ from: "them", text: "Huge difference on that redesign. Our accountancy site still looks like 2012.", at: now - 8 * H }] }),
      Object.assign({}, ex, { id: "demo-4", brand: "bfa", platform: "tiktok", type: "follower", name: "Funmi Bello", handle: "@funmi.bello", status: "new", touches: 0, createdAt: now - 3 * H, message: "", history: [] }),
      Object.assign({}, ex, { id: "demo-5", brand: "bfa", platform: "facebook", type: "invite", name: "Emeka Nwosu", handle: "", status: "new", touches: 0, createdAt: now - 6 * H, message: "", history: [] }),
      Object.assign({}, ex, { id: "demo-6", brand: "bfa", platform: "linkedin", type: "invite", name: "Kunle Dada", handle: "in/kunle-dada", status: "sent", touches: 1, followUps: 0, createdAt: now - 4 * D, lastContactAt: now - 4 * D, nextFollowUpAt: now - D, message: "",
        lastOutbound: "Thanks for connecting, Kunle. I run Build From Abroad, which helps people in the diaspora test and run businesses in Nigeria without the expensive mistakes.",
        history: [{ from: "me", text: "Thanks for connecting, Kunle. I run Build From Abroad, which helps people in the diaspora test and run businesses in Nigeria without the expensive mistakes.", at: now - 4 * D }] }),
      Object.assign({}, ex, { id: "demo-7", brand: "bfa", platform: "instagram", type: "follower", name: "Ada Eze", handle: "@ada.eze", status: "sent", touches: 1, followUps: 0, createdAt: now - D, lastContactAt: now - D, nextFollowUpAt: now + 2 * D, message: "",
        lastOutbound: welcome("Ada"), history: [{ from: "me", text: welcome("Ada"), at: now - D }] }),
      Object.assign({}, ex, { id: "demo-8", brand: "bfa", platform: "x", type: "comment", name: "Bisi Lawal", handle: "@bisilawal", status: "sent", touches: 2, followUps: 1, createdAt: now - 6 * D, lastContactAt: now - 2 * D, nextFollowUpAt: now + 2 * D, message: "Great thread! Saving this.",
        history: [{ from: "them", text: "Great thread! Saving this.", at: now - 6 * D }, { from: "me", text: "Thanks Bisi! Are you building something in Nigeria yourself?", at: now - 5 * D }, { from: "me", text: "Hi Bisi, just floating this back up in case it got buried. Where are you at with things at the moment?", at: now - 2 * D }] }),
      Object.assign({}, ex, { id: "demo-9", brand: "bfa", platform: "instagram", type: "dm", name: "Ngozi Obi", handle: "@ngozi.obi", status: "converted", touches: 3, createdAt: now - 9 * D, lastContactAt: now - 3 * D, convertedAt: now - 2 * H, message: "Booked the call for Thursday, thank you!",
        history: [{ from: "them", text: "How do I check a supplier in Lagos before paying?", at: now - 9 * D }, { from: "me", text: "Great question, Ngozi. Ask for two past customers you can call, and pay a small first order before anything big. Want to go through it on a quick call?", at: now - 8 * D }, { from: "them", text: "Booked the call for Thursday, thank you!", at: now - 3 * D }] }),
    ];
  }

  function seedDemo(force) {
    try {
      if (!force && localStorage.getItem(SEED_KEY)) return;
      const cur = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!force && cur && Array.isArray(cur.items) && cur.items.length) { localStorage.setItem(SEED_KEY, "1"); return; }
      localStorage.setItem(LS_KEY, JSON.stringify({ items: demoItems() }));
      localStorage.setItem(SEED_KEY, "1");
    } catch (_) { /* storage blocked: the app still runs, just empty */ }
  }
  if (DEMO) seedDemo(false);

  /* ------------------------------------------------------------------ */
  /* Simulated Claude for the demo                                       */
  /* ------------------------------------------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (re, s) => { const m = re.exec(s); return m ? m[1].trim() : ""; };
  const first = (n) => (String(n || "").replace(/^@/, "").split(/[\s._]+/)[0] || "there").replace(/^\w/, (c) => c.toUpperCase());

  function demoExtract(prompt) {
    const allowed = pick(/Allowed platforms: ([^\n(]+)/, prompt).split(",").map((s) => s.trim()).filter(Boolean);
    const platform = allowed[0] || "instagram";
    const page = pick(/PAGE TEXT:\n"""\n([\s\S]*?)\n"""/, prompt);
    if (/log in|sign in to continue|create an account/i.test(page) && page.length < 400) return { signedIn: false, items: [] };
    const items = [];
    for (const raw of page.split(/\n+/)) {
      const line = raw.trim().replace(/\s+\d+[smhdw]$/, "");
      if (!line || line.length < 4) continue;
      let m;
      const spam = /check it out|sent you a message|check your dm|forex|investment testimony/i.test(line);
      if ((m = /^@?([\w.\- ]+?)\s+(?:started following you|followed you)/i.exec(line))) items.push({ name: m[1], handle: "@" + m[1].replace(/\s+/g, ""), platform, type: "follower", message: "", spam });
      else if ((m = /^@?([\w.\- ]+?)\s+accepted your (?:invitation|connection)/i.exec(line))) items.push({ name: m[1], handle: "", platform, type: "invite", message: "", spam });
      else if ((m = /^@?([\w.\- ]+?)\s+(?:commented|replied)[^:]*:\s*(.+)$/i.exec(line))) items.push({ name: m[1], handle: "@" + m[1].replace(/\s+/g, ""), platform, type: "comment", message: m[2], spam });
      else if ((m = /^@?([\w.\-]+(?: [\w.\-]+)?):\s+(.+)$/.exec(line)) && !/^(notifications|messages|today|yesterday)$/i.test(m[1])) items.push({ name: m[1], handle: "@" + m[1].replace(/\s+/g, ""), platform, type: "dm", message: m[2], spam });
    }
    return { signedIn: true, account: "", items: items.slice(0, 60) };
  }

  function demoDraft(prompt) {
    const name = first(pick(/Name: (.+?)\s{2}Handle:/, prompt) || pick(/Name: ([^\n]+)/, prompt));
    const instr = pick(/Her instruction \(top priority\): ([^\n]+)/, prompt);
    const convo = pick(/CONVERSATION SO FAR[^\n]*\n([\s\S]*?)\n+EXTRA CONTEXT/, prompt);
    const theirLast = (convo.split("\n").filter((l) => l.startsWith("Them: ")).pop() || "").slice(6) || pick(/Their latest words: ([^\n]+)/, prompt);
    const isFollowUp = /Write follow-up 1|final follow-up/i.test(prompt);
    const isFinal = /final follow-up/i.test(prompt);
    const isFirstFollow = /They just followed/i.test(prompt);
    const isInvite = /accepted Davinia's connection or follow invitation/i.test(prompt);
    const isCB = /Conceptbox Consulting is Davinia's boutique studio/.test(prompt);
    let d;
    if (isFinal) d = `Last nudge from me, ${name}. If now isn't the right time, no problem at all. The door's open whenever you need it. Wishing you well.`;
    else if (isFollowUp) d = `Hi ${name}, just floating this back up in case it got buried. Where are you at with things at the moment?`;
    else if (isFirstFollow || isInvite) d = `Hi ${name}, ${isInvite ? "thanks for accepting" : "thanks for following"} ${isCB ? "Conceptbox" : "Build From Abroad"} 😊 ${isCB ? "If you ever want a second pair of eyes on your website, send me your homepage and I'll come back with one specific improvement." : "We share practical, honest tips for starting or running a business in Nigeria from abroad, plus six free classes here: https://buildfromabroad.com/join?offer=starter-hub"}\n\nQuick question so I can point you to the right thing: are you exploring an idea, already running something, or just curious for now?`;
    else if (/trust|money|scam|brother|family/i.test(theirLast)) d = `That's a very real worry, ${name}, and a smart one to have before any money moves. A simple rule that helps: never send the full amount at once. Pay in small stages, and ask for photos or receipts before each one.\n\nWho would be running it day to day, family or someone you'd hire?`;
    else if (/register|company|cac/i.test(theirLast)) d = `Test first, ${name}. A few real paying customers will tell you more than a registration certificate. Register once the numbers look like they'll hold, so you're not paying fees on an idea that might change.\n\nWhat's the idea you're thinking of testing?`;
    else if (isCB && /site|website|redesign/i.test(theirLast)) d = `Ha, you're not alone, ${name}. Most firms I speak to are in the same spot. If it helps, send me your homepage link and I'll reply with one specific, practical improvement. No charge, no call.`;
    else if (/\?/.test(theirLast)) d = `Good question, ${name}. The short version: start smaller than feels comfortable and test with a handful of real customers before committing serious money.\n\nWhat are you thinking of building?`;
    else d = `Thanks ${name}, really appreciate you sharing that. What's the one thing that would help you most right now?`;
    if (instr) d += `\n\n(Demo: your instruction was "${instr}". The live version writes the reply around it.)`;
    return { draft: d, transcript: "" };
  }

  async function demoSample(input, opts) {
    opts = opts || {};
    const prompt = typeof input === "string" ? input : (input && input.length ? input[input.length - 1].content : "");
    await wait(700 + Math.random() * 500);
    let out;
    if (/extract social media activity/i.test(prompt)) out = demoExtract(prompt);
    else if (/You are drafting the next message/i.test(prompt)) out = demoDraft(prompt);
    else out = { draft: "This is the portfolio demo, so Claude's reply is simulated here." };
    const text = JSON.stringify(out);
    if (typeof opts.onText === "function") { try { opts.onText({ text, delta: text }); } catch (_) {} }
    return { text, truncated: false };
  }

  /* ------------------------------------------------------------------ */
  /* Real Claude through the local server                                */
  /* ------------------------------------------------------------------ */
  let statusPromise = null;
  function status() {
    if (DEMO) return Promise.resolve({ drafting: true, demo: true });
    if (!statusPromise) {
      statusPromise = fetch("/api/status", { headers: { accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : { drafting: false }))
        .catch(() => ({ drafting: false }));
    }
    return statusPromise;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  async function serverSample(input, opts) {
    opts = opts || {};
    const images = [];
    for (const img of opts.images || []) images.push({ media_type: img.type || "image/png", data: await blobToBase64(img) });
    const res = await fetch("/api/sample", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, images, modelTier: opts.modelTier || "default" }),
      signal: opts.signal,
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      const e = new Error((body && body.error) || "Drafting failed (" + res.status + ")");
      e.code = res.status === 429 ? "rate_limited" : res.status === 401 || res.status === 403 ? "not_granted" : "upstream_error";
      throw e;
    }
    const text = (body && body.text) || "";
    if (typeof opts.onText === "function") { try { opts.onText({ text, delta: text }); } catch (_) {} }
    return { text, truncated: !!(body && body.truncated) };
  }

  function parseJsonLoose(text) {
    const t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(t); } catch (_) {}
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw Object.assign(new Error("Claude did not return JSON"), { code: "transform_error" });
  }

  const sample = DEMO ? demoSample : serverSample;
  sample.json = async (input, opts) => parseJsonLoose((await sample(input, opts)).text);
  sample.limits = async () => ({
    maxPromptBytes: 262144,
    images: { maxCount: 4, maxInputBytes: 5 * 1024 * 1024, mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
  });

  window.claude = Object.freeze({
    use: async function (name) {
      if (name !== "sample") return null;
      const s = await status();
      return s.drafting ? sample : null;
    },
  });

  /* ------------------------------------------------------------------ */
  /* Demo banner                                                          */
  /* ------------------------------------------------------------------ */
  if (DEMO) {
    const css = `#storeNotice{display:none!important}
#demoBar{background:var(--surface-2,#ECEEF8);color:var(--fg,#10153F);border-bottom:1px solid var(--line,#D9DCEC);font:500 13px/1.45 var(--f-body,system-ui,sans-serif)}
#demoBar .in{max-width:1100px;margin:0 auto;padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#demoBar b{font-weight:800}
#demoBar .sp{flex:1}
#demoBar button{font:inherit;font-weight:700;border:1px solid var(--line,#D9DCEC);background:var(--surface,#fff);color:inherit;border-radius:8px;padding:5px 10px;cursor:pointer}
#demoBar button:focus-visible{outline:2px solid var(--pink,#E85991);outline-offset:2px}`;
    document.addEventListener("DOMContentLoaded", function () {
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      const bar = document.createElement("div"); bar.id = "demoBar"; bar.setAttribute("role", "note");
      bar.innerHTML = '<div class="in"><span><b>Portfolio demo.</b> Sample people and simulated Claude replies. Nothing is sent anywhere, and your changes stay in this browser.</span><span class="sp"></span><button type="button" id="demoReset">Reset demo</button></div>';
      document.body.insertBefore(bar, document.body.firstChild);
      document.getElementById("demoReset").addEventListener("click", function () { seedDemo(true); location.reload(); });
    });
  }
})();
