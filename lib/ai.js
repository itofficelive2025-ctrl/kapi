// All Claude API + market data logic, stateless — shared by the local server
// (server.js) and the Vercel serverless functions (api/**).
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";

let client = null;
export function getClient() {
  if (!client) client = new Anthropic(); // key from env (ANTHROPIC_API_KEY)
  return client;
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Map SDK errors to short, user-facing messages.
export function friendlyError(err) {
  if (/Could not resolve authentication/i.test(err.message || "")) {
    return { status: 502, message: "AI is not connected — set the ANTHROPIC_API_KEY environment variable to enable this." };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 502, message: "AI is not connected — the API key is missing or invalid. Set ANTHROPIC_API_KEY." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "The AI is rate-limited right now. Wait a minute and try again." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, message: "Could not reach the Anthropic API. Check the internet connection." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, message: `AI request failed (${err.status}): ${err.message}` };
  }
  return { status: err.status || 500, message: err.message || "Server error" };
}

// ------------------------------------------------------------------ lessons
const LESSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "sections", "vocabulary", "quiz", "flashcards"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body", "example"],
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "translation", "example"],
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answerIndex", "explanation"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answerIndex: { type: "integer" },
          explanation: { type: "string" }
        }
      }
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back"],
        properties: {
          front: { type: "string" },
          back: { type: "string" }
        }
      }
    }
  }
};

function lessonPrompt(topic, level, existingTitles, request) {
  const isLanguage = topic.kind === "language";
  return [
    `Create one self-contained lesson for a personal learning app.`,
    ``,
    `Topic: ${topic.name} — ${topic.description}`,
    `Difficulty level: ${level} of 5 (${topic.levels?.[level - 1] || "level " + level}).`,
    existingTitles.length
      ? `The learner has already covered these lessons, so do NOT repeat them; build on them:\n${existingTitles.map((t) => `- ${t}`).join("\n")}`
      : `This is the learner's first lesson on this topic.`,
    request ? `The learner specifically asked for: ${request}` : ``,
    ``,
    `About the learner: an adult whose first language is Nepali. Motivated, wants real depth, not gamified fluff.`,
    isLanguage
      ? `Because this is an English lesson for a Nepali speaker: every vocabulary "translation" must be the Nepali translation in Devanagari script. In section bodies, occasionally reference the Nepali equivalent to anchor understanding. Flashcard fronts should be Nepali, backs English.`
      : `Vocabulary "translation" should be a plain-English definition of the term. Use concrete numeric examples where helpful (amounts in Rs / crore are fine).`,
    ``,
    `Requirements:`,
    `- 3 to 5 sections that genuinely teach, each with a concrete example.`,
    `- 4 to 8 vocabulary items.`,
    `- 4 to 6 quiz questions, each with exactly 4 options and one correct answerIndex (0-3), with a short explanation.`,
    `- 4 to 8 flashcards covering the most important points.`,
    `- Write clearly and warmly, like a great private tutor. No markdown syntax in strings (plain text only).`
  ].filter(Boolean).join("\n");
}

function parseStructured(response) {
  if (response.stop_reason === "refusal") throw httpError(502, "The model declined this request.");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw httpError(502, "Empty model response.");
  return JSON.parse(text);
}

export async function generateLessonContent({ topic, level, existingTitles, request }) {
  if (!topic?.name) throw httpError(400, "Topic details required.");
  const lvl = Math.min(5, Math.max(1, Number(level) || 1));
  const titles = Array.isArray(existingTitles) ? existingTitles.slice(0, 40).map(String) : [];
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: LESSON_SCHEMA } },
    messages: [{
      role: "user",
      content: lessonPrompt(topic, lvl, titles, request ? String(request).slice(0, 500) : "")
    }]
  });
  const lesson = parseStructured(response);
  lesson.level = lvl;
  lesson.generated = true;
  return lesson;
}

// ------------------------------------------------------------ course syllabus
const SYLLABUS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lessons"],
  properties: {
    lessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary", "level"],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          level: { type: "integer" }
        }
      }
    }
  }
};

export async function generateSyllabus({ topic, existingTitles }) {
  if (!topic?.name) throw httpError(400, "Topic details required.");
  const titles = Array.isArray(existingTitles) ? existingTitles.slice(0, 40).map(String) : [];
  const isLanguage = topic.kind === "language";
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: SYLLABUS_SCHEMA } },
    messages: [{
      role: "user",
      content: [
        `Design a complete course plan (syllabus) for a personal learning app.`,
        ``,
        `Topic: ${topic.name} — ${topic.description}`,
        `The course has 5 levels: ${(topic.levels || ["1", "2", "3", "4", "5"]).map((n, i) => `Level ${i + 1} = ${n}`).join(", ")}.`,
        titles.length ? `Lessons the learner ALREADY has (do not duplicate; plan around them):\n${titles.map((t) => `- ${t}`).join("\n")}` : ``,
        ``,
        `The learner: an adult whose first language is Nepali, motivated, wants real mastery.`,
        isLanguage ? `This is an English course for a Nepali speaker — sequence it the way a great language curriculum does (survival phrases → core grammar → real conversation → fluency), not as a grammar textbook.` : ``,
        ``,
        `Produce 25 to 35 lesson entries spread sensibly across levels 1-5 (more at lower levels). Each entry: a concrete "title" (what the lesson teaches, specific not vague), a one-sentence "summary", and its "level" (1-5). Order them in the exact sequence the learner should study. Titles must be self-contained and non-overlapping.`
      ].filter(Boolean).join("\n")
    }]
  });
  const result = (() => {
    if (response.stop_reason === "refusal") throw httpError(502, "The model declined this request.");
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) throw httpError(502, "Empty model response.");
    return JSON.parse(text);
  })();
  result.lessons = (result.lessons || []).map((l) => ({
    title: String(l.title), summary: String(l.summary),
    level: Math.min(5, Math.max(1, Number(l.level) || 1))
  }));
  return result;
}

// -------------------------------------------------------------------- tutor
const TUTOR_SYSTEM = `You are a private tutor inside a personal learning app. The learner is an adult whose first language is Nepali; they are studying English and the stock market, and sometimes other topics.

How to tutor:
- Answer the actual question first, clearly and correctly, then add one useful extra insight if it helps.
- Keep answers focused (usually under 250 words). Use short paragraphs, not heavy formatting.
- If the learner writes in Nepali or seems confused, explain in simple English and add a Nepali clarification in Devanagari for the hard part.
- For English questions: give the rule, an example sentence, and the Nepali equivalent when it clarifies.
- For stock market questions: be precise, use small numeric examples, and never give personal investment advice or predictions — teach concepts instead.
- Encourage, but skip empty praise.`;

export async function tutorChat({ context, messages }) {
  if (!Array.isArray(messages) || !messages.length) throw httpError(400, "messages required");
  const sys = context ? `${TUTOR_SYSTEM}\n\nCurrent study context: ${String(context).slice(0, 300)}` : TUTOR_SYSTEM;
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }],
    messages: messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 4000)
    }))
  });
  if (response.stop_reason === "refusal") throw httpError(502, "The model declined this request.");
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// ------------------------------------------- real market data (Yahoo Finance)
export async function fetchMarket(symbolRaw, months) {
  const s = String(symbolRaw || "").trim().toUpperCase();
  if (!s) throw httpError(400, "Symbol required");
  const range = months <= 6 ? "6mo" : months <= 12 ? "1y" : "2y";
  const resp = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
  );
  if (resp.status === 404) throw httpError(404, `No data for "${s}". Try tickers like AAPL, MSFT, TSLA, ^GSPC.`);
  if (!resp.ok) throw httpError(502, "Market data service unavailable right now. Try again in a minute.");
  const json = await resp.json();
  const result = json?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) {
    throw httpError(404, `No data for "${s}". Try tickers like AAPL, MSFT, TSLA, ^GSPC.`);
  }
  const round = (v) => (v >= 100 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000);
  const bars = result.timestamp.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    open: quote.open[i], high: quote.high[i], low: quote.low[i],
    close: quote.close[i], volume: quote.volume[i] || 0
  })).filter((b) => [b.open, b.high, b.low, b.close].every(Number.isFinite))
    .map((b) => ({ ...b, open: round(b.open), high: round(b.high), low: round(b.low), close: round(b.close) }));
  if (bars.length < 20) throw httpError(404, `Not enough trading data for "${s}".`);
  return { symbol: s, bars };
}

// ----------------------------------------------------------- chart analysis
const CHART_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["analysis", "questions"],
  properties: {
    analysis: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answerIndex", "explanation"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answerIndex: { type: "integer" },
          explanation: { type: "string" }
        }
      }
    }
  }
};

export async function analyzeChart({ symbol, bars }) {
  if (!Array.isArray(bars) || bars.length < 20) throw httpError(400, "Not enough chart data.");
  const compact = bars.slice(-90).map((b) =>
    `${b.date} O:${b.open} H:${b.high} L:${b.low} C:${b.close}`
  ).join("\n");
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: CHART_ANALYSIS_SCHEMA } },
    messages: [{
      role: "user",
      content: `You are teaching technical analysis to a motivated beginner. Here are the last ${Math.min(bars.length, 90)} daily candles for ${String(symbol || "this stock")} (real market data):\n\n${compact}\n\nWrite "analysis" as a teaching walkthrough of THIS chart in plain text (no markdown): overall trend (using higher-highs/lower-lows language), the clearest support and resistance zones with actual price numbers, any notable candles or patterns, and what a disciplined student should watch next. Be concrete about the numbers, be honest about ambiguity, and do NOT give buy/sell advice.\n\nThen write 3 "questions" quizzing the learner about THIS specific chart (each 4 options, one correct answerIndex 0-3, with explanation).`
    }]
  });
  return parseStructured(response);
}

// ------------------------------------- company case study (with web search)
export async function companyCaseStudy(query) {
  const q = String(query || "").trim().slice(0, 100);
  if (!q) throw httpError(400, "Company name required.");
  let messages = [{
    role: "user",
    content: `Build a fundamentals case study of the company "${q}" for a student learning fundamental analysis. Use web search to find CURRENT, real figures.\n\nStructure it in plain text (no markdown symbols) with these labelled parts:\nBUSINESS — what the company actually sells, in two sentences.\nNUMBERS — current share price, market cap, latest annual revenue, net profit, EPS, P/E, and P/B if available. State the period each figure is from.\nREADING THE NUMBERS — teach what these specific numbers say: is the P/E high or low versus its sector, is revenue growing, is it profitable, what stands out.\nRED FLAGS AND STRENGTHS — two or three of each, tied to the numbers.\nSTUDY QUESTION — one open question for the learner to think about.\n\nBe honest when a figure can't be found. Educational only — no investment advice.`
  }];
  let response;
  for (let i = 0; i < 4; i++) {
    response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages
    });
    if (response.stop_reason !== "pause_turn") break;
    messages = [...messages, { role: "assistant", content: response.content }];
  }
  if (response.stop_reason === "refusal") throw httpError(502, "The model declined this request.");
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// -------------------------------------------------- English writing feedback
const WRITING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["corrected", "issues", "comment", "score"],
  properties: {
    corrected: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "fixed", "explanation"],
        properties: {
          original: { type: "string" },
          fixed: { type: "string" },
          explanation: { type: "string" }
        }
      }
    },
    comment: { type: "string" },
    score: { type: "integer" }
  }
};

export async function writingFeedback({ task, text }) {
  const clean = String(text || "").trim().slice(0, 4000);
  if (clean.length < 10) throw httpError(400, "Write a little more first.");
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: WRITING_SCHEMA } },
    messages: [{
      role: "user",
      content: `A Nepali-speaking English learner completed this writing task:\nTask: ${String(task || "Free writing").slice(0, 300)}\n\nTheir text:\n"""${clean}"""\n\nGive feedback:\n- "corrected": their full text rewritten in natural, correct English, staying close to their own words.\n- "issues": each real mistake, with "original" (their words), "fixed" (correction), "explanation" (why, in one or two sentences; add a Nepali hint in Devanagari when it clarifies grammar, e.g. tense or word-order differences).\n- "comment": two encouraging but honest sentences about their writing level and the one thing to focus on next.\n- "score": 1-10 for this piece.\nIgnore trivial style preferences; only flag real errors and clearly unnatural phrasing.`
    }]
  });
  return parseStructured(response);
}

// ----------------------------------------- practice sentences (listen/speak)
const SENTENCES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sentences"],
  properties: {
    sentences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["english", "nepali"],
        properties: {
          english: { type: "string" },
          nepali: { type: "string" }
        }
      }
    }
  }
};

export async function practiceSentences({ level, focus }) {
  const lvl = Math.min(5, Math.max(1, Number(level) || 1));
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: SENTENCES_SCHEMA } },
    messages: [{
      role: "user",
      content: `Generate 8 natural everyday English sentences for listening/speaking practice by a Nepali-speaking learner at level ${lvl} of 5${focus ? `, focused on: ${String(focus).slice(0, 200)}` : ""}. Keep them useful in real life (8-14 words each at level 1-2, up to 18 at higher levels). "nepali" is the Nepali translation in Devanagari.`
    }]
  });
  return parseStructured(response);
}
