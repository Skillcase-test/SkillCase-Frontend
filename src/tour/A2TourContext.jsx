import { createContext, useContext } from "react";

export const A2TourContext = createContext({
  isTourActive: false,
  currentFeature: null, // 'landing' | 'flashcard' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'test'
  currentPhase: null, // feature-specific phase (e.g. 'select', 'practice', 'explanation', 'level')
  speakingStep: 0, // 0=inactive, 1=show record overlay, 2=recording, 3=stopped, 4=assessment
});

export const useA2Tour = () => useContext(A2TourContext);
