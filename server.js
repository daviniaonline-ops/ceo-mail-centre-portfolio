#!/usr/bin/env node
/*
 * CEO Mail Centre: local server (Node 18+, no npm dependencies).
 *
 *   - Serves public/index.html with public/claude-shim.js injected.
 *   - Optionally forwards "Draft with Claude" requests to the Anthropic API,
 *     using ANTHROPIC_API_KEY from .env. The key stays on the server and is
 *     never sent to the browser.
 *
 * Run:  npm start   (then open http://localhost:3000)
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

/* ---------- tiny .env loader (no dependency) ---------- */
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const API_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();
const KEY_SET = API_KEY && !/^your[-_]/i.test(API_KEY) && !API_KEY.includes("placeholder");
const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MODEL_COMPLEX = process.env.ANTHROPIC_MODEL_COMPLEX || MODEL_DEFAULT;
const MODEL_QUICK = process.env.ANTHROPIC_MODEL_QUICK || MODEL_DEFAULT;
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 2000);
const MAX_BODY = 25 * 1024 * 1024;

const PUBLIC = path.join(__dirname, "public");
const SHIM_TAG = '<script src="/claude-shim.js"></script>';

function send(res, status, type, body) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, "application/json; charset=utf-8", JSON.stringify(obj));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("Request too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function indexHtml() {
  const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
  // Load the shim before the app's own script.
  if (html.includes("claude-shim.js")) return html; // already loaded by the page
  return html.includes("</head>") ? html.replace("</head>", SHIM_TAG + "</head>") : SHIM_TAG + html;
}

/* ---------- Anthropic Messages API ---------- */
function toMessages(input, images) {
  const imgBlocks = (images || [])
    .filter((i) => i && i.data && /^image\/(png|jpeg|webp|gif)$/.test(i.media_type))
    .slice(0, 4)
    .map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } }));

  if (typeof input === "string") {
    return [{ role: "user", content: [...imgBlocks, { type: "text", text: input }] }];
  }
  if (Array.isArray(input) && input.length) {
    const msgs = input
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));
    const last = msgs[msgs.length - 1];
    if (last && last.role === "user" && imgBlocks.length) last.content = [...imgBlocks, { type: "text", text: last.content }];
    return msgs;
  }
  throw Object.assign(new Error("input must be a string or a list of messages"), { status: 400 });
}

async function callClaude({ input, images, modelTier }) {
  const model = modelTier === "complex" ? MODEL_COMPLEX : modelTier === "quick" ? MODEL_QUICK : MODEL_DEFAULT;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: toMessages(input, images) }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || "Anthropic API error " + r.status;
    throw Object.assign(new Error(msg), { status: r.status === 401 ? 401 : r.status === 429 ? 429 : 502 });
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, truncated: data.stop_reason === "max_tokens" };
}

/* ---------- routes ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, "text/html; charset=utf-8", indexHtml());
    }
    if (req.method === "GET" && url.pathname === "/claude-shim.js") {
      return send(res, 200, "text/javascript; charset=utf-8", fs.readFileSync(path.join(PUBLIC, "claude-shim.js")));
    }
    if (req.method === "GET" && url.pathname === "/api/status") {
      return json(res, 200, { drafting: Boolean(KEY_SET) });
    }
    if (req.method === "POST" && url.pathname === "/api/sample") {
      if (!KEY_SET) return json(res, 403, { error: "Drafting is off. Add ANTHROPIC_API_KEY to .env and restart." });
      const body = JSON.parse((await readBody(req)) || "{}");
      return json(res, 200, await callClaude(body));
    }
    return send(res, 404, "text/plain; charset=utf-8", "Not found");
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error("[error]", e.message);
    return json(res, status, { error: e.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`CEO Mail Centre running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(KEY_SET
    ? `Draft with Claude: ON (model ${MODEL_DEFAULT}, complex ${MODEL_COMPLEX})`
    : "Draft with Claude: OFF (add ANTHROPIC_API_KEY to .env to turn it on). Templates still work.");
  console.log("Records are saved in your browser on this device only.");
});
