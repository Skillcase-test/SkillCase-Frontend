import { createContext, useContext } from "react";

export const TourContext = createContext({
  isTourActive: false,
  tourPage: null,
  pronounceStep: 0, // 0=listen, 1=record, 2=speaking, 3=stop
});

export const useTour = () => useContext(TourContext);
