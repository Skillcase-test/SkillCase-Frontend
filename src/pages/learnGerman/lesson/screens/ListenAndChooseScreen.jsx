import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import handtap from "../../../../assets/handtap.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";
import WaveformIcon from "./shared/WaveformIcon";
import { hapticLight } from "../../../../utils/haptics";

const LETTERS = ["A", "B", "C", "D"];

// screen.audioText:        text to synthesise via AWS Polly (played when speaker is tapped)
// screen.question:         question shown below the play button
// screen.dialogue:         Maya's dialogue bubble text
// screen.options:          ["option1", "option2", "option3"]
// screen.correctOptionIndex: number index of the correct option
export default function ListenAndChooseScreen({
  screen,
  onPrev,
  canGoPrev = false,
  selectedOption,
  setSelectedOption,
  onCheck,
  speakWord,
  isSpeaking,
  progressRatio,
  title,
  level,
}) {
  const options = screen?.options || [];
  const audioText = screen?.audioText || "";
  const question = screen?.question || "What is it?";

  return (
    <motion.div
      key="screen-listen-choose"
      className="w-full flex-1 flex flex-col relative bg-gradient-to-b from-blue-100 to-sky-100 overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
    >
      <ProgressBar progressRatio={progressRatio} title={title} level={level} />

      <div className="absolute left-0 top-12 z-10 flex items-center pl-2">
        <motion.img
          layoutId="mayaMascot"
          className="w-[90px] z-10 drop-shadow-md"
          src={mayaLooking}
        />
        <motion.div
          layoutId="mayaDialog"
          className="px-4 py-2 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-0 ml-2 relative flex items-center border border-gray-100"
        >
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-gray-100" />
          <div className="max-w-[180px] pr-2">
            <MayaDialogueBubble
              text={screen?.dialogue || "Okay, now listen and answer."}
            />
          </div>
        </motion.div>
      </div>

      <div className="w-full flex-1 mt-35 bg-white rounded-tl-3xl rounded-tr-3xl flex flex-col items-center px-4 pt-4 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] relative safe-bottom-pad">
        <div className="w-full flex-1 min-h-0 flex flex-col justify-between max-w-[360px] mx-auto">
          <div className="w-full flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="text-black/50 text-base font-normal">
                Tap to listen
              </div>
              <div className="relative">
                {/* Outgoing sonar pulses behind the button */}
                {!isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-[#002856]/30 animate-ping pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl bg-[#002856]/20 animate-pulse pointer-events-none" />
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSpeaking) speakWord(audioText, true);
                  }}
                  className="relative z-10 w-13 h-13 rounded-2xl outline-1 outline-blue-950/50 flex items-center justify-center bg-white hover:bg-blue-50 active:scale-95 transition-all overflow-hidden"
                >
                  <WaveformIcon
                    isPlaying={isSpeaking}
                    className="w-7 h-7"
                    iconColor="text-blue-950/80"
                  />
                </button>
                {/* Tapping hand overlay using handtap.webp */}
                {!isSpeaking && (
                  <motion.img
                    src={handtap}
                    alt="Tap Guide"
                    className="absolute bottom-[-27px] right-[-27px] w-[54px] h-auto pointer-events-none z-20 select-none"
                    style={{
                      transformOrigin: "30% 33%",
                      filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.12))",
                    }}
                    animate={{
                      scale: [1, 0.94, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
            </div>

            <div className="w-full -mt-1 flex flex-col gap-3">
              <div className="text-black text-base font-medium">{question}</div>
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    setSelectedOption(idx);
                  }}
                  className={`w-full px-3 py-3 rounded-xl outline-1 flex items-center gap-4 transition-all ${
                    selectedOption === idx
                      ? "bg-blue-600/5 outline-[#1E76F3]"
                      : "bg-white outline-zinc-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center ${
                      selectedOption === idx
                        ? "bg-blue-600/10 text-blue-600"
                        : "bg-black/5 text-gray-500"
                    }`}
                  >
                    <span className="font-medium text-base">
                      {LETTERS[idx]}
                    </span>
                  </div>
                  <span
                    className={`text-base font-medium ${
                      selectedOption === idx ? "text-blue-600" : "text-gray-900"
                    }`}
                  >
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full shrink-0 mt-3 flex items-center gap-3">
            {canGoPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev?.();
                }}
                className="w-2/5 px-4 py-3.5 rounded-xl border border-zinc-300 shadow-sm bg-white text-blue-950 font-semibold text-[15px] active:scale-[0.98] transition-transform flex justify-center items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Prev
              </button>
            )}
            <button
              onClick={onCheck}
              disabled={selectedOption === null}
              className={`${
                canGoPrev ? "w-6/5" : "w-full"
              } px-4 py-3.5 rounded-xl shadow-sm outline-2 outline-offset-[-2px] outline-white/10 flex justify-center items-center gap-1.5 transition-all duration-300 ${
                selectedOption !== null
                  ? "bg-gradient-to-r from-amber-200 to-amber-300 text-blue-950 hover:opacity-90 active:scale-[0.98] cursor-pointer border border-[#eec139]"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
            >
              <span className="text-[16px] font-semibold">Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
