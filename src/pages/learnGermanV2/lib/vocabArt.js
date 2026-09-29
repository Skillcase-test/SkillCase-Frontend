// Art resolution for Guided German (v2) — ported from the reference app's
// lib/vocabArt.js, with one architectural change: the manifest is not a
// bundled JSON of public/ files but the lg2_art table (name -> Cloudinary
// URL) fetched via /learn-german-v2/art and held here module-level.
//
// loadArtManifest() must be called (once, cached) before screens that render
// art — the v2 home does this on mount, and the lesson page awaits it before
// rendering steps. Everything below stays synchronous after that, so
// treatmentFor() can still run inside render like the reference's does.
import USAGE_DATA from "./usageExamples.json";

let ART = {}; // name -> url
let artLoaded = false;
let artPromise = null;

export function hasArtManifest() {
  return artLoaded;
}

export function setArtManifest(map) {
  ART = map && typeof map === "object" ? map : {};
  artLoaded = true;
}

// Populated by learnGermanV2Api.getLg2Art(); import cycle avoided by passing
// the fetcher in rather than importing the api module here.
export function loadArtManifest(fetcher) {
  if (artLoaded) return Promise.resolve(ART);
  if (!artPromise) {
    artPromise = fetcher()
      .then((res) => {
        setArtManifest(res?.data?.art || {});
        return ART;
      })
      .catch(() => {
        // Fail open for this render (emoji/icon fallbacks take over) but
        // clear the in-flight slot so the next mount retries — a tunnel
        // hiccup must not kill art for the whole session.
        artPromise = null;
        return ART;
      });
  }
  return artPromise;
}

// macOS writes filenames in NFD ("A" + combining diaeresis) while content
// stores NFC ("Ä") — normalize before lookup or every umlaut word 404s.
const artUrl = (kind, name) =>
  ART[`${kind}-${String(name).normalize("NFC")}`] || null;

// Which diorama establishes each topic. Ships on the topic row as `setting`
// (the admin importer fills it from the reference map for a1l* ids); the map
// below is only a safety net for content uploaded without one.
const LEGACY_SETTING_BY_TOPIC = {
  a1l1: "cafe", a1l2: "street", a1l3: "street", a1l4: "shop", a1l5: "restaurant",
  a1l6: "classroom", a1l7: "office", a1l8: "classroom", a1l9: "office",
  a1l10: "classroom", a1l11: "bakery", a1l12: "bakery", a1l13: "butcher",
  a1l14: "shop", a1l15: "market", a1l16: "market", a1l17: "market",
  a1l18: "shop", a1l19: "shop", a1l20: "shop",
  a1l21: "classroom", a1l22: "staffroom", a1l23: "office", a1l24: "staffroom",
  a1l25: "classroom", a1l26: "staffroom", a1l27: "staffroom", a1l28: "staffroom",
  a1l29: "street", a1l30: "office",
  a1l31: "ward", a1l32: "pharmacy", a1l33: "ward", a1l34: "office",
  a1l35: "corridor", a1l36: "corridor", a1l37: "home", a1l38: "home",
  a1l39: "staffroom", a1l40: "classroom",
  a1l41: "staffroom", a1l42: "staffroom", a1l43: "staffroom", a1l44: "ward",
  a1l45: "ward", a1l46: "ward", a1l47: "street", a1l48: "shop",
  a1l49: "classroom", a1l50: "classroom",
  a1l51: "staffroom", a1l52: "ward", a1l53: "clothes", a1l54: "clothes",
  a1l55: "clothes", a1l56: "street", a1l57: "home",
  a1l58: "home", a1l59: "staffroom", a1l60: "classroom", a1l61: "ward",
  a1l62: "ward", a1l63: "office", a1l64: "shop", a1l65: "home",
  a1l66: "ward", a1l67: "platform", a1l68: "platform", a1l69: "classroom",
};

// `topic` here is the v2 topic meta (id + optional setting/scene/backdrop)
// or a bare topic id — steps historically pass the module id around.
const topicSetting = (topicOrId) => {
  if (topicOrId && typeof topicOrId === "object") {
    return topicOrId.setting || LEGACY_SETTING_BY_TOPIC[topicOrId.id] || "";
  }
  return LEGACY_SETTING_BY_TOPIC[topicOrId] || "";
};

export const moduleScene = (topicOrId) => {
  if (topicOrId && typeof topicOrId === "object" && topicOrId.scene) {
    return topicOrId.scene;
  }
  const s = topicSetting(topicOrId);
  return s ? artUrl("scene", s) : null;
};

// Portrait 2:3 backdrop, cropped to fill a 9:16 phone screen.
export const moduleBackdrop = (topicOrId) => {
  if (topicOrId && typeof topicOrId === "object" && topicOrId.backdrop) {
    return topicOrId.backdrop;
  }
  const s = topicSetting(topicOrId);
  return s ? artUrl("tall", s) : null;
};

// The setting itself, not its art. The home groups consecutive modules that
// happen in the same place into one leg of the journey.
export const moduleSetting = (topicOrId) => topicSetting(topicOrId);

// Journey island art — one illustrated cover per topic, hosted as
// cover-<topicId> in the art manifest.
export const topicCover = (topicOrId) => {
  const id =
    topicOrId && typeof topicOrId === "object" ? topicOrId.id : topicOrId;
  return id ? artUrl("cover", id) : null;
};

// Where the learner is, said the way a person would say it.
const SETTING_NAME = {
  cafe: "The café", street: "Out on the street", shop: "The shop",
  restaurant: "The restaurant", classroom: "The classroom", office: "The office",
  bakery: "The bakery", butcher: "The butcher", market: "The market",
  staffroom: "The staff room", ward: "The ward", pharmacy: "The pharmacy",
  corridor: "The hospital corridor", home: "At home", clothes: "The clothes shop",
  platform: "The station",
};
export const settingName = (key) => SETTING_NAME[key] || "";

const NUMERALS = {
  null: "0", eins: "1", zwei: "2", drei: "3", vier: "4", "fünf": "5", sechs: "6",
  sieben: "7", acht: "8", neun: "9", zehn: "10", elf: "11", "zwölf": "12",
  dreizehn: "13", vierzehn: "14", zwanzig: "20",
};

// Colours are the colour. Nothing to photograph, and a photograph of
// something red teaches the object, not the word.
const SWATCH = {
  rote: "#DC2626", blaue: "#1E76F3", "grüne": "#16A34A", gelbe: "#EDB843",
};

// Days get the calendar cell they actually occupy.
const WEEKDAY = {
  Montag: 0, Dienstag: 1, Mittwoch: 2, Donnerstag: 3,
  Freitag: 4, Samstag: 5, Sonntag: 6,
};
const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Function words with nothing to photograph get a card built around language
// instead: a usage sentence, a contrast pair, or just the word itself.
const USAGE_EXAMPLES = USAGE_DATA.examples || {};
const CONTRASTS = USAGE_DATA.contrasts || {};

// Inflected forms share the base word's art. Gendered pairs (Arzt/Ärztin …)
// deliberately do NOT alias — sharing art would make "Which one is Ärztin?"
// unanswerable.
const ALIAS = { "heiße": "heißen", "billiger": "billig", "teurer": "teuer",
  "größer": "groß", "kleiner": "klein" };
const base = (de) => (ALIAS[de] || de || "").normalize("NFC");

export const tileArt = (de) => artUrl("tile", base(de));
export const heroArt = (de) => artUrl("hero", base(de));
export const sceneArt = (name) => artUrl("scene", name);
export const tapSceneArt = (name) => artUrl("tapscene", name);
export const backdropArt = (name) => artUrl("tall", name);

/** The treatment: photo | numeral | swatch | weekday | usage | contrast | word. */
export function treatmentFor(de, pic) {
  if (tileArt(de) || heroArt(de)) return { kind: "photo" };
  if (NUMERALS[de]) return { kind: "numeral", value: NUMERALS[de] };
  if (SWATCH[de]) return { kind: "swatch", value: SWATCH[de] };
  if (WEEKDAY[de] !== undefined) {
    return { kind: "weekday", index: WEEKDAY[de], days: DAY_SHORT };
  }
  const pair = CONTRASTS[de];
  if (pair) return { kind: "contrast", lines: pair };
  const ex = USAGE_EXAMPLES[de];
  if (ex) return { kind: "usage", parts: ex.parts, gloss: ex.gloss };
  return { kind: "word", value: pic };
}

// The word in a real phrase, shown under the teach card.
const PHRASE = {
  Kaffee: ["Einen Kaffee, bitte.", "A coffee, please."],
  Wasser: ["Ein Wasser, bitte.", "A water, please."],
  Essen: ["Das Essen ist lecker.", "The food is tasty."],
  Rechnung: ["Die Rechnung, bitte.", "The bill, please."],
  Speisekarte: ["Die Speisekarte, bitte.", "The menu, please."],
  Telefonnummer: ["Meine Telefonnummer ist …", "My phone number is …"],
  Hallo: ["Hallo! Wie geht's?", "Hello! How are you?"],
  "Tschüss": ["Tschüss, bis bald!", "Bye, see you soon!"],
  danke: ["Danke schön!", "Thank you very much!"],
  bitte: ["Einen Kaffee, bitte.", "A coffee, please."],
  "Guten Morgen": ["Guten Morgen!", "Good morning!"],
  "Guten Tag": ["Guten Tag!", "Good day!"],
  teuer: ["Das ist zu teuer.", "That is too expensive."],
  billig: ["Das ist billig.", "That is cheap."],
  lecker: ["Das ist lecker!", "That is tasty!"],
  kostet: ["Was kostet das?", "What does that cost?"],
};
export const phraseFor = (de) => PHRASE[de] || null;

/* ---- Conversation partners ---------------------------------------------
 * Each topic names its NPC in `who`; where it does not, the topic's setting
 * implies one — you talk to a barista in a cafe and a pharmacist in a
 * pharmacy. Portrait art comes from the lg2_art manifest (npc-*, npcscene-*,
 * npcfull-*). */
const npcArt = (kind, name) => artUrl(kind, name);
export const npcPortrait = (name) => npcArt("npc", name);
export const npcScene = (name) => npcArt("npcscene", name);

// The full-bleed image behind the conversation intro: the person is the
// subject — their own scene where one exists, then the room they stand in.
export const npcFullFor = (topicOrId, who) => {
  const role = who && WHO[who];
  const byRole = role ? npcArt("npcscene", role) : null;
  if (byRole) return byRole;
  const setting = topicSetting(topicOrId);
  return setting ? npcArt("npcfull", setting) : null;
};

// What the curriculum's `who` field says -> our portrait set. Gender follows
// the role — "Bäckerin" is a woman and gets her portrait.
const WHO = {
  "Barista": "barista",
  "Bäckerin": "baeckerin", "Bäcker": "baecker",
  "Metzger": "metzger", "Marktfrau": "marktfrau",
  "Verkäuferin": "verkaeuferin", "Verkäufer": "verkaeufer",
  "Kassiererin": "verkaeuferin",
  "Ladenbesitzer": "baecker",
  "Seller": "verkaeuferin",
  "Apothekerin": "apothekerin", "Apotheker": "apotheker",
  "Arzt": "arzt", "Ärztin": "aerztin",
  "Kollegin": "kollegin", "Kollege": "kollege", "Colleague": "kollegin",
  "Krankenschwester": "kollegin",
  "Nachtschicht-Kollegin": "kollegin",
  "Stationsleitung": "kollegin",
  "Empfangsdame": "empfangsdame", "Front desk": "empfangsdame",
  "Schaffner": "schaffner", "Beamter": "schaffner",
  "Kellnerin": "kellnerin", "Kellner": "kellner", "Waiter": "kellner",
  "Lehrerin": "lehrerin",
  "Nachbar": "nachbar", "Passant": "nachbar",
  "Patientin": "patientin",
  "Vermieterin": "vermieterin",
  // The two characters the learner meets by name get their own faces.
  "Anna": "anna", "Julia": "julia",
};

const NAMES = new Set(["Anna", "Julia"]);
/** How the intro should refer to this character — "Anna", but "the barista". */
export function whoLabel(who) {
  if (!who) return "them";
  if (NAMES.has(who)) return who;
  return `the ${who.toLowerCase()}`;
}

// Where the module has no `who`, its setting implies the person.
const SETTING_NPC = {
  cafe: "barista", restaurant: "kellner", bakery: "baecker", butcher: "metzger",
  market: "marktfrau", shop: "verkaeuferin", clothes: "verkaeuferin",
  pharmacy: "apotheker", ward: "kollegin", corridor: "kollegin",
  office: "aerztin", staffroom: "kollegin", home: "nachbar",
  platform: "schaffner", street: "nachbar", classroom: "lehrerin",
};

/** Which character the learner is talking to in this chat step. */
export function npcFor(who, topicOrId) {
  const byWho = who && WHO[who];
  if (byWho) return byWho;
  return SETTING_NPC[topicSetting(topicOrId)] || "kollegin";
}
