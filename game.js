"use strict";

/* ==========================================================================
   DuoDuel — game logic + curated sample data
   --------------------------------------------------------------------------
   1. Curated data   (Word Vault synonyms, Hidden Connections groups, demo squad)
   2. Saved progress (localStorage: gems, streak, daily best, squad gems)
   3. Small helpers  (screens, shuffle, animations)
   4. Hub + squad
   5. Game 1: Word Vault
   6. Game 2: Hidden Connections
   7. Results + chest
   ========================================================================== */


/* ---------- 1. CURATED DATA ---------- */

// Scores turn into gems at this rate: 10 points = 1 gem.
const POINTS_PER_GEM = 10;

// WORD VAULT
// The player types a synonym for the current word. Every word below is a synonym of
// "feliz", so any unused one is accepted at any step. Rarer words score more.
// Accents are optional and feminine/plural forms count (contenta, alegres...).
const WORD_VAULT = {
  start: "feliz",
  steps: 4,
  points: { common: 100, uncommon: 150, rare: 250 },
  comboStep: 50, // each correct answer in a row adds +50 more
  words: {
    feliz:      { rarity: "common",   meaning: "happy",
                  example: "Hoy estoy muy feliz. — I'm really happy today." },
    contento:   { rarity: "common",   meaning: "pleased, content",
                  example: "Estoy contento con mi nota. — I'm pleased with my grade." },
    alegre:     { rarity: "common",   meaning: "cheerful, joyful",
                  example: "Mi abuela siempre está alegre. — My grandma is always cheerful." },
    encantado:  { rarity: "common",   meaning: "delighted",
                  example: "Estoy encantado con el regalo. — I'm delighted with the gift." },
    dichoso:    { rarity: "uncommon", meaning: "blissful, fortunate",
                  example: "¡Qué día tan dichoso! — What a blissful day!" },
    radiante:   { rarity: "uncommon", meaning: "radiant, beaming",
                  example: "Llegó radiante a la fiesta. — She arrived at the party beaming." },
    eufórico:   { rarity: "uncommon", meaning: "euphoric, over the moon",
                  example: "Después del gol, todos estaban eufóricos. — After the goal, everyone was over the moon." },
    animado:    { rarity: "uncommon", meaning: "upbeat, in good spirits",
                  example: "El grupo está muy animado hoy. — The group is really upbeat today." },
    jubiloso:   { rarity: "rare",     meaning: "jubilant",
                  example: "El equipo jubiloso celebró la victoria. — The jubilant team celebrated the win." },
    exultante:  { rarity: "rare",     meaning: "exultant, bursting with joy",
                  example: "Salió exultante del examen. — She left the exam bursting with joy." },
    risueño:    { rarity: "rare",     meaning: "smiley, always smiling",
                  example: "Es un niño muy risueño. — He's a very smiley kid." },
    gozoso:     { rarity: "rare",     meaning: "joyful, full of delight",
                  example: "Fue un reencuentro gozoso. — It was a joyful reunion." },
    alborozado: { rarity: "rare",     meaning: "elated, overjoyed",
                  example: "El público estaba alborozado. — The crowd was elated." },
  },
  // Common wrong guesses get a short explanation instead of a generic "try again".
  nearMisses: {
    triste:   "“Triste” means sad — the exact opposite.",
    molesto:  "Sneaky one! “Molesto” means annoyed or bothered.",
    enojado:  "“Enojado” means angry. Not quite the vibe.",
    sensible: "False friend! “Sensible” means sensitive, not happy.",
    cansado:  "“Cansado” means tired. Happy-tired maybe, but not a synonym.",
    tranquilo:"“Tranquilo” means calm. Close in mood, but not happy.",
    bueno:    "“Bueno” means good. Think about a feeling, not a quality.",
    happy:    "Right idea, wrong language! Try it in Spanish.",
  },
};

// HIDDEN CONNECTIONS
// Groups go from easiest (yellow) to trickiest (purple). Red herrings are on purpose:
// "naranja" looks like a fruit, "rosa" like a flower, "ratón" like office gear.
const CONNECTIONS = {
  maxMistakes: 4,
  pointsPerGroup: 100,       // 4 groups = 400
  pointsPerSpareMistake: 50, // unused mistakes are a bonus when you win (up to +200)
  hintCost: 150,             // using the hint lowers the max reward by 150 points (15 gems)
  groups: [
    { name: "Animals", color: "yellow", words: ["gato", "perro", "ratón", "conejo"],
      explain: "cat, dog, mouse, rabbit. Ratón is also a computer mouse." },
    { name: "Fruits", color: "green", words: ["fresa", "limón", "piña", "uva"],
      explain: "strawberry, lemon, pineapple, grape." },
    { name: "Colors", color: "blue", words: ["naranja", "rosa", "morado", "gris"],
      explain: "orange, pink, purple, gray. Naranja is a fruit too — sneaky." },
    { name: "False friends", color: "purple", words: ["ropa", "éxito", "carpeta", "librería"],
      explain: "ropa = clothes (not rope), éxito = success (not exit), carpeta = folder (not carpet), librería = bookstore (not library)." },
  ],
};

// DEMO SQUAD — sample players and squads only. "You" is added live from your saved progress.
const SQUAD = {
  name: "Las Palabras Locas",
  chestGoal: 600,
  teammates: [
    { name: "Mateo", color: "#ff9600", gems: 180 },
    { name: "Aisha", color: "#ce82ff", gems: 140 },
    { name: "Lena", color: "#ff4b4b", gems: 95 },
  ],
  rivals: [
    { name: "Team Tortilla", gems: 610 },
    { name: "Verbos Valientes", gems: 540 },
    { name: "Los Acentos", gems: 470 },
    { name: "Gramática Gang", gems: 385 },
  ],
};

const GAMES = {
  wordVault: { name: "Word Vault", start: () => startWordVault() },
  connections: { name: "Hidden Connections", start: () => startConnections() },
};

// Small inline icons (drawn in CSS) so the UI doesn't depend on emoji.
const GEM = `<i class="ico-gem"></i>`;


/* ---------- 2. SAVED PROGRESS (localStorage) ---------- */

const STORAGE_KEY = "duoduel-progress-v1";

function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
const today = () => dateKey(new Date());
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}
function weekStart() { // Monday of this week
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}

function freshState() {
  return {
    gems: 0,            // personal gems, all time
    squadGems: 0,       // what you added to the squad chest this week
    week: weekStart(),
    streak: 0,
    lastPlayed: null,   // date of last finished game
    best: { date: today(), wordVault: 0, connections: 0 },
  };
}

function loadState() {
  let s = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) s = { ...s, ...saved };
  } catch (e) { /* storage blocked or corrupt: start fresh */ }

  if (s.week !== weekStart()) { s.week = weekStart(); s.squadGems = 0; } // new week, new chest
  if (!s.best || s.best.date !== today()) s.best = { date: today(), wordVault: 0, connections: 0 };
  if (s.lastPlayed && s.lastPlayed !== today() && s.lastPlayed !== yesterday()) s.streak = 0; // missed a day
  return s;
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

let state = loadState();

// Called once per finished game. Replays count too, but never wipe anything.
function recordFinish(game, score, gems) {
  if (state.lastPlayed !== today()) {
    state.streak = state.lastPlayed === yesterday() ? state.streak + 1 : 1;
    state.lastPlayed = today();
  }
  state.gems += gems;
  state.squadGems += gems;
  const newBest = score > state.best[game];
  if (newBest) state.best[game] = score;
  saveState();
  return { newBest };
}


/* ---------- 3. SMALL HELPERS ---------- */

const $ = (sel) => document.querySelector(sel);
const toGems = (score) => Math.round(score / POINTS_PER_GEM);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => { el.hidden = el.id !== id; });
  document.body.dataset.screen = id;
  window.scrollTo(0, 0);
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHTML(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Re-trigger a CSS animation class (e.g. "shake") even if it ran before.
function replayAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// Little "+200" that floats up from an element.
function floatText(text, anchor, cls = "") {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + window.scrollY}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1000);
}

function countUp(el, from, to, ms = 700) {
  if (reduceMotion || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const setProgress = (el, fraction) => { el.style.width = `${Math.round(fraction * 100)}%`; };


/* ---------- 4. HUB + SQUAD ---------- */

function renderTopbar() {
  $("#streakCount").textContent = state.streak;
  $("#gemCount").textContent = state.gems;
  $("#streakPill").classList.toggle("is-cold", state.lastPlayed !== today());
}

function renderHub() {
  renderTopbar();

  const playedToday = state.lastPlayed === today();
  $("#streakNote").textContent =
    state.streak === 0 ? "Each game takes under a minute. Finish one to start a streak."
    : playedToday ? `Your ${state.streak}-day streak is safe today. Go for a new best?`
    : `Play one game to keep your ${state.streak}-day streak alive.`;

  const bestText = (score) => (score ? `Today's best: ${score}` : "Not played yet today");
  $("#bestWordVault").textContent = bestText(state.best.wordVault);
  $("#bestConnections").textContent = bestText(state.best.connections);

  renderSquad();
}

const squadTotal = () => SQUAD.teammates.reduce((sum, m) => sum + m.gems, 0) + state.squadGems;

function renderSquad() {
  const total = squadTotal();
  const pct = Math.min(100, (total / SQUAD.chestGoal) * 100);

  const members = [{ name: "You", color: "#1cb0f6", gems: state.squadGems, you: true }, ...SQUAD.teammates]
    .sort((a, b) => b.gems - a.gems);

  const league = [...SQUAD.rivals, { name: SQUAD.name, gems: total, you: true }]
    .sort((a, b) => b.gems - a.gems);

  $("#squadPanel").innerHTML = `
    <div class="panel-head">
      <h3>${SQUAD.name} <span class="demo-tag">demo</span></h3>
      <span class="muted small">Weekly squad chest</span>
    </div>
    <div class="chest-row">
      <div class="progress big"><div class="progress-fill gold" style="width:${pct}%"></div></div>
      <b class="chest-count">${total} / ${SQUAD.chestGoal} ${GEM}</b>
    </div>
    <p class="muted small">${total >= SQUAD.chestGoal
      ? "Chest full! Everyone gets the bonus when the week ends."
      : `${SQUAD.chestGoal - total} gems to unlock. Every game you finish adds your gems here.`}</p>

    <div class="squad-cols">
      <div>
        <h4>Members</h4>
        <ul class="members">
          ${members.map((m) => `
            <li class="${m.you ? "is-you" : ""}">
              <span class="avatar" style="background:${m.color}">${m.name[0]}</span>
              <span class="member-name">${m.name}</span>
              <b>${m.gems}</b>
            </li>`).join("")}
        </ul>
      </div>
      <div>
        <h4>Squad League</h4>
        <ol class="league">
          ${league.map((s, i) => `
            <li class="${s.you ? "is-you" : ""}">
              <span class="rank rank-${i + 1}">${i + 1}</span>
              <span class="member-name">${s.name}</span>
              <b>${s.gems}</b>
            </li>`).join("")}
        </ol>
      </div>
    </div>
    <p class="demo-note">Teammates, rival squads and their gem totals are sample demo data.</p>
  `;
}

function goHome() {
  hideSheet();
  renderHub();
  showScreen("hub");
}


/* ---------- 5. GAME 1: WORD VAULT ---------- */

// Compare words without accents, capitals or punctuation: "Eufórico" → "euforico".
const normalize = (text) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

// Lookup tables from normalized spelling → the curated word.
const WORD_LOOKUP = Object.fromEntries(Object.keys(WORD_VAULT.words).map((w) => [normalize(w), w]));
const MISS_LOOKUP = Object.fromEntries(Object.keys(WORD_VAULT.nearMisses).map((w) => [normalize(w), w]));

// Also accept feminine and plural forms: contenta, alegres, dichosas...
function findIn(lookup, typed) {
  const n = normalize(typed);
  const forms = [n, n.replace(/s$/, ""), n.replace(/es$/, ""), n.replace(/as?$/, "o"), n.replace(/os$/, "o")];
  const hit = forms.find((f) => lookup[f]);
  return hit ? lookup[hit] : null;
}

const wv = {}; // current round

function startWordVault() {
  Object.assign(wv, {
    step: 0,
    chain: [WORD_VAULT.start],
    score: 0,
    combo: 0,
    bestCombo: 0,
    retries: 0,
    hints: 0,
    answered: false,
  });
  hideSheet();
  showScreen("wordvault");
  renderWordVault();
}

const currentWord = () => wv.chain[wv.chain.length - 1];

function renderWordVault() {
  const word = currentWord();
  setProgress($("#wvProgress"), wv.step / WORD_VAULT.steps);
  $("#wvStepLabel").textContent = `${wv.step + 1} of ${WORD_VAULT.steps}`;
  $("#wvTarget").textContent = word;
  $("#wvTargetMeaning").textContent = WORD_VAULT.words[word].meaning;
  $("#wvScore").textContent = wv.score;
  $("#wvHintLine").hidden = true;
  $("#wvHint").disabled = false;

  const input = $("#wvInput");
  input.value = "";
  input.disabled = false;
  input.className = "answer-input";
  $("#wvCheck").disabled = false;
  input.focus({ preventScroll: true });

  renderCombo();
  renderChain();
}

function renderChain(popLast = false) {
  const links = wv.chain.map((word, i) => {
    const rarity = i === 0 ? "start" : WORD_VAULT.words[word].rarity;
    const pop = popLast && i === wv.chain.length - 1 ? " pop" : "";
    return `<span class="chip ${rarity}${pop}">${word}</span>`;
  });
  for (let i = wv.chain.length; i <= WORD_VAULT.steps; i++) links.push(`<span class="chip empty">?</span>`);
  $("#wvChain").innerHTML = links.join(`<span class="arrow" aria-hidden="true">→</span>`);
}

function renderCombo() {
  const el = $("#wvCombo");
  el.textContent = `Combo ${wv.combo}x`;
  el.classList.toggle("is-hot", wv.combo >= 2);
}

function submitWord(event) {
  event.preventDefault();
  if (wv.answered) return;

  const input = $("#wvInput");
  const typed = input.value.trim();
  if (!typed) { replayAnimation(input, "shake"); input.focus(); return; }

  const match = findIn(WORD_LOOKUP, typed);
  input.blur(); // closes the phone keyboard so the feedback is visible

  // Already used: a gentle nudge, no penalty.
  if (match && wv.chain.includes(match)) {
    showSheet({
      kind: "wrong",
      title: "Already in your chain",
      body: `You've used <b>${match}</b>. Find a new word.`,
      button: "Try again",
      onNext: retryWord,
    });
    return;
  }

  if (match) { acceptWord(match); return; }

  // Wrong: explain, keep earned points, let them retry. Combo resets.
  wv.combo = 0;
  wv.retries++;
  renderCombo();
  input.classList.add("is-wrong");
  replayAnimation(input, "shake");

  const miss = findIn(MISS_LOOKUP, typed);
  showSheet({
    kind: "wrong",
    title: "Not quite",
    body: miss
      ? WORD_VAULT.nearMisses[miss]
      : `“${escapeHTML(typed)}” isn't on our list of synonyms for <b>${currentWord()}</b>. Check the spelling or try another word.`,
    example: "Your points are safe.",
    button: "Try again",
    onNext: retryWord,
  });
}

function retryWord() {
  hideSheet();
  const input = $("#wvInput");
  input.classList.remove("is-wrong");
  input.select();
  input.focus();
}

function acceptWord(word) {
  const info = WORD_VAULT.words[word];
  wv.answered = true;
  wv.combo++;
  wv.bestCombo = Math.max(wv.bestCombo, wv.combo);

  const base = WORD_VAULT.points[info.rarity];
  const bonus = WORD_VAULT.comboStep * (wv.combo - 1);
  const oldScore = wv.score;
  wv.score += base + bonus;
  wv.chain.push(word);

  const input = $("#wvInput");
  input.value = word;
  input.disabled = true;
  input.className = `answer-input is-right ${info.rarity}`;
  $("#wvCheck").disabled = true;
  $("#wvHint").disabled = true;

  floatText(`+${base + bonus}`, input, info.rarity);
  countUp($("#wvScore"), oldScore, wv.score, 500);
  setProgress($("#wvProgress"), (wv.step + 1) / WORD_VAULT.steps);
  renderChain(true);
  renderCombo();
  if (wv.combo >= 2) replayAnimation($("#wvCombo"), "bump");

  const titles = { common: "Nice!", uncommon: "Ooh, uncommon!", rare: "Rare find!" };
  const isLast = wv.step === WORD_VAULT.steps - 1;
  showSheet({
    kind: "right",
    title: titles[info.rarity],
    points: `+${base}${bonus ? ` · +${bonus} combo` : ""}`,
    body: `<b>${word}</b> — ${info.meaning}`,
    example: info.example,
    button: isLast ? "Open the vault" : "Continue",
    onNext: nextWordStep,
  });
}

function nextWordStep() {
  hideSheet();
  wv.step++;
  wv.answered = false;
  if (wv.step >= WORD_VAULT.steps) finishWordVault();
  else renderWordVault();
}

// Hint: first letter + length of an unused word (common ones first). Costs your combo.
function showWordHint() {
  if (wv.answered) return;
  const order = ["common", "uncommon", "rare"];
  const options = Object.entries(WORD_VAULT.words)
    .filter(([w]) => !wv.chain.includes(w))
    .sort((a, b) => order.indexOf(a[1].rarity) - order.indexOf(b[1].rarity));
  const [word] = options[0];

  wv.hints++;
  wv.combo = 0;
  renderCombo();
  const blanks = word.slice(1).replace(/./g, " _");
  const line = $("#wvHintLine");
  line.innerHTML = `Try <b>${word[0]}${blanks}</b> (${word.length} letters). Hints reset your combo.`;
  line.hidden = false;
  $("#wvHint").disabled = true;
  $("#wvInput").focus();
}

function finishWordVault() {
  const picks = wv.chain.slice(1).map((w) => WORD_VAULT.words[w].rarity);
  const rare = picks.filter((r) => r === "rare").length;
  const chainHTML = wv.chain
    .map((w, i) => `<span class="chip ${i === 0 ? "start" : WORD_VAULT.words[w].rarity}">${w}</span>`)
    .join(`<span class="arrow">→</span>`);
  const unusedRare = Object.keys(WORD_VAULT.words)
    .filter((w) => WORD_VAULT.words[w].rarity === "rare" && !wv.chain.includes(w));

  showResults({
    game: "wordVault",
    title: rare === WORD_VAULT.steps ? "Vault cracked. All rare words!" : "Vault cracked!",
    subtitle: "Four synonyms, zero multiple choice.",
    score: wv.score,
    detail: `
      <h3>Your chain</h3>
      <div class="chain final">${chainHTML}</div>
      <ul class="facts">
        <li><b>${rare}/${WORD_VAULT.steps}</b> rare words</li>
        <li><b>${wv.bestCombo}x</b> best combo</li>
        <li><b>${wv.retries}</b> ${wv.retries === 1 ? "retry" : "retries"}</li>
        <li><b>${wv.hints}</b> ${wv.hints === 1 ? "hint" : "hints"}</li>
      </ul>
      ${unusedRare.length ? `<p class="muted small">Rare words to try next time: <b>${unusedRare.join(", ")}</b></p>` : ""}`,
  });
}

// Bottom feedback sheet (used by Word Vault)
let sheetAction = null;

function showSheet({ kind, title, points = "", body, example = "", button, onNext }) {
  const sheet = $("#sheet");
  sheet.className = `sheet ${kind}`;
  $("#sheetIcon").textContent = kind === "right" ? "✓" : "✕";
  $("#sheetTitle").textContent = title;
  $("#sheetPoints").textContent = points;
  $("#sheetBody").innerHTML = body;
  $("#sheetExample").textContent = example;
  $("#sheetBtn").textContent = button;
  $("#sheetBtn").className = kind === "right" ? "btn" : "btn btn-red";
  sheetAction = onNext;
  sheet.hidden = false;
  replayAnimation(sheet, "slide-up");
}

function hideSheet() {
  $("#sheet").hidden = true;
  sheetAction = null;
}


/* ---------- 6. GAME 2: HIDDEN CONNECTIONS ---------- */

const hc = {}; // current round

function startConnections() {
  const tiles = CONNECTIONS.groups.flatMap((g, gi) => g.words.map((word) => ({ word, group: gi })));
  Object.assign(hc, {
    tiles: shuffle(tiles),
    selected: new Set(),
    solved: [],         // [{ group, byPlayer }]
    tried: new Set(),   // guesses already made, so repeats don't cost a mistake
    mistakes: 0,
    hintUsed: false,
    hintWord: null,
    over: false,
  });
  showScreen("connections");
  setMessage("Tap four words that belong together, then hit Check.");
  renderConnections();
}

const groupOf = (word) => hc.tiles.find((t) => t.word === word).group;
const isSolved = (gi) => hc.solved.some((s) => s.group === gi);

// Score = 100 per group you solve + 50 per unused mistake (only if you finish) − hint cost.
function connectionsScore() {
  const solvedByPlayer = hc.solved.filter((s) => s.byPlayer).length;
  const won = solvedByPlayer === CONNECTIONS.groups.length;
  const spare = CONNECTIONS.maxMistakes - hc.mistakes;
  let score = solvedByPlayer * CONNECTIONS.pointsPerGroup;
  if (won) score += spare * CONNECTIONS.pointsPerSpareMistake;
  if (hc.hintUsed) score -= CONNECTIONS.hintCost;
  return Math.max(0, score);
}

// Best possible result from here, shown live so players see what mistakes and hints cost.
function maxPossibleGems() {
  const spare = CONNECTIONS.maxMistakes - hc.mistakes;
  const max = CONNECTIONS.groups.length * CONNECTIONS.pointsPerGroup
    + spare * CONNECTIONS.pointsPerSpareMistake
    - (hc.hintUsed ? CONNECTIONS.hintCost : 0);
  return toGems(max);
}

function renderConnections() {
  renderSolved();
  renderGrid();
  renderStatus();
}

function groupBarHTML(gi, extra = "", label = "") {
  const g = CONNECTIONS.groups[gi];
  return `
    <div class="group-bar ${g.color}${extra}">
      <b>${g.name}${label}</b>
      <span class="group-words">${g.words.join(" · ")}</span>
      <span class="group-explain">${g.explain}</span>
    </div>`;
}

function renderSolved(newGroup = -1) {
  $("#hcSolved").innerHTML = hc.solved
    .map(({ group }) => groupBarHTML(group, group === newGroup ? " pop" : ""))
    .join("");
}

function renderGrid() {
  const grid = $("#hcGrid");
  grid.innerHTML = "";
  hc.tiles.filter((t) => !isSolved(t.group)).forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tile-word";
    btn.textContent = t.word;
    btn.dataset.word = t.word;
    btn.classList.toggle("is-selected", hc.selected.has(t.word));
    btn.classList.toggle("is-hinted", hc.hintWord === t.word);
    btn.disabled = hc.over;
    btn.addEventListener("click", () => toggleTile(t.word));
    grid.append(btn);
  });
}

function renderStatus() {
  const left = CONNECTIONS.maxMistakes - hc.mistakes;
  $("#hcDots").innerHTML = Array.from({ length: CONNECTIONS.maxMistakes },
    (_, i) => `<span class="dot${i < left ? "" : " used"}"></span>`).join("");
  $("#hcMax").innerHTML = `${GEM} ${maxPossibleGems()} max`;
  setProgress($("#hcProgress"), hc.solved.length / CONNECTIONS.groups.length);

  $("#hcSubmit").disabled = hc.over || hc.selected.size !== 4;
  $("#hcClear").disabled = hc.over || hc.selected.size === 0;
  $("#hcShuffle").disabled = hc.over;
  $("#hcHint").disabled = hc.over || hc.hintUsed;
}

function setMessage(text, kind = "") {
  const el = $("#hcMessage");
  el.textContent = text;
  el.className = `message ${kind}`;
  if (kind) replayAnimation(el, "bump");
}

function toggleTile(word) {
  if (hc.over) return;
  if (hc.selected.has(word)) hc.selected.delete(word);
  else if (hc.selected.size < 4) hc.selected.add(word);
  else { setMessage("Four words max. Tap one to deselect it."); return; }

  document.querySelectorAll(".tile-word").forEach((b) => {
    b.classList.toggle("is-selected", hc.selected.has(b.dataset.word));
  });
  renderStatus();
}

function submitGroup() {
  if (hc.over || hc.selected.size !== 4) return;
  const picks = [...hc.selected];
  const key = [...picks].sort().join("|");

  if (hc.tried.has(key)) {
    setMessage("You already tried those four. No penalty — mix it up!");
    return;
  }
  hc.tried.add(key);

  // How many of the picks share the most common group?
  const counts = {};
  picks.forEach((w) => { const g = groupOf(w); counts[g] = (counts[g] || 0) + 1; });
  const [topGroup, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (topCount === 4) {
    solveGroup(Number(topGroup));
    return;
  }

  // Wrong guess
  hc.mistakes++;
  const left = CONNECTIONS.maxMistakes - hc.mistakes;
  document.querySelectorAll(".tile-word.is-selected").forEach((b) => replayAnimation(b, "shake"));
  const lead = topCount === 3 ? "One away! Three of those belong together." : "Not a group.";
  setMessage(`${lead} ${left} ${left === 1 ? "mistake" : "mistakes"} left.`, "bad");
  renderStatus();
  if (left === 0) endConnections(false);
}

function solveGroup(gi) {
  const g = CONNECTIONS.groups[gi];
  hc.solved.push({ group: gi, byPlayer: true });
  hc.selected.clear();
  if (hc.hintWord && g.words.includes(hc.hintWord)) hc.hintWord = null;

  renderSolved(gi);
  renderGrid();
  renderStatus();
  floatText(`+${CONNECTIONS.pointsPerGroup}`, $("#hcGrid"));

  if (hc.solved.length === CONNECTIONS.groups.length) {
    setMessage("All four groups found. ¡Increíble!", "good");
    endConnections(true);
  } else {
    setMessage(`Solved: ${g.name}! ${CONNECTIONS.groups.length - hc.solved.length} to go.`, "good");
  }
}

function useHint() {
  if (hc.over || hc.hintUsed) return;
  const gi = CONNECTIONS.groups.findIndex((_, i) => !isSolved(i)); // easiest unsolved group
  const g = CONNECTIONS.groups[gi];
  hc.hintUsed = true;
  hc.hintWord = g.words[0];
  setMessage(`Hint: one group is “${g.name}”, and “${hc.hintWord}” is in it. Max reward −15.`, "hint");
  renderGrid();
  renderStatus();
  replayAnimation($("#hcMax"), "bump");
}

function endConnections(won) {
  hc.over = true;
  hc.selected.clear();

  if (!won) {
    // Reveal the groups they didn't get, so the round still teaches something.
    CONNECTIONS.groups.forEach((_, gi) => {
      if (!isSolved(gi)) hc.solved.push({ group: gi, byPlayer: false });
    });
    setMessage("Out of mistakes. Here's how they connect.", "bad");
  }
  renderConnections();
  setTimeout(() => finishConnections(won), won ? 1100 : 1800);
}

function finishConnections(won) {
  const solvedByPlayer = hc.solved.filter((s) => s.byPlayer).length;
  const bars = CONNECTIONS.groups.map((_, gi) => {
    const mine = hc.solved.find((s) => s.group === gi).byPlayer;
    return groupBarHTML(gi, "", mine ? " ✓" : " <small>(revealed)</small>");
  }).join("");

  showResults({
    game: "connections",
    title: !won ? "So close!" : hc.mistakes === 0 ? "Flawless!" : "All four cracked!",
    subtitle: won
      ? `Solved with ${hc.mistakes} ${hc.mistakes === 1 ? "mistake" : "mistakes"}${hc.hintUsed ? " and one hint" : ""}.`
      : `You found ${solvedByPlayer} of 4 groups. Practice round is one tap away.`,
    score: connectionsScore(),
    detail: `
      <h3>The four connections</h3>
      <div class="solved">${bars}</div>
      <ul class="facts">
        <li><b>${solvedByPlayer}/4</b> groups</li>
        <li><b>${hc.mistakes}/${CONNECTIONS.maxMistakes}</b> mistakes</li>
        <li><b>${hc.hintUsed ? "Yes" : "No"}</b> hint used</li>
      </ul>`,
  });
}


/* ---------- 7. RESULTS + CHEST ---------- */

let lastGame = "wordVault";

function showResults({ game, title, subtitle, score, detail }) {
  lastGame = game;
  const gems = toGems(score);
  const squadBefore = squadTotal();
  const { newBest } = recordFinish(game, score, gems);
  const squadAfter = squadTotal();

  showScreen("results");
  renderTopbar();

  $("#resTitle").textContent = title;
  $("#resSubtitle").textContent = subtitle;
  $("#resNewBest").hidden = !newBest;
  $("#resStreak").textContent = state.streak;
  $("#resScore").textContent = 0;
  $("#resGems").textContent = 0;
  $("#resDetail").innerHTML = detail;

  // Squad chest bar: start at the old total, then grow
  const bar = $("#resSquadBar");
  bar.style.transition = "none";
  setProgress(bar, Math.min(1, squadBefore / SQUAD.chestGoal));
  $("#resSquadText").textContent = `${squadAfter} / ${SQUAD.chestGoal}`;
  $("#resSquadNote").textContent = squadAfter >= SQUAD.chestGoal
    ? `+${gems} from you. Chest full! The squad bonus drops when the week ends.`
    : `+${gems} from you. ${SQUAD.chestGoal - squadAfter} more gems to unlock the squad chest.`;

  const other = game === "wordVault" ? "connections" : "wordVault";
  $("#resOther").textContent = `Play ${GAMES[other].name}`;
  $("#resOther").onclick = () => GAMES[other].start();

  openChest(gems);
  countUp($("#resScore"), 0, score, 800);
  setTimeout(() => {
    countUp($("#resGems"), 0, gems, 700);
    bar.style.transition = "";
    setProgress(bar, Math.min(1, squadAfter / SQUAD.chestGoal));
  }, reduceMotion ? 0 : 650);
}

function openChest(gems) {
  const chest = $("#chest");
  const burst = $("#chestBurst");
  chest.classList.remove("is-open", "wiggle");
  burst.innerHTML = "";
  if (gems <= 0) return;

  // A handful of gems fly out in a fan
  const count = Math.min(8, Math.max(3, Math.round(gems / 12)));
  for (let i = 0; i < count; i++) {
    const s = document.createElement("i");
    const angle = (-150 + (120 / (count - 1)) * i) * (Math.PI / 180);
    s.className = "ico-gem";
    s.style.setProperty("--dx", `${Math.cos(angle) * 90}px`);
    s.style.setProperty("--dy", `${Math.sin(angle) * 80}px`);
    s.style.animationDelay = `${0.45 + i * 0.04}s`;
    burst.append(s);
  }
  void chest.offsetWidth;
  chest.classList.add("wiggle");
  setTimeout(() => chest.classList.add("is-open"), reduceMotion ? 0 : 400);
}


/* ---------- WIRING ---------- */

document.querySelectorAll("[data-home]").forEach((b) => b.addEventListener("click", goHome));
document.querySelectorAll("[data-start]").forEach((b) =>
  b.addEventListener("click", () => GAMES[b.dataset.start].start()));

$("#wvForm").addEventListener("submit", submitWord);
$("#wvHint").addEventListener("click", showWordHint);
// Tapping back into the box after a miss dismisses the "Not quite" sheet.
$("#wvInput").addEventListener("focus", () => { if (!wv.answered && sheetAction) hideSheet(); });
$("#sheetBtn").addEventListener("click", () => sheetAction && sheetAction());
$("#hcSubmit").addEventListener("click", submitGroup);
$("#hcHint").addEventListener("click", useHint);
$("#hcClear").addEventListener("click", () => {
  hc.selected.clear();
  renderGrid();
  renderStatus();
});
$("#hcShuffle").addEventListener("click", () => {
  hc.tiles = shuffle(hc.tiles);
  renderGrid();
});
$("#resReplay").addEventListener("click", () => GAMES[lastGame].start());
$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset your demo gems, streak and daily bests?")) return;
  state = freshState();
  saveState();
  renderHub();
});

// Enter continues past the feedback sheet (Word Vault) or checks a group (Connections).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const screen = document.body.dataset.screen;
  if (screen === "wordvault" && sheetAction) {
    e.preventDefault();
    sheetAction();
  } else if (screen === "connections") {
    e.preventDefault();
    submitGroup();
  }
});

renderHub();
