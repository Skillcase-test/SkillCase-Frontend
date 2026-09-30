import { getB2ScoreBand } from "../../../utils/b2Scores";

export function getScoreColor(score) {
  return {
    good: "text-[#17764f] bg-[#17764f]",
    developing: "text-[#946200] bg-[#b17a00]",
    practice: "text-[#b3483e] bg-[#b3483e]",
    pending: "text-[#59687a] bg-[#59687a]",
  }[getB2ScoreBand(score).key];
}
export function getScoreStrokeColor(score) {
  const band = getB2ScoreBand(score);
  return band.chartColor || band.color;
}
export function getScoreGreeting(score) {
  return { good: "Good progress", developing: "You're making progress", practice: "Keep practising", pending: "Awaiting feedback" }[getB2ScoreBand(score).key];
}
