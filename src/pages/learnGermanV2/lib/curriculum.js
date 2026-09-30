// Pure domain logic for Guided German (v2) — ported from the reference app's
// lib/curriculum.js. No DOM, no React; same semantics the step components
// were built against.

export function subKey(topic, sub) { return `${topic.id}:${sub.key}`; }
const subsOf = (topic) => topic?.subs || [];
export function topicDoneCount(topic, done) { return subsOf(topic).filter(s => done.includes(subKey(topic, s))).length; }
export function topicFullyDone(topic, done) { return topicDoneCount(topic, done) === subsOf(topic).length; }
export function nextSub(topic, done) { const subs = subsOf(topic); return subs.find(s => !done.includes(subKey(topic, s))) || subs[0]; }

/* Every distinct word the course teaches. The tab bar's ring reads "German
   words learnt", so it needs a denominator, and the denominator is the
   curriculum itself — a word added to a module moves the ring without anyone
   remembering to. */
export function totalTaughtWords(topics) {
  const all = new Set();
  for (const t of topics || [])
    for (const sub of t.subs || [])
      for (const w of sub.teaches || []) if (w && w[0]) all.add(w[0]);
  return all.size;
}

// Substitutes a {name} token for the learner's real first name anywhere
// content addresses the learner directly.
export function withName(s, name) {
  if (typeof s !== "string" || !s.includes("{name}")) return s;
  return s.replace(/\{name\}/g, name || "there");
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Glue words — articles, connectors, common verb forms — that appear inside
// sentences the learner reads or assembles but are never "taught" on their
// own card. They still need an honest gloss so Explain My Answer never shows
// a broken placeholder.
export const GLOSS = {
  was: "what", kostet: "costs", der: "the", die: "the", das: "the", ist: "is", bin: "am",
  aus: "from", indien: "India", zusammen: "together", guten: "good", tag: "day",
  morgen: "morning", wiedersehen: "goodbye", auf: "(farewell)", priya: "Priya",
  julia: "Julia", pause: "break", fast: "almost", fertig: "done", da: "there",
  neu: "new", hier: "here",
  haben: "to have", habe: "have", hast: "have", hat: "has",
  bis: "until", eine: "a", ein: "a", einen: "a", ihre: "her",
  es: "it", oder: "or", gut: "good", "möchten": "would like", "möchte": "would like",
  etwas: "something", bald: "soon", ihr: "your", sonst: "otherwise",
  klar: "sure", euro: "euro", erdbeeren: "strawberries", "spät": "late",
  dann: "then", muss: "must", los: "go", vierzehn: "fourteen",
  gibt: "gives", zitronen: "lemons", leider: "unfortunately", probiere: "try",
  mit: "with", brauche: "need", kleine: "small", anna: "Anna",
  freut: "pleases", mich: "me", nummer: "number", dreizehn: "thirteen",
  "fünfzehn": "fifteen", genau: "exactly", ja: "yes", zu: "to",
  viel: "much", "äpfel": "apples", suchen: "look for", sind: "are",
  aber: "but", frische: "fresh", schmeckt: "tastes", ihnen: "you (formal)",
  bezahle: "pay", macht: "makes (costs)", "groß": "big", "schön": "nice",
  kommen: "come", wieder: "again", entschuldigung: "sorry", richtig: "right",
  perfekt: "perfect", oh: "oh", passt: "fits", arbeiten: "work",
  arbeite: "work", nicht: "not", "schönes": "nice",
  lange: "long",
  wo: "where", viele: "many", kein: "no / not any", problem: "problem", gleich: "right away",
  ok: "ok", nein: "no", auch: "also / too", sehr: "very", er: "he",
  "weiß": "know", also: "so / then", stimmt: "is right",
  "zähle": "count", betten: "beds", letzte: "last", alle: "all", belegt: "full/occupied",
  tabletten: "tablets", "für": "for", zimmer: "room", frau: "Ms./Mrs.", weber: "Weber",
  dir: "you (to)", wissen: "to know",
  geht: "goes / is", tut: "does / hurts", mir: "me (to)", leid: "sorry",
  kann: "can", helfen: "help", nehmen: "take", zweimal: "twice", den: "the",
  von: "of / from", beruf: "job", erfolg: "success", geschafft: "made it",
  klingt: "sounds", "gemütlich": "cozy", machen: "do / make", gehe: "go",
  spazieren: "for a walk", wollen: "want", wir: "we", rufen: "call",
  mache: "do", wenn: "when / if", wunderbar: "wonderful", neue: "new",
  musik: "music", mein: "my", weh: "hurt", "öffnen": "open", heben: "lift / raise",
  gehen: "go", ah: "ah", an: "(part of anrufen, 'to call')", schreibe: "write / text",
  komme: "come",
  arzt: "doctor", toll: "great",
};

export const GLOSS_EX = {
  kaffee: ["Ich trinke Kaffee.", "Magst du Kaffee?"],
  bitte: ["Kaffee, bitte.", "Ja, bitte."],
  ist: ["Der Kaffee ist teuer.", "Das Essen ist gut."],
};

export const ENCOURAGE = [
  "Good job. Most people don't speak German at all on day one.",
  "You just said it out loud. That's the hard part, done.",
  "That took courage. It gets easier from here.",
  "Most learners stay silent for weeks. You didn't.",
  "Nobody sounds fluent on their first try. You still tried.",
  "That's a real German sentence, out loud, from you.",
  "Every word you say now is one you'll never have to learn again.",
  "You didn't wait until you felt ready. That's the actual skill.",
  "Saying it wrong and saying it anyway -- that's how everyone starts.",
  "That sentence didn't exist for you yesterday. Now it does.",
  "Small and out loud beats big and silent, every time.",
  "You're not memorizing anymore. You're using it.",
];

export const PRAISE = [
  "Genau!", "That's it.", "Perfect.", "Ja! Correct.", "You've got it.",
  "Richtig!", "Nailed it.", "That's the one.", "Exactly right.", "Spot on.",
  "Sehr gut!", "You knew that cold.", "Clean.", "That's correct German.",
  "Yep, that's it.", "Genau richtig.", "No hesitation there.", "Right on.",
  "Correct -- and fast.", "That's how it's said.",
];
export function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

// Reserved for a step answered correctly with zero wrong taps first.
export const MIND_BLOWN = [
  "Perfect.", "First try!", "Instant.", "No hesitation.", "Flawless.",
  "Straight through.", "You just knew it.", "Clean run.", "Didn't even pause.",
  "Dead on.", "Excellent!", "Awesome!",
];
export function pickMindBlown() { return MIND_BLOWN[Math.floor(Math.random() * MIND_BLOWN.length)]; }

// Looks a word up across every topic's every sub — not just the active
// lesson — so cross-module words resolve correctly in Explain My Answer.
export function glossFor(tok, topics) {
  const clean = tok.replace(/[.,!?]+$/, "").toLowerCase();
  for (const m of topics) {
    for (const sub of m.subs) {
      const hit = (sub.teaches || []).find(([de]) => de.toLowerCase() === clean);
      if (hit) return hit[1];
    }
  }
  if (GLOSS[clean]) return GLOSS[clean];
  return "part of this German phrase";
}

// Finds the full [de,en,icon] triple for a word across every topic's every
// sub — used to push a wrong build/translate answer's words into review.
export function findTaughtWord(clean, topics) {
  for (const m of topics) {
    for (const sub of m.subs) {
      const hit = (sub.teaches || []).find(([de]) => de.toLowerCase() === clean.toLowerCase());
      if (hit) return hit;
    }
  }
  return null;
}

export function wordsForStep(s, teaches) {
  const word = (i) => (teaches && teaches[i]) || ["", "", ""];
  if (s.t === "pick" || s.t === "listen") { const [de = ""] = word(s.t === "pick" ? s.from?.[0] : s.w); return de ? [de] : []; }
  if (s.t === "build") return (s.de || []).slice();
  if (s.t === "translate") return (s.de || "").replace(/[.,!?]+$/, "").split(" ").filter(Boolean);
  if (s.t === "speak") return (s.de || "").replace(/[.!?]+$/, "").split(" ").filter(Boolean);
  if (s.t === "match") return (s.ws || []).map(i => word(i)[0]).filter(Boolean);
  if (s.t === "soundmatch") { const [de = ""] = word(s.w); return de ? [de] : []; }
  if (s.t === "scenetap") { const [de = ""] = word(s.from?.[0]); return de ? [de] : []; }
  if (s.t === "keypad") return (s.target || []).map(i => word(i)[0]).filter(Boolean);
  if (s.t === "race") return (s.from || []).map(i => word(i)[0]).filter(Boolean);
  if (s.t === "spotmistake") return s.shouldBe ? [s.shouldBe] : [];
  if (s.t === "oddoneout") return s.items?.[s.oddIdx]?.[0] ? [s.items[s.oddIdx][0]] : [];
  if (s.t === "speakcards") return (s.cards || []).map(c => c.de).filter(Boolean);
  if (s.t === "gapfill") {
    const [before] = String(s.sentence || "").split("__");
    const stem = before.trim().split(/\s+/).pop();
    const opt = s.options?.[s.correct];
    return stem && opt ? [stem + opt] : [];
  }
  if (s.t === "sort") return (s.items || []).map(it => it.w).filter(Boolean);
  return [];
}

export function rewardLine(acc, cb, secs) {
  if (acc === 100) return "No mistakes. You really know this.";
  if (cb >= 3) return `${cb + 1} right in a row. You're learning fast.`;
  if (secs < 120) return "That was quick. Nice work.";
  return "You took your time and got it right. That's what matters.";
}
