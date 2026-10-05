import { createContext } from "react";

export const B2TourContext = createContext({
  isTourActive: false,
  currentFeature: null,
  currentPhase: null,
});
