// Local dev server — serves public/ and the same stateless API the Vercel
// deployment exposes (lib/ai.js is shared). Run with:  node server.js
// Progress and generated lessons live in the browser (localStorage).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODEL, aiConfigured, friendlyError, httpError,
  generateLessonContent, tutorChat, fetchMarket, analyzeChart,
  companyCaseStudy, writingFeedback, practiceSentences, generateSyllabus, talkTurn
} from "./lib/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4321;
const PUBLIC_DIR = path.join(__dirname, "public");

function send(res, status, body, type = "application/json") {
  const data = type === "application/json" ? JSON.stringify(body) : body;
  res.writeHead(status, { "Content-Type": type + "; charset=utf-8" });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) reject(httpError(413, "Body too large")); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(httpError(400, "Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".ico": "image/x-icon"
};

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  switch (route) {
    case "GET /api/status":
      return send(res, 200, { aiAvailable: aiConfigured(), model: MODEL });
    case "GET /api/market":
      return send(res, 200, await fetchMarket(url.searchParams.get("symbol"), Number(url.searchParams.get("months")) || 12));
    case "POST /api/generate/lesson":
      return send(res, 200, await generateLessonContent(await readBody(req)));
    case "POST /api/syllabus":
      return send(res, 200, await generateSyllabus(await readBody(req)));
    case "POST /api/chat":
      return send(res, 200, { reply: await tutorChat(await readBody(req)) });
    case "POST /api/analyze/chart":
      return send(res, 200, await analyzeChart(await readBody(req)));
    case "POST /api/company":
      return send(res, 200, { study: await companyCaseStudy((await readBody(req)).query) });
    case "POST /api/english/feedback":
      return send(res, 200, await writingFeedback(await readBody(req)));
    case "POST /api/english/sentences":
      return send(res, 200, await practiceSentences(await readBody(req)));
    case "POST /api/english/talk":
      return send(res, 200, await talkTurn(await readBody(req)));
    default:
      throw httpError(404, "Unknown API route");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    let file = url.pathname === "/" ? "/index.html" : url.pathname;
    const full = path.join(PUBLIC_DIR, path.normalize(file));
    if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, "index.html")), "text/html");
    }
    return send(res, 200, fs.readFileSync(full), MIME[path.extname(full)] || "application/octet-stream");
  } catch (err) {
    const { status, message } = friendlyError(err);
    console.error(`[${new Date().toISOString()}]`, req.method, url.pathname, "->", message);
    send(res, status >= 400 && status < 600 ? status : 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Kapi running at http://localhost:${PORT}`);
  console.log(`AI ${aiConfigured() ? "connected" : "NOT configured — set ANTHROPIC_API_KEY to enable lesson generation and the tutor"} (model: ${MODEL})`);
});
