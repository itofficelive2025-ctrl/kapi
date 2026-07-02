# Kapi (कापी) — your study copybook

A personal learning app: pick any topic and go as deep as you like. Ships with
starter courses for **English (from Nepali)**, **stock market technical
analysis**, and **stock market fundamentals** — and can teach *any* topic you
add, powered by Claude.

## Run it locally

```powershell
cd learn-app
npm install
node server.js
# open http://localhost:4321
```

## Deploy on Vercel

The repo is Vercel-ready: static UI in `public/`, serverless functions in
`api/`, shared logic in `lib/`. Your progress, custom topics and generated
lessons are stored in the browser (localStorage), so no database is needed.

1. Push this repo to GitHub.
2. On https://vercel.com/new import the repo (framework preset: **Other**,
   no build command).
3. In Project → Settings → Environment Variables add
   `ANTHROPIC_API_KEY` = your key.
4. Deploy. Every future `git push` redeploys automatically.

The app works immediately with the built-in starter lessons. To unlock the AI
features, set an Anthropic API key (get one at https://platform.claude.com):

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # current session only
# or permanently:
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

then restart the server. The sidebar shows "AI tutor connected" when it works.

## What's inside

| Feature | Needs AI key? | How it works |
|---|---|---|
| Starter lessons, quizzes, flashcards | No | Built into `seed.js` |
| Flashcard spaced repetition | No | Leitner boxes; missed cards return sooner |
| **Real stock charts** | No | Live daily OHLC from Yahoo Finance, drawn as candlesticks |
| English **listening** (dictation) | No* | Browser text-to-speech reads sentences; you type what you hear |
| English **speaking** (read aloud) | No* | Browser speech recognition scores your pronunciation (Chrome/Edge) |
| "Write next lesson" (any topic, any depth) | Yes | Claude generates a full lesson + quiz + flashcards, aware of what you've done |
| AI chart walkthrough + quiz on a real chart | Yes | Claude reads the actual OHLC data and teaches it |
| Company case study with real current numbers | Yes | Claude uses live web search for price, P/E, revenue, etc. |
| English **writing** feedback | Yes | Claude corrects your text with explanations (Nepali hints included) |
| Tutor chat (red ? button) | Yes | Context-aware — knows which lesson/chart you're on |
| Custom topics ("+ New topic") | Yes (for lessons) | Any subject; AI writes the curriculum as you go |

\* AI makes listening/speaking better (fresh sentences each session) but both
work offline with built-in sentences.

## Practicing with real data

- **Technical:** Stock Market — Technical → *Real charts*. Load AAPL, MSFT,
  TSLA, NVDA, KO, ^GSPC… any Yahoo Finance ticker. Read the chart yourself
  first, then press *Teach me this chart* — the AI analyses that exact data
  (trend, support/resistance with real prices) and quizzes you on it.
- **Fundamental:** Stock Market — Fundamentals → *Company case study*. Name a
  real company; the AI web-searches its current numbers and teaches you how to
  read them.

## Practicing the four English skills

- **Reading** — lessons + vocabulary (with 🔊 buttons on every word/example).
- **Listening** — English → Practice → Listening: dictation with normal and
  slow playback.
- **Speaking** — English → Practice → Speaking: read a sentence aloud, the
  browser transcribes you and scores the match. Use Chrome or Edge and allow
  the microphone.
- **Writing** — English → Practice → Writing: complete a task, get corrections
  with explanations, a polished rewrite, and a score.

## Files

- `lib/ai.js` — all Claude API calls (model `claude-opus-4-8`, structured
  JSON lessons) and the Yahoo Finance fetcher. Stateless; shared by both
  runtimes.
- `api/**` — Vercel serverless functions (thin wrappers around `lib/ai.js`).
- `server.js` — local dev server exposing the same endpoints + static hosting.
- `public/` — the UI (vanilla JS single-page app); `public/seed-data.js`
  carries the built-in topics and starter lessons (regenerate from `seed.js`
  if you edit the seed content).
- Progress, custom topics and AI-generated lessons persist in the browser's
  localStorage under `kapi.*` keys.

## Design

Styled as a Nepali school copybook (कापी): ruled paper, a red margin rule, ink
navy, marker-yellow highlights. Type is the IBM Plex superfamily — Plex Serif
for headings, Plex Sans + Plex Sans Devanagari for body text (so Nepali renders
properly), Plex Mono for prices and labels.
