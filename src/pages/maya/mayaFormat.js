/* Plain helpers shared by the Maya screens (kept out of the component files for fast refresh). */

export const modeName = (mode) => (mode === "talk" ? "Everyday German" : "Nursing interview");

export const SMOOTHNESS_LABEL = { smooth: "Smooth", some_hesitation: "Some hesitation", hesitant: "Hesitant" };

/** A whole call's smoothness from its hesitation rate: under 4 a minute reads as smooth. */
export const callSmoothness = (a) => {
  const m = a?.hesitation?.perMinute;
  if (m === null || m === undefined) return null;
  return m <= 4 ? "smooth" : m <= 9 ? "some_hesitation" : "hesitant";
};

/** Mirrors the backend's noFeedbackReason, for picking which screen a session shows. */
export const feedbackReason = (f) => (f?.ok ? null : (f?.reason ?? null));

/** Words German never uses: a single one in a German answer is a real switch to English. */
const ENGLISH = new Set(
  (
    "the and is are not you we they with on for of to at but because that if or very have has had my me yes no can would should could " +
    "what where who why which this it do does don't didn't it's i'm i've i'd there their them our your been being just really " +
    "think know work working worked patients ward colleagues years today now here thank thanks please maybe exactly actually basically " +
    "shift shifts night nightshift nightshifts nurse nurses nursing doctor doctors care caring duty medicine medication blood pressure experience family " +
    "hello good more much many some any other after before only always never sometimes usually like want need help people time " +
    "day days week weeks month months how about from when then than speak say said tell understand word words language english german " +
    "wife husband child children home house country money salary learn learning learned course exam hard easy difficult"
  ).split(" "),
);
const GERMAN_HINT = new Set("der die das den dem des ein eine einen einem einer eines und ist sind nicht ich du wir ihr sie mit auf für von zu zum zur im".split(" "));

/** The English words in something said in German, in order and without repeats, for highlighting. */
export function englishWords(text) {
  const seen = new Set();
  for (const w of text.toLowerCase().match(/[a-zäöüß']+/g) ?? []) if ((ENGLISH.has(w) || w === "i") && !GERMAN_HINT.has(w)) seen.add(w);
  return [...seen];
}
