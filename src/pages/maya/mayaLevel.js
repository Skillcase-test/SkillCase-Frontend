import { createContext, useContext } from "react";
import { mayaApi } from "../../api/mayaApi";

/** The level a Maya page runs at: its route, its API and how its interview is named. */
export const MAYA_LEVELS = {
  B1: { level: "B1", base: "/b1/maya", api: mayaApi("B1"), interviewName: "Job interview", interviewCopy: "Practise a job interview in Germany, with a tip now and then." },
  B2: { level: "B2", base: "/b2/maya", api: mayaApi("B2"), interviewName: "Nursing interview", interviewCopy: "Get comfortable with a job interview in Germany." },
};

export const MayaLevel = createContext(null);
export const useMaya = () => useContext(MayaLevel);
