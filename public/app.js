/* Kapi — frontend. Hash-routed single page app, no framework. */
"use strict";

const state = {
  topics: [],
  lessons: {},          // topicId -> lessons[]
  progress: { lessons: {}, cards: {} },
  ai: false,
  tutor: [],            // chat messages
  tutorContext: ""
};

const $ = (sel, el = document) => el.querySelector(sel);
const view = $("#view");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function api(path, opts) {
  const res = await fetch(path, opts ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts)
  } : undefined);
  const data = await res.json().catch(() => ({ error: "Bad response" }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ------------------------------------------- local persistence (this device)
const store = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

function saveProgress(patch) {
  if (patch.lesson) state.progress.lessons[patch.lesson.id] = { ...state.progress.lessons[patch.lesson.id], ...patch.lesson };
  if (patch.cards) state.progress.cards = { ...state.progress.cards, ...patch.cards };
  if (patch.meta) state.progress.meta = { ...state.progress.meta, ...patch.meta };
  store.write("kapi.progress", state.progress);
}

function saveGeneratedLesson(lesson) {
  const all = store.read("kapi.lessons", []);
  all.push(lesson);
  store.write("kapi.lessons", all);
}

function saveCustomTopics() {
  store.write("kapi.topics", state.topics.filter((t) => t.kind === "custom"));
}

// Streak: bump once per calendar day whenever the learner actually studies.
function bumpStreak() {
  const meta = state.progress.meta || {};
  const today = new Date().toISOString().slice(0, 10);
  if (meta.lastStudy === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = meta.lastStudy === yesterday ? (meta.streak || 0) + 1 : 1;
  saveProgress({ meta: { lastStudy: today, streak } });
}

// All flashcards due for review right now, across every topic and lesson.
function dueCards() {
  const now = Date.now();
  const due = [];
  for (const [topicId, lessons] of Object.entries(state.lessons)) {
    for (const l of lessons) {
      (l.flashcards || []).forEach((c, i) => {
        const key = `${l.id}::${i}`;
        const meta = state.progress.cards[key];
        // only cards the learner has met before (seen lesson or reviewed) count
        if (meta && meta.due <= now) due.push({ ...c, key, meta, lessonTitle: l.title, topicId });
        else if (!meta && state.progress.lessons[l.id]?.completed) {
          due.push({ ...c, key, meta: { box: 1, due: 0 }, lessonTitle: l.title, topicId });
        }
      });
    }
  }
  return due;
}

function lessonsForTopic(topicId) {
  const generated = store.read("kapi.lessons", []);
  return [...window.SEED.LESSONS, ...generated].filter((l) => l.topicId === topicId);
}

async function loadAllLessons() {
  for (const t of state.topics) {
    state.lessons[t.id] = lessonsForTopic(t.id);
    t.lessonCount = state.lessons[t.id].length;
  }
}

// ------------------------------------------------------------ speech (TTS)
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); }
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text, rate = 0.92) {
  if (!("speechSynthesis" in window)) return alert("Your browser does not support speech.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const v = voices.find((v) => v.lang === "en-US" && /natural|neural|online/i.test(v.name))
    || voices.find((v) => v.lang === "en-US") || voices.find((v) => v.lang.startsWith("en"));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// ------------------------------------------------- speech recognition (STT)
function makeRecognizer(onResult, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => onResult(e.results[0][0].transcript);
  rec.onerror = (e) => onError(e.error);
  return rec;
}
const words = (s) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, "").split(/\s+/).filter(Boolean);
function matchScore(target, said) {
  const t = words(target), s = new Set(words(said));
  if (!t.length) return 0;
  return Math.round((t.filter((w) => s.has(w)).length / t.length) * 100);
}

// ------------------------------------------------------------------ layout
function topicById(id) { return state.topics.find((t) => t.id === id); }

function renderNav(activeTopic) {
  $("#topic-nav").innerHTML = state.topics.map((t) => `
    <button class="topic-tab ${t.id === activeTopic ? "active" : ""}" data-nav="#/topic/${t.id}">
      ${esc(t.name)}
      <span class="tab-count">${t.lessonCount || 0} lessons</span>
    </button>`).join("");
}

function crumb(topic, extra) {
  return `<nav class="crumb"><a href="#/">Topics</a> › <a href="#/topic/${topic.id}">${esc(topic.name)}</a>${extra ? ` › ${esc(extra)}` : ""}</nav>`;
}

function aiGate(msg) {
  return state.ai ? "" : `<div class="notice">🔌 ${esc(msg)} — set <code>ANTHROPIC_API_KEY</code> and restart the server to enable it.</div>`;
}

// ------------------------------------------------------------------- home
async function renderHome() {
  renderNav(null);
  state.tutorContext = "";
  await loadAllLessons();
  const meta = state.progress.meta || {};
  const due = dueCards();
  const last = meta.lastLesson && findLesson(meta.lastLesson);

  view.innerHTML = `
    <div class="eyebrow">नयाँ पाना · a fresh page</div>
    <h1>What are we studying today?</h1>
    <p class="lede">Pick a subject and go as deep as you like. Lessons, quizzes, flashcards and a tutor — all in one copybook.</p>
    <div class="today-strip">
      <div class="today-stat"><strong>${meta.streak || 0}</strong><span>day streak ${meta.streak ? "🔥" : ""}</span></div>
      <div class="today-stat"><strong>${due.length}</strong><span>cards due today</span></div>
      ${due.length ? `<a class="btn marker" href="#/review">Review now →</a>` : `<span class="small">All caught up ✓</span>`}
      ${last ? `<a class="btn ghost" href="#/lesson/${last.id}">Continue: ${esc(last.title)}</a>` : ""}
    </div>
    <div class="topic-grid">
      ${state.topics.map((t) => `
        <button class="topic-card" data-nav="#/topic/${t.id}">
          <span class="t-icon">${esc(t.icon || "✎")}</span>
          <h3>${esc(t.name)}${t.nameLocal ? ` <span class="small">${esc(t.nameLocal)}</span>` : ""}</h3>
          <p>${esc(t.description)}</p>
          <span class="t-meta">${t.lessonCount || 0} lessons · ${doneCount(t.id)} completed</span>
        </button>`).join("")}
    </div>`;
}

// ------------------------------------------- daily review (all topics mixed)
async function renderReview() {
  renderNav(null);
  await loadAllLessons();
  state.tutorContext = "Daily flashcard review";
  const queue = dueCards().sort(() => Math.random() - 0.5).slice(0, 40);
  if (!queue.length) {
    view.innerHTML = `
      <div class="eyebrow">Daily review</div>
      <h1>All caught up ✓</h1>
      <p class="lede">No cards are due. Finish a lesson quiz to add its cards to your review cycle.</p>
      <a class="btn" href="#/">Back home</a>`;
    return;
  }
  runCardSession(queue, {
    title: "Daily review",
    eyebrow: `Mixed review · ${queue.length} cards due across your topics`,
    doneHtml: `<a class="btn" href="#/">Back home</a>`
  });
}

function doneCount(topicId) {
  const ls = state.lessons[topicId] || [];
  return ls.filter((l) => state.progress.lessons[l.id]?.completed).length;
}

// ------------------------------------------------------------------ topic
async function renderTopic(topicId) {
  const topic = topicById(topicId);
  if (!topic) return renderHome();
  renderNav(topicId);
  state.tutorContext = `Studying topic: ${topic.name}`;
  const lessons = state.lessons[topicId] = lessonsForTopic(topicId);
  topic.lessonCount = lessons.length;

  const isEnglish = topic.kind === "language";
  const isStocks = topic.id.startsWith("stocks");
  const practiceButtons = isEnglish ? `
      <a class="btn marker" href="#/practice/${topicId}/listen">🎧 Listening</a>
      <a class="btn marker" href="#/practice/${topicId}/speak">🎙 Speaking</a>
      <a class="btn marker" href="#/practice/${topicId}/write">✍ Writing</a>`
    : isStocks ? `
      <a class="btn marker" href="#/market/${topicId}">📈 Real charts</a>
      ${topic.id === "stocks-fundamental" ? `<a class="btn marker" href="#/company/${topicId}">🏢 Company case study</a>` : ""}`
    : "";

  const syllabus = store.read("kapi.syllabus", {})[topicId];
  const mapKeyOf = (i) => `${topicId}::${i}`;
  const writtenByKey = {};
  lessons.forEach((l) => { if (l.syllabusKey) writtenByKey[l.syllabusKey] = l; });
  let courseMapHtml = "";
  if (syllabus?.lessons?.length) {
    const writtenCount = syllabus.lessons.filter((_, i) => writtenByKey[mapKeyOf(i)]).length;
    const doneCountMap = syllabus.lessons.filter((_, i) => {
      const l = writtenByKey[mapKeyOf(i)];
      return l && state.progress.lessons[l.id]?.completed;
    }).length;
    const nextIdx = syllabus.lessons.findIndex((_, i) => {
      const l = writtenByKey[mapKeyOf(i)];
      return !l || !state.progress.lessons[l.id]?.completed;
    });
    let lastLevel = 0;
    courseMapHtml = `
      <h2>Course map</h2>
      <p class="small">${doneCountMap} of ${syllabus.lessons.length} completed · ${writtenCount} written · lessons are written by your tutor the moment you reach them</p>
      <ol class="course-map">
        ${syllabus.lessons.map((s, i) => {
          const written = writtenByKey[mapKeyOf(i)];
          const completed = written && state.progress.lessons[written.id]?.completed;
          const isNext = i === nextIdx;
          const levelHead = s.level !== lastLevel
            ? `<li class="map-level">Level ${s.level} — ${esc(topic.levels?.[s.level - 1] || "")}</li>` : "";
          lastLevel = s.level;
          return `${levelHead}
            <li class="map-item ${completed ? "done" : isNext ? "next" : written ? "written" : "future"}"
                data-idx="${i}" ${written ? `data-lesson="${written.id}"` : ""}>
              <span class="map-dot">${completed ? "✓" : written ? "○" : "·"}</span>
              <span class="map-text"><strong>${esc(s.title)}</strong><span>${esc(s.summary)}</span></span>
              <span class="map-cta">${completed ? "review" : written ? "continue" : isNext ? (state.ai ? "write & start →" : "needs AI") : ""}</span>
            </li>`;
        }).join("")}
      </ol>`;
  } else {
    courseMapHtml = `
      <h2>Course map</h2>
      <p class="small">Let your tutor design the whole course — 25+ lessons sequenced across all 5 levels. Each lesson is written when you reach it.</p>
      ${aiGate("Course map generation needs the AI connection")}
      <div class="btn-row"><button id="syllabus-btn" class="btn marker" ${state.ai ? "" : "disabled"}>🗺 Create my course map</button></div>
      <div id="syllabus-out"></div>`;
  }

  view.innerHTML = `
    ${crumb(topic)}
    <div class="eyebrow">${esc(topic.levels?.join(" · ") || "")}</div>
    <h1>${esc(topic.name)}</h1>
    <p class="lede">${esc(topic.description)}</p>
    <div class="btn-row">${practiceButtons}</div>
    ${courseMapHtml}
    <h2>Lessons</h2>
    <ul class="lesson-list">
      ${lessons.map((l) => {
        const p = state.progress.lessons[l.id];
        return `<li class="lesson-item">
          <span class="l-level">L${l.level}</span>
          <span class="l-title"><strong>${esc(l.title)}</strong><span>${esc(l.summary)}</span></span>
          ${p?.completed ? `<span class="l-done">✓ ${p.quizScore != null ? p.quizScore + "%" : "done"}</span>` : ""}
          <button class="btn ghost" data-nav="#/lesson/${l.id}">Open</button>
        </li>`;
      }).join("")}
    </ul>
    <h2>Go deeper</h2>
    <p class="small">Ask the AI to write the next lesson — it knows what you've already covered.</p>
    ${aiGate("Lesson generation needs the AI connection")}
    <div class="market-bar">
      <select id="gen-level">
        ${(topic.levels || ["1","2","3","4","5"]).map((name, i) => `<option value="${i + 1}">Level ${i + 1} — ${esc(name)}</option>`).join("")}
      </select>
      <input id="gen-request" type="text" placeholder="Optional: something specific you want to learn…" style="flex:1;min-width:220px" />
      <button id="gen-btn" class="btn" ${state.ai ? "" : "disabled"}>Write next lesson</button>
    </div>
    <div id="gen-out"></div>`;

  $("#syllabus-btn")?.addEventListener("click", async () => {
    const btn = $("#syllabus-btn"), out = $("#syllabus-out");
    btn.disabled = true;
    out.innerHTML = `<p><span class="spinner"></span>Your tutor is designing the full course… (15–60 seconds)</p>`;
    try {
      const result = await api("/api/syllabus", {
        topic: { name: topic.name, description: topic.description, kind: topic.kind, levels: topic.levels },
        existingTitles: lessons.map((l) => l.title)
      });
      if (!result.lessons?.length) throw new Error("The course map came back empty — try again.");
      result.lessons.sort((a, b) => a.level - b.level);
      const all = store.read("kapi.syllabus", {});
      all[topicId] = { lessons: result.lessons, createdAt: Date.now() };
      store.write("kapi.syllabus", all);
      renderTopic(topicId);
    } catch (e) {
      out.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
      btn.disabled = false;
    }
  });

  view.querySelectorAll(".map-item").forEach((el) => el.addEventListener("click", async () => {
    if (el.dataset.lesson) { location.hash = `#/lesson/${el.dataset.lesson}`; return; }
    if (!state.ai) return;
    if (el.dataset.busy) return;
    el.dataset.busy = "1";
    const idx = +el.dataset.idx;
    const s = syllabus.lessons[idx];
    const cta = el.querySelector(".map-cta");
    cta.innerHTML = `<span class="spinner"></span>writing…`;
    try {
      const lesson = await api("/api/generate/lesson", {
        topic: { name: topic.name, description: topic.description, kind: topic.kind, levels: topic.levels },
        level: s.level,
        existingTitles: lessons.map((l) => l.title),
        request: `Write exactly this lesson from the course plan — title: "${s.title}", covering: ${s.summary}. Keep the title as given.`
      });
      lesson.id = `gen-${Date.now()}`;
      lesson.topicId = topicId;
      lesson.syllabusKey = mapKeyOf(idx);
      lesson.title = s.title; // keep the map and lesson in sync
      saveGeneratedLesson(lesson);
      state.lessons[topicId] = lessonsForTopic(topicId);
      location.hash = `#/lesson/${lesson.id}`;
    } catch (e) {
      cta.textContent = "failed — tap to retry";
      delete el.dataset.busy;
      alert(e.message);
    }
  }));

  $("#gen-btn")?.addEventListener("click", async () => {
    const btn = $("#gen-btn"), out = $("#gen-out");
    btn.disabled = true;
    out.innerHTML = `<p><span class="spinner"></span>Your tutor is writing a new lesson… (10–60 seconds)</p>`;
    try {
      const level = Number($("#gen-level").value);
      const lesson = await api("/api/generate/lesson", {
        topic: { name: topic.name, description: topic.description, kind: topic.kind, levels: topic.levels },
        level,
        existingTitles: lessons.filter((l) => l.level === level).map((l) => l.title),
        request: $("#gen-request").value.trim()
      });
      lesson.id = `gen-${Date.now()}`;
      lesson.topicId = topicId;
      saveGeneratedLesson(lesson);
      state.lessons[topicId] = lessonsForTopic(topicId);
      out.innerHTML = "";
      location.hash = `#/lesson/${lesson.id}`;
    } catch (e) {
      out.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ----------------------------------------------------------------- lesson
function findLesson(lessonId) {
  for (const ls of Object.values(state.lessons)) {
    const hit = ls.find((l) => l.id === lessonId);
    if (hit) return hit;
  }
  return null;
}
async function ensureLesson(lessonId) {
  let l = findLesson(lessonId);
  if (l) return l;
  await loadAllLessons();
  return findLesson(lessonId);
}

async function renderLesson(lessonId) {
  const lesson = await ensureLesson(lessonId);
  if (!lesson) return renderHome();
  const topic = topicById(lesson.topicId);
  renderNav(topic.id);
  state.tutorContext = `Lesson: ${lesson.title} (topic: ${topic.name})`;
  saveProgress({ meta: { lastLesson: lesson.id } });
  bumpStreak();
  const isEnglish = topic.kind === "language";

  view.innerHTML = `
    ${crumb(topic, lesson.title)}
    <div class="eyebrow">Level ${lesson.level}${lesson.generated ? " · written by your AI tutor" : ""}</div>
    <h1>${esc(lesson.title)}</h1>
    <p class="lede">${esc(lesson.summary)}</p>
    ${lesson.sections.map((s) => `
      <div class="section-block">
        <h2>${esc(s.heading)}</h2>
        <p>${esc(s.body)}</p>
        ${s.example ? `<div class="example">✎ ${esc(s.example)} ${isEnglish ? `<button class="speak-btn" data-say="${esc(s.example)}" title="Listen">🔊</button>` : ""}</div>` : ""}
      </div>`).join("")}
    ${lesson.vocabulary?.length ? `
      <h2>${isEnglish ? "Vocabulary · शब्दहरू" : "Key terms"}</h2>
      <table class="vocab-table">
        <tr><th>${isEnglish ? "English" : "Term"}</th><th>${isEnglish ? "नेपाली" : "Meaning"}</th><th>Example</th><th></th></tr>
        ${lesson.vocabulary.map((v) => `
          <tr>
            <td>${esc(v.term)}</td><td>${esc(v.translation)}</td><td>${esc(v.example)}</td>
            <td>${isEnglish ? `<button class="speak-btn" data-say="${esc(v.term)}. ${esc(v.example)}" title="Listen">🔊</button>` : ""}</td>
          </tr>`).join("")}
      </table>` : ""}
    <div class="btn-row">
      <a class="btn" href="#/quiz/${lesson.id}">Take the quiz (${lesson.quiz.length})</a>
      <a class="btn ghost" href="#/cards/${lesson.id}">Review flashcards (${lesson.flashcards.length})</a>
    </div>
    <p class="small">Stuck on anything? Press the red <strong>?</strong> button — your tutor knows which lesson you're reading.</p>`;
}

// ------------------------------------------------------------------- quiz
async function renderQuiz(lessonId) {
  const lesson = await ensureLesson(lessonId);
  if (!lesson) return renderHome();
  const topic = topicById(lesson.topicId);
  renderNav(topic.id);
  state.tutorContext = `Quiz on: ${lesson.title}`;
  let answered = 0, correct = 0;

  view.innerHTML = `
    ${crumb(topic, lesson.title)}
    <div class="eyebrow">Quiz · ${lesson.quiz.length} questions</div>
    <h1>${esc(lesson.title)}</h1>
    <div id="quiz-list">
      ${lesson.quiz.map((q, qi) => `
        <div class="quiz-q" data-q="${qi}">
          <h3>${qi + 1}. ${esc(q.question)}</h3>
          ${q.options.map((o, oi) => `<button class="quiz-opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}
          <div class="quiz-expl" hidden>${esc(q.explanation)}</div>
        </div>`).join("")}
    </div>
    <div id="quiz-result"></div>`;

  view.addEventListener("click", function onAnswer(e) {
    const btn = e.target.closest(".quiz-opt");
    if (!btn || btn.disabled) return;
    const qi = +btn.dataset.q, oi = +btn.dataset.o;
    const q = lesson.quiz[qi];
    const box = view.querySelector(`.quiz-q[data-q="${qi}"]`);
    box.querySelectorAll(".quiz-opt").forEach((b) => {
      b.disabled = true;
      if (+b.dataset.o === q.answerIndex) b.classList.add("correct");
    });
    if (oi !== q.answerIndex) btn.classList.add("wrong"); else correct++;
    box.querySelector(".quiz-expl").hidden = false;
    answered++;
    if (answered === lesson.quiz.length) {
      const score = Math.round((correct / lesson.quiz.length) * 100);
      saveProgress({ lesson: { id: lesson.id, completed: true, quizScore: score } });
      bumpStreak();
      // Adaptive next step: weak score pulls this lesson's cards due today;
      // strong score points at the next level up.
      let nextStep;
      if (score < 80) {
        const dueNow = {};
        lesson.flashcards.forEach((_, i) => {
          dueNow[`${lesson.id}::${i}`] = { box: 1, due: 0 };
        });
        saveProgress({ cards: dueNow });
        nextStep = `<p>Your score says this needs one more pass — I've put this lesson's cards at the top of your review pile.</p>
          <div class="btn-row">
            <a class="btn marker" href="#/cards/${lesson.id}">Review the cards now</a>
            <a class="btn ghost" href="#/lesson/${lesson.id}">Re-read the lesson</a>
            <a class="btn ghost" href="#/topic/${topic.id}">Back to ${esc(topic.name)}</a>
          </div>`;
      } else {
        const next = (state.lessons[topic.id] || []).find((l) => l.id !== lesson.id && !state.progress.lessons[l.id]?.completed);
        nextStep = `<p>You've got this. ${next ? "The next lesson is waiting." : state.ai ? "Ask the AI to write your next lesson — one level deeper." : "Add an API key to unlock deeper AI-written lessons."}</p>
          <div class="btn-row">
            ${next ? `<a class="btn marker" href="#/lesson/${next.id}">Next: ${esc(next.title)} →</a>` : ""}
            <a class="btn ${next ? "ghost" : "marker"}" href="#/topic/${topic.id}">${next ? "Back to " + esc(topic.name) : "Go deeper →"}</a>
            <a class="btn ghost" href="#/cards/${lesson.id}">Review flashcards</a>
          </div>`;
      }
      $("#quiz-result").innerHTML = `
        <div class="score-line">${score >= 80 ? "स्याबास! (Well done!)" : score >= 50 ? "Good effort" : "Keep going"} — ${correct}/${lesson.quiz.length} (${score}%)</div>
        ${nextStep}`;
      $("#quiz-result").scrollIntoView({ behavior: "smooth" });
      view.removeEventListener("click", onAnswer);
    }
  });
}

// -------------------------------------------------------------- flashcards
// Leitner spaced repetition, 5 boxes: due again now / 1 / 3 / 7 / 21 days.
const BOX_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };

function runCardSession(queue, opts) {
  let idx = 0, flipped = false, knewCount = 0;
  const now = Date.now();

  function draw() {
    if (idx >= queue.length) {
      bumpStreak();
      view.innerHTML = `
        <div class="eyebrow">${esc(opts.eyebrow || "Flashcards")}</div>
        <h1>Review complete ✓</h1>
        <p class="lede">${knewCount}/${queue.length} known. Cards you knew come back later (up to 21 days out); missed cards return today.</p>
        <div class="btn-row">${opts.doneHtml || ""}</div>`;
      return;
    }
    const card = queue[idx];
    const topic = card.topicId ? topicById(card.topicId) : null;
    view.innerHTML = `
      <div class="eyebrow">${esc(opts.eyebrow || "Flashcards")} · card ${idx + 1} of ${queue.length}</div>
      <h1>${esc(opts.title)}</h1>
      ${card.lessonTitle ? `<p class="small">from: ${esc(card.lessonTitle)}</p>` : ""}
      <div class="flash-stage">
        <div id="flash" class="flash-card ${flipped ? "flipped" : ""}" title="Click to flip">
          <div class="flash-face">${esc(card.front)}</div>
          <div class="flash-face back">${esc(card.back)}</div>
        </div>
      </div>
      <p class="flash-meta">box ${card.meta.box} of 5 · click card to flip · keyboard: space = flip, 1 = missed, 2 = knew</p>
      <div class="flash-actions" ${flipped ? "" : "hidden"}>
        <button class="btn ghost" id="card-miss">✗ Didn't know</button>
        <button class="btn marker" id="card-hit">✓ Knew it</button>
      </div>
      ${topic?.kind === "language" ? `<div class="flash-actions"><button class="btn ghost" data-say="${esc(card.back)}">🔊 Hear the English</button></div>` : ""}`;

    $("#flash").addEventListener("click", () => { flipped = !flipped; draw(); });
    $("#card-hit")?.addEventListener("click", () => grade(true));
    $("#card-miss")?.addEventListener("click", () => grade(false));

    function grade(knew) {
      if (knew) knewCount++;
      const box = knew ? Math.min(5, card.meta.box + 1) : 1;
      saveProgress({ cards: { [card.key]: { box, due: now + BOX_DAYS[box] * 86400000 } } });
      flipped = false; idx++; draw();
    }
  }

  function onKey(e) {
    if (!view.querySelector("#flash")) { document.removeEventListener("keydown", onKey); return; }
    if (e.key === " ") { e.preventDefault(); flipped = !flipped; draw(); }
    else if (e.key === "1" && flipped) $("#card-miss")?.click();
    else if (e.key === "2" && flipped) $("#card-hit")?.click();
  }
  document.removeEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey);
  draw();
}

async function renderCards(lessonId) {
  const lesson = await ensureLesson(lessonId);
  if (!lesson) return renderHome();
  const topic = topicById(lesson.topicId);
  renderNav(topic.id);
  state.tutorContext = `Flashcards: ${lesson.title}`;

  const now = Date.now();
  const all = lesson.flashcards.map((c, i) => ({
    ...c,
    key: `${lesson.id}::${i}`,
    topicId: topic.id,
    meta: state.progress.cards[`${lesson.id}::${i}`] || { box: 1, due: 0 }
  }));
  const due = all.filter((c) => c.meta.due <= now);
  runCardSession(due.length ? due : all, {
    title: lesson.title,
    eyebrow: "Flashcards",
    doneHtml: `
      <a class="btn" href="#/topic/${topic.id}">Back to ${esc(topic.name)}</a>
      <a class="btn ghost" href="#/lesson/${lesson.id}">Re-read lesson</a>`
  });
}

// -------------------------------------------------- english practice modes
const FALLBACK_SENTENCES = [
  { english: "Hello, my name is Mira and I am from Kathmandu.", nepali: "नमस्ते, मेरो नाम मीरा हो र म काठमाडौंबाट हुँ।" },
  { english: "Could you please speak a little more slowly?", nepali: "कृपया अलि बिस्तारै बोल्नुहुन्छ?" },
  { english: "I would like a cup of tea, please.", nepali: "मलाई एक कप चिया दिनुहोस्।" },
  { english: "What time does the shop open tomorrow?", nepali: "भोलि पसल कति बजे खुल्छ?" },
  { english: "I am learning English and it is going well.", nepali: "म अङ्ग्रेजी सिक्दैछु र राम्रो भइरहेको छ।" },
  { english: "Excuse me, where is the nearest bus stop?", nepali: "माफ गर्नुहोस्, नजिकको बस बिसौनी कहाँ छ?" }
];

async function getSentences(focus) {
  if (!state.ai) return FALLBACK_SENTENCES;
  try {
    const r = await api("/api/english/sentences", { level: 1, focus });
    return r.sentences?.length ? r.sentences : FALLBACK_SENTENCES;
  } catch { return FALLBACK_SENTENCES; }
}

async function renderPractice(topicId, mode) {
  const topic = topicById(topicId);
  if (!topic) return renderHome();
  renderNav(topicId);
  const tabs = `
    <div class="practice-tabs">
      <button class="ptab ${mode === "listen" ? "active" : ""}" data-nav="#/practice/${topicId}/listen">🎧 Listening</button>
      <button class="ptab ${mode === "speak" ? "active" : ""}" data-nav="#/practice/${topicId}/speak">🎙 Speaking</button>
      <button class="ptab ${mode === "write" ? "active" : ""}" data-nav="#/practice/${topicId}/write">✍ Writing</button>
    </div>`;
  const head = `
    ${crumb(topic, "Practice")}
    <div class="eyebrow">Practice · अभ्यास</div>
    <h1>${mode === "listen" ? "Listening — dictation" : mode === "speak" ? "Speaking — read aloud" : "Writing — get corrected"}</h1>
    ${tabs}`;

  if (mode === "listen") return renderListening(head);
  if (mode === "speak") return renderSpeaking(head);
  return renderWriting(head);
}

async function renderListening(head) {
  state.tutorContext = "English listening practice (dictation)";
  view.innerHTML = `${head}<p><span class="spinner"></span>Preparing sentences…</p>`;
  const sentences = await getSentences("everyday conversation");
  let idx = 0, score = 0;

  function draw() {
    if (idx >= sentences.length) {
      view.innerHTML = `${head}
        <div class="practice-box">
          <div class="score-line">Dictation finished — ${score}/${sentences.length} correct</div>
          <button class="btn" data-nav="#/practice/english/listen">Practice again (new sentences)</button>
        </div>`;
      return;
    }
    const s = sentences[idx];
    view.innerHTML = `${head}
      <div class="practice-box">
        <p class="small">Sentence ${idx + 1} of ${sentences.length} · listen, then type exactly what you hear.</p>
        <div class="btn-row">
          <button class="btn marker" id="play-btn">🔊 Play sentence</button>
          <button class="btn ghost" id="slow-btn">🐢 Play slowly</button>
        </div>
        <input type="text" id="dictation" placeholder="Type what you heard…" style="width:100%" autocomplete="off" />
        <div class="btn-row"><button class="btn" id="check-btn">Check</button></div>
        <div id="dict-result"></div>
      </div>`;
    $("#play-btn").addEventListener("click", () => speak(s.english));
    $("#slow-btn").addEventListener("click", () => speak(s.english, 0.65));
    speak(s.english);
    $("#check-btn").addEventListener("click", check);
    $("#dictation").addEventListener("keydown", (e) => e.key === "Enter" && check());

    function check() {
      const typed = $("#dictation").value;
      const pct = matchScore(s.english, typed);
      const ok = pct >= 85;
      if (ok) score++;
      $("#dict-result").innerHTML = `
        <p class="${ok ? "result-good" : "result-bad"}">${ok ? "✓ Correct!" : `✗ ${pct}% of the words matched`}</p>
        <p><strong>Sentence:</strong> ${esc(s.english)}<br><span class="small">${esc(s.nepali)}</span></p>
        <div class="btn-row"><button class="btn" id="next-btn">Next sentence →</button></div>`;
      $("#next-btn").addEventListener("click", () => { idx++; draw(); });
    }
  }
  draw();
}

async function renderSpeaking(head) {
  state.tutorContext = "English speaking practice (reading aloud)";
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  view.innerHTML = `${head}<p><span class="spinner"></span>Preparing sentences…</p>`;
  const sentences = await getSentences("sentences that are natural to say aloud");
  let idx = 0;

  function draw() {
    if (idx >= sentences.length) idx = 0;
    const s = sentences[idx];
    view.innerHTML = `${head}
      ${SR ? "" : `<div class="error-box">Your browser doesn't support speech recognition. Use Chrome or Edge for speaking practice.</div>`}
      <div class="practice-box">
        <p class="small">Sentence ${idx + 1} of ${sentences.length} · read it aloud clearly.</p>
        <div class="big-target">"${esc(s.english)}"</div>
        <p class="small">${esc(s.nepali)}</p>
        <div class="btn-row">
          <button class="btn ghost" id="hear-btn">🔊 Hear it first</button>
          <button class="btn marker" id="rec-btn" ${SR ? "" : "disabled"}>🎙 Start speaking</button>
          <button class="btn ghost" id="skip-btn">Skip →</button>
        </div>
        <div id="speak-result"></div>
      </div>`;
    $("#hear-btn").addEventListener("click", () => speak(s.english));
    $("#skip-btn").addEventListener("click", () => { idx++; draw(); });
    $("#rec-btn")?.addEventListener("click", () => {
      const out = $("#speak-result");
      out.innerHTML = `<p><span class="spinner"></span>Listening… speak now.</p>`;
      const rec = makeRecognizer(
        (transcript) => {
          const pct = matchScore(s.english, transcript);
          const verdict = pct >= 85 ? "✓ Excellent pronunciation!" : pct >= 60 ? "Close — try once more" : "Let's try again slowly";
          out.innerHTML = `
            <p class="${pct >= 85 ? "result-good" : "result-bad"}">${verdict} (${pct}% of words recognised)</p>
            <p><strong>You said:</strong> “${esc(transcript)}”</p>
            <div class="btn-row">
              <button class="btn ghost" id="retry-btn">🎙 Try again</button>
              <button class="btn" id="next2-btn">Next →</button>
            </div>`;
          $("#retry-btn").addEventListener("click", () => $("#rec-btn").click());
          $("#next2-btn").addEventListener("click", () => { idx++; draw(); });
        },
        (err) => { out.innerHTML = `<div class="error-box">Microphone error: ${esc(err)}. Check mic permission in the browser address bar.</div>`; }
      );
      rec?.start();
    });
  }
  draw();
}

const WRITING_TASKS = [
  "Introduce yourself: your name, where you live, and what you do (4–6 sentences).",
  "Describe what you did yesterday, from morning to evening.",
  "Write a short message to a friend inviting them to dinner this weekend.",
  "Describe your favourite place in Nepal to a foreign visitor.",
  "You bought a phone and it stopped working. Write a polite complaint to the shop.",
  "What do you want your life to look like in five years? Explain."
];

function renderWriting(head) {
  state.tutorContext = "English writing practice";
  const task = WRITING_TASKS[Math.floor(Math.random() * WRITING_TASKS.length)];
  view.innerHTML = `${head}
    ${aiGate("Writing feedback needs the AI connection")}
    <div class="practice-box">
      <p class="small">Your task (or write anything you like):</p>
      <div class="big-target">${esc(task)}</div>
      <textarea id="writing" placeholder="Write in English here…"></textarea>
      <div class="btn-row">
        <button class="btn" id="feedback-btn" ${state.ai ? "" : "disabled"}>Get feedback</button>
        <button class="btn ghost" data-nav="#/practice/english/write">New task</button>
      </div>
      <div id="write-result"></div>
    </div>`;
  $("#feedback-btn")?.addEventListener("click", async () => {
    const out = $("#write-result");
    const text = $("#writing").value.trim();
    if (text.length < 10) return out.innerHTML = `<div class="error-box">Write a few sentences first.</div>`;
    $("#feedback-btn").disabled = true;
    out.innerHTML = `<p><span class="spinner"></span>Your tutor is reading your writing…</p>`;
    try {
      const fb = await api("/api/english/feedback", { task, text });
      out.innerHTML = `
        <div class="score-line">Score: ${fb.score}/10</div>
        <p>${esc(fb.comment)}</p>
        ${fb.issues.length ? `<h2>Corrections</h2>${fb.issues.map((i) => `
          <div class="feedback-issue">
            <div>“${esc(i.original)}” → <span class="fix">“${esc(i.fixed)}”</span></div>
            <div class="small">${esc(i.explanation)}</div>
          </div>`).join("")}` : `<p class="result-good">No real errors found — excellent!</p>`}
        <h2>Your text, polished</h2>
        <div class="analysis-text">${esc(fb.corrected)}</div>
        <div class="btn-row"><button class="btn ghost" data-say="${esc(fb.corrected)}">🔊 Hear it read aloud</button></div>`;
    } catch (e) {
      out.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    }
    $("#feedback-btn").disabled = false;
  });
}

// -------------------------------------------------------- market (real data)
function drawCandles(canvas, bars) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const data = bars.slice(-Math.min(bars.length, Math.floor((W - 60) / 6)));
  const hi = Math.max(...data.map((b) => b.high)), lo = Math.min(...data.map((b) => b.low));
  const pad = (hi - lo) * 0.06 || 1;
  const y = (p) => 12 + (H - 40) * (1 - (p - lo + pad) / (hi - lo + 2 * pad));
  const cw = (W - 60) / data.length;

  // gridlines + price labels
  ctx.strokeStyle = "#e3e7e0"; ctx.fillStyle = "#8494a4";
  ctx.font = "10.5px 'IBM Plex Mono', monospace";
  for (let i = 0; i <= 4; i++) {
    const p = lo + ((hi - lo) * i) / 4;
    ctx.beginPath(); ctx.moveTo(0, y(p)); ctx.lineTo(W - 54, y(p)); ctx.stroke();
    ctx.fillText(p >= 1000 ? p.toFixed(0) : p.toFixed(2), W - 50, y(p) + 4);
  }
  data.forEach((b, i) => {
    const x = i * cw + cw / 2;
    const up = b.close >= b.open;
    ctx.strokeStyle = ctx.fillStyle = up ? "#2e6e4e" : "#b0392f";
    ctx.beginPath(); ctx.moveTo(x, y(b.high)); ctx.lineTo(x, y(b.low)); ctx.stroke();
    const top = y(Math.max(b.open, b.close)), bot = y(Math.min(b.open, b.close));
    ctx.fillRect(x - Math.max(1.5, cw * 0.3), top, Math.max(3, cw * 0.6), Math.max(1, bot - top));
  });
  // date labels
  ctx.fillStyle = "#8494a4";
  [0, Math.floor(data.length / 2), data.length - 1].forEach((i) => {
    if (data[i]) ctx.fillText(data[i].date, Math.min(i * cw, W - 130), H - 6);
  });
}

async function renderMarket(topicId) {
  const topic = topicById(topicId);
  renderNav(topicId);
  state.tutorContext = "Practising technical analysis on real market charts";
  view.innerHTML = `
    ${crumb(topic, "Real charts")}
    <div class="eyebrow">Real market data · daily candles</div>
    <h1>Chart reading practice</h1>
    <p class="lede">Load a real stock, read the chart yourself first — then let the AI walk through it and quiz you on what you saw.</p>
    <div class="market-bar">
      <input type="text" id="sym-input" value="AAPL" style="width:120px;text-transform:uppercase" />
      <select id="months-sel">
        <option value="6">6 months</option>
        <option value="12" selected>1 year</option>
        <option value="24">2 years</option>
      </select>
      <button class="btn" id="load-btn">Load chart</button>
      <span class="small">Try AAPL, MSFT, TSLA, NVDA, KO, ^SPX…</span>
    </div>
    <div id="chart-wrap" hidden>
      <div class="price-line" id="price-line"></div>
      <canvas id="chart-canvas"></canvas>
      <div class="btn-row">
        <button class="btn marker" id="analyze-btn" ${state.ai ? "" : "disabled"}>🧠 Teach me this chart</button>
      </div>
      ${aiGate("AI chart walkthroughs need the AI connection")}
      <div id="analysis-out"></div>
    </div>
    <div id="market-error"></div>`;

  let current = null;
  async function load() {
    $("#market-error").innerHTML = `<p><span class="spinner"></span>Fetching real market data…</p>`;
    try {
      current = await api(`/api/market?symbol=${encodeURIComponent($("#sym-input").value)}&months=${$("#months-sel").value}`);
      $("#market-error").innerHTML = "";
      $("#chart-wrap").hidden = false;
      const bars = current.bars;
      const last = bars[bars.length - 1], first = bars[0];
      const chg = ((last.close - first.close) / first.close) * 100;
      $("#price-line").innerHTML = `${esc(current.symbol)} · last close <strong>${last.close}</strong> (${last.date}) · period <span class="${chg >= 0 ? "price-up" : "price-down"}">${chg >= 0 ? "+" : ""}${chg.toFixed(1)}%</span> · ${bars.length} trading days`;
      drawCandles($("#chart-canvas"), bars);
      $("#analysis-out").innerHTML = "";
    } catch (e) {
      $("#market-error").innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    }
  }
  $("#load-btn").addEventListener("click", load);
  $("#sym-input").addEventListener("keydown", (e) => e.key === "Enter" && load());
  window.addEventListener("resize", () => {
    const canvas = $("#chart-canvas");
    if (current && canvas) drawCandles(canvas, current.bars);
  }, { passive: true });
  load();

  $("#analyze-btn")?.addEventListener("click", async () => {
    if (!current) return;
    const out = $("#analysis-out");
    $("#analyze-btn").disabled = true;
    out.innerHTML = `<p><span class="spinner"></span>Your tutor is reading the chart… (15–60 seconds)</p>`;
    state.tutorContext = `Analysing a real ${current.symbol} chart together`;
    try {
      const r = await api("/api/analyze/chart", { symbol: current.symbol, bars: current.bars });
      out.innerHTML = `
        <h2>Walkthrough</h2>
        <div class="analysis-text">${esc(r.analysis)}</div>
        <h2>Now you — about this exact chart</h2>
        ${r.questions.map((q, qi) => `
          <div class="quiz-q">
            <h3>${qi + 1}. ${esc(q.question)}</h3>
            ${q.options.map((o, oi) => `<button class="quiz-opt" data-cq="${qi}" data-co="${oi}">${esc(o)}</button>`).join("")}
            <div class="quiz-expl" hidden>${esc(q.explanation)}</div>
          </div>`).join("")}`;
      out.querySelectorAll(".quiz-opt").forEach((b) => b.addEventListener("click", () => {
        const q = r.questions[+b.dataset.cq];
        const box = b.closest(".quiz-q");
        box.querySelectorAll(".quiz-opt").forEach((x) => {
          x.disabled = true;
          if (+x.dataset.co === q.answerIndex) x.classList.add("correct");
        });
        if (+b.dataset.co !== q.answerIndex) b.classList.add("wrong");
        box.querySelector(".quiz-expl").hidden = false;
      }));
    } catch (e) {
      out.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    }
    $("#analyze-btn").disabled = false;
  });
}

async function renderCompany(topicId) {
  const topic = topicById(topicId);
  renderNav(topicId);
  state.tutorContext = "Studying a real company's fundamentals";
  view.innerHTML = `
    ${crumb(topic, "Company case study")}
    <div class="eyebrow">Real fundamentals · live web data</div>
    <h1>Company case study</h1>
    <p class="lede">Name a real company. The AI searches the web for its current numbers and teaches you how to read them.</p>
    ${aiGate("Case studies need the AI connection")}
    <div class="market-bar">
      <input type="text" id="company-input" placeholder="e.g. Apple, Coca-Cola, Unilever, Toyota…" style="flex:1;min-width:240px" />
      <button class="btn" id="company-btn" ${state.ai ? "" : "disabled"}>Build case study</button>
    </div>
    <div id="company-out"></div>`;
  const go = async () => {
    const q = $("#company-input").value.trim();
    if (!q) return;
    const out = $("#company-out");
    $("#company-btn").disabled = true;
    out.innerHTML = `<p><span class="spinner"></span>Searching the web and building your case study… (30–90 seconds)</p>`;
    try {
      const r = await api("/api/company", { query: q });
      out.innerHTML = `<h2>${esc(q)}</h2><div class="analysis-text">${esc(r.study)}</div>
        <p class="small">Discuss it further with your tutor — press the red <strong>?</strong> button.</p>`;
      state.tutorContext = `Discussing the fundamentals case study of ${q}`;
    } catch (e) {
      out.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
    }
    $("#company-btn").disabled = false;
  };
  $("#company-btn").addEventListener("click", go);
  $("#company-input").addEventListener("keydown", (e) => e.key === "Enter" && go());
}

// -------------------------------------------------------------- new topic
function promptNewTopic() {
  const name = (prompt("What do you want to learn? (e.g. Python, Photography, Accounting)") || "").trim();
  if (!name) return;
  const id = "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (topicById(id)) return alert("That topic already exists.");
  const topic = {
    id, name, nameLocal: "", kind: "custom", icon: "✎",
    description: `Learn ${name} from the ground up.`,
    levels: ["Foundations", "Core Ideas", "Applied", "Deep", "Expert"],
    lessonCount: 0
  };
  state.topics.push(topic);
  saveCustomTopics();
  state.lessons[id] = [];
  location.hash = `#/topic/${id}`;
}

// ------------------------------------------------------------------ tutor
function renderTutorLog() {
  const log = $("#tutor-log");
  log.innerHTML = state.tutor.length
    ? state.tutor.map((m) => `<div class="msg ${m.role}">${esc(m.content)}</div>`).join("")
    : `<div class="msg assistant">नमस्ते! I'm your tutor. Ask me anything about what you're studying — in English or Nepali.</div>`;
  log.scrollTop = log.scrollHeight;
}

function setupTutor() {
  const panel = $("#tutor-panel");
  $("#tutor-fab").addEventListener("click", () => {
    panel.classList.toggle("hidden");
    $("#tutor-context").textContent = state.tutorContext;
    renderTutorLog();
    if (!panel.classList.contains("hidden")) $("#tutor-input").focus();
  });
  $("#tutor-close").addEventListener("click", () => panel.classList.add("hidden"));
  $("#tutor-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#tutor-input");
    const q = input.value.trim();
    if (!q) return;
    if (!state.ai) {
      state.tutor.push({ role: "user", content: q }, { role: "assistant", content: "The AI tutor isn't connected yet. Set ANTHROPIC_API_KEY and restart the server, then I can answer anything." });
      input.value = ""; renderTutorLog(); return;
    }
    state.tutor.push({ role: "user", content: q });
    input.value = "";
    renderTutorLog();
    $("#tutor-log").insertAdjacentHTML("beforeend", `<div class="msg thinking" id="thinking">tutor is thinking…</div>`);
    $("#tutor-log").scrollTop = $("#tutor-log").scrollHeight;
    try {
      const r = await api("/api/chat", { context: state.tutorContext, messages: state.tutor });
      state.tutor.push({ role: "assistant", content: r.reply });
    } catch (err) {
      state.tutor.push({ role: "assistant", content: "⚠ " + err.message });
    }
    renderTutorLog();
  });
}

// ----------------------------------------------------------------- router
async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  window.scrollTo(0, 0);
  try {
    switch (parts[0]) {
      case "topic": return await renderTopic(parts[1]);
      case "lesson": return await renderLesson(parts[1]);
      case "quiz": return await renderQuiz(parts[1]);
      case "cards": return await renderCards(parts[1]);
      case "review": return await renderReview();
      case "practice": return await renderPractice(parts[1], parts[2] || "listen");
      case "market": return await renderMarket(parts[1]);
      case "company": return await renderCompany(parts[1]);
      default: return renderHome();
    }
  } catch (e) {
    view.innerHTML = `<div class="error-box">${esc(e.message)}</div><a class="btn ghost" href="#/">Back home</a>`;
  }
}

// global click delegation for data-nav / data-say
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (nav) { location.hash = nav.dataset.nav; return; }
  const say = e.target.closest("[data-say]");
  if (say) speak(say.dataset.say);
});

async function boot() {
  state.topics = [
    ...window.SEED.TOPICS.map((t) => ({ ...t })),
    ...store.read("kapi.topics", [])
  ];
  state.progress = store.read("kapi.progress", { lessons: {}, cards: {}, meta: {} });
  state.progress.meta = state.progress.meta || {};
  await loadAllLessons();
  try {
    const status = await api("/api/status");
    state.ai = status.aiAvailable;
    const ai = $("#ai-status");
    ai.textContent = state.ai ? `AI tutor connected` : "AI offline — starter lessons only";
    ai.classList.add(state.ai ? "on" : "off");
  } catch {
    $("#ai-status").textContent = "server unreachable";
  }
  $("#add-topic-btn").addEventListener("click", promptNewTopic);
  setupTutor();
  window.addEventListener("hashchange", route);
  route();
}

boot();
