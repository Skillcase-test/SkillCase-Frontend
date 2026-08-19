import StudyNotesModule from "./StudyNotesModule";

// feature_key -> content admin panel rendered under that flag's rollout rules.
// Add a feature's admin UI by dropping a component here; the panel picks it up.
export const FEATURE_MODULES = {
  study_notes: StudyNotesModule,
};
