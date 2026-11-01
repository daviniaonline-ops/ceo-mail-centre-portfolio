#!/usr/bin/env node
// Checks that the app's inline JavaScript in public/index.html parses.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) { console.error("No inline <script> found in public/index.html"); process.exit(1); }
scripts.forEach((code, i) => new vm.Script(code, { filename: `index.html inline script ${i + 1}` }));
console.log(`OK: ${scripts.length} inline script(s) in public/index.html parse cleanly.`);
