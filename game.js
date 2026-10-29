"use strict";

/* ==========================================================================
   DuoDuel — game logic + curated sample data
   --------------------------------------------------------------------------
   1. Curated data   (Word Vault chain, Hidden Connections groups, demo squad)
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
// Each step has three choices: a common synonym, a rarer synonym, and a wrong word.
// Both valid choices lead into the same next step, so the chain always stays on track.
const WORD_VAULT = {
  start: "feliz",
  pointsByRarity: { common: 100, rare: 200 }, // rarer valid word = double points
  comboStep: 50, // each consecutive first-try correct answer adds +50 more
  steps: [
    {
      options: [
        { word: "contento", valid: true, rarity: "common", meaning: "pleased, content",
          example: "Estoy contento con mi nota. — I'm pleased with my grade." },
        { word: "dichoso", valid: true, rarity: "rare", meaning: "blissful, fortunate",
          example: "¡Qué día tan dichoso! — What a blissful day!" },
        { word: "triste", valid: false, why: "“Triste” means sad — the exact opposite of feliz." },
      ],
    },
    {
      options: [
        { word: "alegre", valid: true, rarity: "common", meaning: "cheerful, joyful",
          example: "Mi abuela siempre está alegre. — My grandma is always cheerful." },
        { word: "jubiloso", valid: true, rarity: "rare", meaning: "jubilant, full of joy",
          example: "El equipo jubiloso celebró la victoria. — The jubilant team celebrated the win." },
        { word: "molesto", valid: false, why: "Sneaky one! “Molesto” means annoyed or bothered." },
      ],
    },
    {
      options: [
        { word: "radiante", valid: true, rarity: "common", meaning: "radiant, beaming",
          example: "Llegó radiante a la fiesta. — She arrived at the party beaming." },
        { word: "risueño", valid: true, rarity: "rare", meaning: "smiley, always smiling",
          example: "Es un niño muy risueño. — He's a very smiley kid." },
        { word: "sensible", valid: false, why: "False friend! “Sensible” means sensitive, not happy (or sensible)." },
      ],
    },
    {
      options: [
        { word: "eufórico", valid: true, rarity: "common", meaning: "euphoric, over the moon",
          example: "Después del gol, todos estaban eufóricos. — After the goal, everyone was over the moon." },
        { word: "exultante", valid: true, rarity: "rare", meaning: "exultant, bursting with joy",
          example: "Salió exultante del examen. — She left the exam bursting with joy." },
        { word: "cansado", valid: false, why: "“Cansado” means tired. Happy-tired, maybe — but not a synonym." },
      ],
    },
  ],
};

// HIDDEN CONNECTIONS
// Groups go from easiest (yellow) to trickiest (purple). Red herrings are on purpose:
// "naranja" looks like a fruit, "rosa" like a flower, "ratón" like office gear.
const CONNECTIONS = {
  maxMistakes: 4,
  pointsPerGroup: 100,      // 4 groups = 400
  pointsPerSpareMistake: 50, // unused mistakes are a bonus when you win (up to +200)
  hintCost: 150,            // using the hint lowers the max reward by 150 points (15 gems)
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
    { name: "Mateo", avatar: "🦊", gems: 180 },
    { name: "Aisha", avatar: "🐼", gems: 140 },
    { name: "Lena", avatar: "🐙", gems: 95 },
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
    state.streak === 0 ? "Finish any game to start a streak. Each one takes under a minute."
    : playedToday ? `🔥 ${state.streak}-day streak is safe today. Go for a new best?`
    : `Play one game to keep your 🔥 ${state.streak}-day streak alive.`;

  const bestText = (score) => (score ? `🏆 Today's best: ${score}` : "Not played yet today");
  $("#bestWordVault").textContent = bestText(state.best.wordVault);
  $("#bestConnections").textContent = bestText(state.best.connections);

  renderSquad();
}

const squadTotal = () => SQUAD.teammates.reduce((sum, m) => sum + m.gems, 0) + state.squadGems;

function renderSquad() {
  const total = squadTotal();
  const pct = Math.min(100, (total / SQUAD.chestGoal) * 100);

  const members = [{ name: "You", avatar: "🦉", gems: state.squadGems, you: true }, ...SQUAD.teammates]
    .sort((a, b) => b.gems - a.gems);
  const topGems = Math.max(...members.map((m) => m.gems), 1);

  const league = [...SQUAD.rivals, { name: SQUAD.name, gems: total, you: true }]
    .sort((a, b) => b.gems - a.gems);
  const medals = ["🥇", "🥈", "🥉"];

  $("#squadPanel").innerHTML = `
    <div class="panel-head">
      <h3>👥 ${SQUAD.name} <span class="demo-tag">demo</span></h3>
      <span class="muted small">Weekly squad chest</span>
    </div>
    <div class="chest-row">
      <span class="chest-mini" aria-hidden="true">${total >= SQUAD.chestGoal ? "🎉" : "🧰"}</span>
      <div class="progress big"><div class="progress-fill gold" style="width:${pct}%"></div></div>
      <b class="chest-count">${total}/${SQUAD.chestGoal} 💎</b>
    </div>
    <p class="muted small">${total >= SQUAD.chestGoal
      ? "Chest full! Everyone gets the bonus when the week ends."
      : `${SQUAD.chestGoal - total} gems to unlock. Every game you finish adds your gems here.`}</p>

    <div class="squad-cols">
      <div>
        <h4>Squad members</h4>
        <ul class="members">
          ${members.map((m) => `
            <li class="${m.you ? "is-you" : ""}">
              <span class="avatar">${m.avatar}</span>
              <span class="member-name">${m.name}</span>
              <span class="member-bar"><span style="width:${(m.gems / topGems) * 100}%"></span></span>
              <b>${m.gems}</b>
            </li>`).join("")}
        </ul>
      </div>
      <div>
        <h4>Squad League · this week</h4>
        <ol class="league">
          ${league.map((s, i) => `
            <li class="${s.you ? "is-you" : ""}">
              <span class="rank">${medals[i] || i + 1}</span>
              <span class="member-name">${s.name}${s.you ? " (you)" : ""}</span>
              <b>${s.gems} 💎</b>
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

const wv = {}; // current round

function startWordVault() {
  Object.assign(wv, {
    step: 0,
    chain: [{ word: WORD_VAULT.start, rarity: "start" }],
    order: WORD_VAULT.steps.map((s) => shuffle(s.options)), // shuffle once; retries keep order
    score: 0,
    combo: 0,
    bestCombo: 0,
    rareFinds: 0,
    retries: 0,
    answered: false,
  });
  hideSheet();
  showScreen("wordvault");
  renderWordVault();
}

function renderWordVault() {
  const total = WORD_VAULT.steps.length;
  setProgress($("#wvProgress"), wv.step / total);
  $("#wvStepLabel").textContent = `Step ${wv.step + 1} of ${total}`;
  $("#wvTarget").textContent = wv.chain[wv.chain.length - 1].word;
  $("#wvScore").textContent = wv.score;
  renderCombo();
  renderChain();

  const box = $("#wvOptions");
  box.innerHTML = "";
  wv.order[wv.step].forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="option-key">${i + 1}</span><span class="option-word">${opt.word}</span>`;
    btn.addEventListener("click", () => chooseWord(opt, btn));
    box.append(btn);
  });
}

function renderChain(popLast = false) {
  const el = $("#wvChain");
  const total = WORD_VAULT.steps.length;
  const links = wv.chain.map((link, i) => {
    const pop = popLast && i === wv.chain.length - 1 ? " pop" : "";
    return `<span class="chip ${link.rarity}${pop}">${link.word}${link.rarity === "rare" ? " 💎" : ""}</span>`;
  });
  for (let i = wv.chain.length; i <= total; i++) links.push(`<span class="chip empty">?</span>`);
  el.innerHTML = links.join(`<span class="arrow" aria-hidden="true">→</span>`);
}

function renderCombo() {
  const el = $("#wvCombo");
  el.textContent = `🔥 Combo ×${wv.combo}`;
  el.classList.toggle("is-hot", wv.combo >= 2);
}

function chooseWord(opt, btn) {
  if (wv.answered || btn.disabled) return;

  // Wrong: explain, keep earned points, let them retry. Combo resets.
  if (!opt.valid) {
    wv.combo = 0;
    wv.retries++;
    btn.classList.add("is-wrong");
    btn.disabled = true;
    replayAnimation(btn, "shake");
    renderCombo();
    showSheet({
      kind: "wrong",
      title: "Not quite",
      body: opt.why,
      example: "Your points are safe. Pick again!",
      button: "Try again",
      onNext: hideSheet,
    });
    return;
  }

  // Correct: points for rarity + combo bonus.
  wv.answered = true;
  wv.combo++;
  wv.bestCombo = Math.max(wv.bestCombo, wv.combo);
  if (opt.rarity === "rare") wv.rareFinds++;

  const base = WORD_VAULT.pointsByRarity[opt.rarity];
  const bonus = WORD_VAULT.comboStep * (wv.combo - 1);
  const oldScore = wv.score;
  wv.score += base + bonus;
  wv.chain.push({ word: opt.word, rarity: opt.rarity });

  document.querySelectorAll("#wvOptions .option").forEach((b) => { b.disabled = true; });
  btn.disabled = false;
  btn.classList.add("is-correct");
  floatText(`+${base + bonus}`, btn, opt.rarity === "rare" ? "rare" : "");
  countUp($("#wvScore"), oldScore, wv.score, 500);
  setProgress($("#wvProgress"), (wv.step + 1) / WORD_VAULT.steps.length);
  renderChain(true);
  renderCombo();
  if (wv.combo >= 2) replayAnimation($("#wvCombo"), "bump");

  const isLast = wv.step === WORD_VAULT.steps.length - 1;
  showSheet({
    kind: "right",
    title: opt.rarity === "rare" ? "Rare find!" : "¡Exacto!",
    points: `+${base}${bonus ? ` · +${bonus} combo` : ""}`,
    body: `<b>${opt.word}</b> — ${opt.meaning}`,
    example: opt.example,
    button: isLast ? "Open the vault" : "Continue",
    onNext: nextWordStep,
  });
}

function nextWordStep() {
  hideSheet();
  wv.step++;
  wv.answered = false;
  if (wv.step >= WORD_VAULT.steps.length) finishWordVault();
  else renderWordVault();
}

function finishWordVault() {
  const chainHTML = wv.chain
    .map((l) => `<span class="chip ${l.rarity}">${l.word}${l.rarity === "rare" ? " 💎" : ""}</span>`)
    .join(`<span class="arrow">→</span>`);

  showResults({
    game: "wordVault",
    title: wv.rareFinds === 4 ? "Vault cracked. All rare words!" : "Vault cracked!",
    subtitle: "From feliz to over the moon in four words.",
    score: wv.score,
    detail: `
      <h3>Your chain</h3>
      <div class="chain final">${chainHTML}</div>
      <ul class="facts">
        <li><b>${wv.rareFinds}/4</b> rare finds</li>
        <li><b>×${wv.bestCombo}</b> best combo</li>
        <li><b>${wv.retries}</b> ${wv.retries === 1 ? "retry" : "retries"}</li>
      </ul>`,
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

function renderSolved(newGroup = -1) {
  $("#hcSolved").innerHTML = hc.solved.map(({ group }) => {
    const g = CONNECTIONS.groups[group];
    return `
      <div class="group-bar ${g.color}${group === newGroup ? " pop" : ""}">
        <b>${g.name}</b>
        <span class="group-words">${g.words.join(" · ")}</span>
        <span class="group-explain">${g.explain}</span>
      </div>`;
  }).join("");
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
  $("#hcMax").textContent = `💎 ${maxPossibleGems()} max`;
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
  const anchor = $("#hcGrid");
  hc.solved.push({ group: gi, byPlayer: true });
  hc.selected.clear();
  if (hc.hintWord && g.words.includes(hc.hintWord)) hc.hintWord = null;

  renderSolved(gi);
  renderGrid();
  renderStatus();
  floatText(`+${CONNECTIONS.pointsPerGroup}`, anchor, "");

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
  setMessage(`💡 One group is “${g.name}”, and “${hc.hintWord}” is in it. (Max reward −15 💎)`, "hint");
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
  const bars = CONNECTIONS.groups.map((g, gi) => {
    const mine = hc.solved.find((s) => s.group === gi).byPlayer;
    return `
      <div class="group-bar ${g.color}">
        <b>${g.name} ${mine ? "✓" : "<small>(revealed)</small>"}</b>
        <span class="group-words">${g.words.join(" · ")}</span>
        <span class="group-explain">${g.explain}</span>
      </div>`;
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
  $("#resSquadText").textContent = `${squadAfter}/${SQUAD.chestGoal} 💎`;
  $("#resSquadNote").textContent = squadAfter >= SQUAD.chestGoal
    ? `+${gems} from you. Chest full! 🎉 The squad bonus drops when the week ends.`
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
    const s = document.createElement("span");
    const angle = (-150 + (120 / (count - 1)) * i) * (Math.PI / 180);
    s.textContent = "💎";
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

// Keyboard shortcuts for live demos: 1–3 picks a word, Enter continues.
document.addEventListener("keydown", (e) => {
  const screen = document.body.dataset.screen;
  if (screen === "wordvault") {
    if (e.key === "Enter" && sheetAction) { e.preventDefault(); sheetAction(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= 3) document.querySelectorAll("#wvOptions .option")[n - 1]?.click();
  } else if (screen === "connections" && e.key === "Enter") {
    e.preventDefault();
    submitGroup();
  }
});

renderHub();
