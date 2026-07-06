import React, { useState } from "react";
import { Volume2, Maximize2 } from "lucide-react";
import UmlautKeyboard from "../../../../components/b1/UmlautKeyboard";

export default function WritingStage({
  topic,
  writingText,
  setWritingText,
  currentWordCount,
  wordLimit,
  onHelpfulWordClick,
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleInsertUmlaut = (char) => {
    const input = document.getElementById("ds-writing-textarea");
    const current = writingText || "";
    if (!input) {
      setWritingText(current + char);
      return;
    }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const newVal = current.slice(0, start) + char + current.slice(end);
    setWritingText(newVal);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    });
  };

  return (
    <div className="w-full">
      {/* Topic Title, Badges, Image, Helpful Words */}
      <div className="self-stretch px-4 pt-4 pb-6 flex flex-col justify-start items-start gap-4 bg-white shrink-0">
        <div className="w-full flex justify-between items-start gap-4">
          <h1 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left truncate">
            {topic?.title}
          </h1>
          <div className="flex justify-start items-start gap-1.5 shrink-0">
            <span className="px-2 py-0.5 bg-[#F5F5F5] rounded-[40px] text-neutral-500 text-xs font-medium leading-5">
              {topic?.level_tag || "B1-B2"}
            </span>
            <span className="px-2 py-0.5 bg-green-700/10 rounded-[40px] border border-green-700/20 text-green-700 text-xs font-medium leading-5 capitalize">
              {topic?.difficulty_tag || "Easy"}
            </span>
          </div>
        </div>

        <div id="b1-describe-speak-image-prompt" className="relative self-stretch w-full">
          <img
            className="self-stretch max-h-72 rounded-sm object-contain w-full bg-zinc-50 border border-zinc-100"
            src={topic?.prompt_image_url}
            alt="Describe Prompt"
          />
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded text-white flex items-center justify-center border-0 outline-none cursor-pointer transition shadow-sm"
            title="Preview Image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {topic?.helpful_words?.length > 0 && (
          <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
            <div className="inline-flex justify-center items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-950" />
              <span className="text-sky-950 text-xs font-semibold leading-5">
                Helpful words:
              </span>
            </div>
            <p className="self-stretch opacity-70 text-black text-[10px] font-normal leading-4 text-left">
              Tap these words to view their meanings and add them to your
              writing.
            </p>
            <div className="w-full flex flex-wrap gap-1.5 pt-1.5">
              {topic.helpful_words.map((wordObj, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onHelpfulWordClick(wordObj)}
                  className="h-7 px-2.5 py-1.5 bg-blue-950/10 hover:bg-blue-950/20 active:scale-95 rounded-lg text-blue-950 text-xs font-medium transition-all cursor-pointer border-0 outline-none"
                >
                  {wordObj?.article && `${wordObj.article} `}
                  {wordObj?.word || wordObj}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Write header */}
      <div className="self-stretch w-full px-4 py-4 bg-[#F5F5F5] inline-flex justify-between items-center gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-950 rounded-sm flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">✎</span>
          </div>
          <h2 className="text-sky-950 text-sm font-semibold leading-5 text-left">
            {topic?.question
              ? "Write your response in German."
              : "Write about the above image in German."}
          </h2>
        </div>
      </div>

      {/* Textarea + word counter */}
      <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-center gap-4 bg-[#F5F5F5]">
        <div className="w-full h-60 p-2 bg-white rounded-xl border border-zinc-300 flex flex-col justify-between items-stretch gap-2 shadow-sm">
          <textarea
            id="ds-writing-textarea"
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Schreibe hier..."
            className="flex-1 w-full text-xs font-normal leading-5 text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 focus:border-transparent resize-none"
            style={{ outline: "none", boxShadow: "none" }}
          />
          <div
            className={`text-right text-xs font-medium select-none ${
              currentWordCount > wordLimit + 2
                ? "text-red-500 font-bold"
                : "text-blue-950/40"
            }`}
          >
            {currentWordCount}/{wordLimit} words
          </div>
        </div>
        <div className="w-full flex justify-center mb-2">
          <UmlautKeyboard onInsert={handleInsertUmlaut} />
        </div>
      </div>

      {/* Full screen image preview modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(false);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border-0 outline-none cursor-pointer text-xl font-bold transition duration-200"
          >
            ✕
          </button>
          <img
            src={topic?.prompt_image_url}
            alt="Fullscreen Preview"
            className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
