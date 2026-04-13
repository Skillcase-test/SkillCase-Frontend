import { createContext, useContext } from "react";

export const A1TourContext = createContext({
  isTourActive: false,
  currentFeature: null,
  currentPhase: null,
  speakingStep: 0,
});

export const useA1Tour = () => useContext(A1TourContext);
