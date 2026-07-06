import { createContext } from "react";

export const B1TourContext = createContext({
  isTourActive: false,
  currentFeature: null,
  currentPhase: null,
  speakingStep: 0,
});
