/* Topics in the shape the guided screens expect.
 *
 * A module has three parts (Learn, Learn More, Apply), so "started" means
 * some parts done and "complete" means all of them; every module has its own
 * cover (cover-<id> in the art manifest) and a stamp named for what it lets
 * the learner do. */
import { topicDoneCount, topicFullyDone } from "../lib/curriculum";
import { moduleSetting, topicCover } from "../lib/vocabArt";

const PLACES = {
  cafe:       { stamp: "Café explorer",     icon: "coffee",    color: "#956044" },
  restaurant: { stamp: "Table for one",     icon: "utensils",  color: "#9a5b3f" },
  bakery:     { stamp: "Fresh from the oven", icon: "croissant", color: "#a0703a" },
  butcher:    { stamp: "Counter regular",   icon: "beef",      color: "#92525c" },
  market:     { stamp: "Market regular",    icon: "basket",    color: "#427252" },
  shop:       { stamp: "Smart shopper",     icon: "cart",      color: "#4d7a5c" },
  clothes:    { stamp: "Winter ready",      icon: "shirt",     color: "#7a5a86" },
  street:     { stamp: "City navigator",    icon: "signpost",  color: "#326a83" },
  platform:   { stamp: "Ready to travel",   icon: "train",     color: "#92525c" },
  home:       { stamp: "Hello, neighbour",  icon: "home",      color: "#745d90" },
  classroom:  { stamp: "Quick learner",     icon: "book",      color: "#3f6f8f" },
  office:     { stamp: "Taking care",       icon: "calendar",  color: "#367c79" },
  pharmacy:   { stamp: "Feeling better",    icon: "pill",      color: "#3e7d6a" },
  staffroom:  { stamp: "Team player",       icon: "users",     color: "#5b6f93" },
  ward:       { stamp: "Ward ready",        icon: "heart",     color: "#2f7a78" },
  corridor:   { stamp: "Finding my way",    icon: "hospital",  color: "#40708a" },
};
const GENERAL = { stamp: "New possibilities", icon: "globe", color: "#326a83" };

// One stamp per module — a shared setting stamp would sit twice in the
// passport when two modules happen in the same place.
const STAMPS = {
  a1l1: "Café explorer", a1l2: "Hello, neighbour", a1l3: "Nice to meet you",
  a1l4: "Price checker", a1l5: "Table for one", a1l6: "First five",
  a1l7: "Polite stranger", a1l8: "Perfect ten", a1l9: "Number sharer",
  a1l10: "Twenty and up", a1l11: "Fresh from the oven", a1l12: "Just asking",
  a1l13: "Counter regular", a1l14: "Smart shopper", a1l15: "Market regular",
  a1l16: "Berry hunter", a1l17: "Taste tester", a1l18: "Cash or card",
  a1l19: "Bag it up", a1l20: "Shopping done", a1l21: "On the clock",
  a1l22: "Day planner", a1l23: "Appointment kept", a1l24: "Shift sorted",
  a1l25: "Week at a glance", a1l26: "Sunday off", a1l27: "Early or late",
  a1l28: "Hours counted", a1l29: "Running late", a1l30: "Got it right",
  a1l31: "Honest check-in", a1l32: "Pharmacy pro", a1l33: "Good listener",
  a1l34: "Proud nurse", a1l35: "Left or right", a1l36: "Finding my way",
  a1l37: "Home sweet home", a1l38: "Weekend plans", a1l39: "Plans confirmed",
  a1l40: "Back on track", a1l41: "All about them", a1l42: "Team player",
  a1l43: "Welcome buddy", a1l44: "Supply finder", a1l45: "Just what I need",
  a1l46: "Can and must", a1l47: "Early bird", a1l48: "Please and thanks",
  a1l49: "Ward ready", a1l50: "A1 graduate", a1l51: "New colleague",
  a1l52: "Workday talk", a1l53: "Winter ready", a1l54: "Colour picker",
  a1l55: "Perfect fit", a1l56: "Weather watcher", a1l57: "Settling in",
  a1l58: "Already done", a1l59: "Bin or habe", a1l60: "Read and written",
  a1l61: "Morning done", a1l62: "Handover ready", a1l63: "Date setter",
  a1l64: "Best deal", a1l65: "Mine and yours", a1l66: "Sold out",
  a1l67: "Ready to travel", a1l68: "Ticket in hand", a1l69: "Journey complete",
};

export function challengeFromTopic(topic, done) {
  const scene = PLACES[moduleSetting(topic.id)] || GENERAL;
  const doneCount = topicDoneCount(topic, done);
  return {
    ...scene,
    stamp: STAMPS[topic.id] || scene.stamp,
    id: topic.id,
    title: topic.title,
    image: topicCover(topic.id),
    outcome: topic.capability,
    complete: topicFullyDone(topic, done),
    started: doneCount > 0 && !topicFullyDone(topic, done),
    available: true,
    topic,
  };
}

export const nextJourneyChallenge = (challenges) =>
  challenges.find((c) => !c.complete && c.available);

// The date each stamp was earned lives on the device; completion itself is
// on the server. Keyed per user so accounts sharing a device keep separate
// passports.
const ledgerKey = (userId) => `skillcase-lg2-passport:${userId ?? "local"}`;
export function readPassportDates(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(ledgerKey(userId)) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function rememberPassportStamp(userId, topicId) {
  const dates = readPassportDates(userId);
  if (dates[topicId]) return false;
  dates[topicId] = new Date().toISOString();
  try { localStorage.setItem(ledgerKey(userId), JSON.stringify(dates)); } catch { /* completion is saved server-side */ }
  return true;
}

export function formatStampDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "CHALLENGE COMPLETE";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(value)).toUpperCase();
}
