import { createContext, useContext } from "react";
import { mayaApi } from "../../api/mayaApi";

const EVERYDAY = {
  talkName: "Everyday German",
  talkCopy: "Talk about everyday life and whatever interests you.",
  talkMeta: "Live tips",
  anyTopic: "General Conversation",
  interviewTag: "Job interview · Pflegefachkraft",
  interviewNoun: "interview",
  interviewFeedback: "Interview feedback",
};

/** The level a Maya page runs at: its route, its API and how its two modes are named. */
export const MAYA_LEVELS = {
  A2: {
    level: "A2",
    base: "/a2/maya",
    api: mayaApi("A2"),
    talkName: "Learn Mode",
    talkCopy: "Role-play real-life situations, with help along the way.",
    talkMeta: "Live tips",
    anyTopic: "Surprise me",
    interviewName: "Test Mode",
    interviewCopy: "The hard mode: a real A2 speaking test.",
    interviewMeta: "German only",
    interviewTag: "A2 speaking test",
    interviewNoun: "test",
    interviewFeedback: "Test feedback",
  },
  B1: { ...EVERYDAY, level: "B1", base: "/b1/maya", api: mayaApi("B1"), interviewName: "Job interview", interviewCopy: "Practise a job interview in Germany, with a tip now and then.", interviewMeta: "Tips now and then" },
  B2: { ...EVERYDAY, level: "B2", base: "/b2/maya", api: mayaApi("B2"), interviewName: "Nursing interview", interviewCopy: "Get comfortable with a job interview in Germany.", interviewMeta: "Feedback after" },
};

export const MayaLevel = createContext(null);
export const useMaya = () => useContext(MayaLevel);
