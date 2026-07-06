import React, { useState } from "react";
import { Volume2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
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
  const [zoomLevel, setZoomLevel] = useState(1);

  // Pinch & Pan Viewport States
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const stateRef = React.useRef({ scale: 1, x: 0, y: 0 });
  const touchStartRef = React.useRef({
    distance: 0,
    scale: 1,
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false,
  });
  const imgRef = React.useRef(null);

  // Keep stateRef synced with active state to prevent stale closures
  React.useEffect(() => {
    stateRef.current = { scale, x: translate.x, y: translate.y };
  }, [scale, translate]);

  // Bind touch listeners with event propagation stopped to isolate viewport gestures
  React.useEffect(() => {
    const imgEl = imgRef.current;
    if (!imgEl) return;

    const handleTouchStart = (e) => {
      e.stopPropagation(); // Block pull-to-refresh and page swiping

      if (e.touches.length === 2) {
        // Init pinch
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartRef.current.distance = dist;
        touchStartRef.current.scale = stateRef.current.scale;
        touchStartRef.current.isDragging = false;
      } else if (e.touches.length === 1 && stateRef.current.scale > 1) {
        // Init pan
        touchStartRef.current.lastX = e.touches[0].clientX;
        touchStartRef.current.lastY = e.touches[0].clientY;
        touchStartRef.current.isDragging = true;
      }
    };

    const handleTouchMove = (e) => {
      e.stopPropagation(); // Block bubbling to prevent layout scroll actions

      if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
        if (e.cancelable) e.preventDefault(); // Stop native page scale/scroll

        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const deltaDist = dist - touchStartRef.current.distance;
        
        // Balanced sensitivity dampener
        const sensitivity = 0.005;
        let nextScale = touchStartRef.current.scale + deltaDist * sensitivity;
        nextScale = Math.min(Math.max(1, nextScale), 3); // clamp between 1.0x and 3.0x
        setScale(nextScale);

        if (nextScale === 1) {
          setTranslate({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && touchStartRef.current.isDragging && stateRef.current.scale > 1) {
        if (e.cancelable) e.preventDefault(); // Prevent standard page scroll behavior

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - touchStartRef.current.lastX;
        const deltaY = currentY - touchStartRef.current.lastY;

        touchStartRef.current.lastX = currentX;
        touchStartRef.current.lastY = currentY;

        // Pan delta scaled by current magnification factor
        let nextX = stateRef.current.x + deltaX / stateRef.current.scale;
        let nextY = stateRef.current.y + deltaY / stateRef.current.scale;

        // Clamping bounds to contain image inside viewport
        const maxX = (stateRef.current.scale - 1) * 120;
        const maxY = (stateRef.current.scale - 1) * 90;
        nextX = Math.min(Math.max(-maxX, nextX), maxX);
        nextY = Math.min(Math.max(-maxY, nextY), maxY);

        setTranslate({ x: nextX, y: nextY });
      }
    };

    const handleTouchEnd = (e) => {
      e.stopPropagation(); // Stop event bubbling

      if (e.touches.length < 2) {
        touchStartRef.current.distance = 0;
      }
      if (e.touches.length === 0) {
        touchStartRef.current.isDragging = false;
        // Snap back if scale is negligible
        if (stateRef.current.scale < 1.05) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        }
      }
    };

    imgEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    imgEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    imgEl.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      imgEl.removeEventListener("touchstart", handleTouchStart);
      imgEl.removeEventListener("touchmove", handleTouchMove);
      imgEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

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

        <div className="relative self-stretch w-full overflow-visible">
          {/* Scrollable image wrapper */}
          <div
            id="b1-describe-speak-image-prompt"
            className="w-full h-72 bg-zinc-50 border border-zinc-100 rounded-lg overflow-hidden relative"
          >
            <img
              ref={imgRef}
              className="w-full h-full object-contain rounded-sm select-none transition-transform duration-100 ease-out origin-center"
              style={{
                transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
                touchAction: "none",
              }}
              src={topic?.prompt_image_url}
              alt="Describe Prompt"
              onClick={() => {
                if (scale > 1) {
                  setScale(1);
                  setTranslate({ x: 0, y: 0 });
                }
              }}
            />
          </div>

          {/* Floating controls (locked to the bottom right of the card wrapper) */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                if (scale > 1) {
                  setScale(1);
                  setTranslate({ x: 0, y: 0 });
                } else {
                  setScale(1.75);
                  setTranslate({ x: 0, y: 0 });
                }
              }}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white flex items-center justify-center border-0 outline-none cursor-pointer transition shadow-sm"
              title={scale > 1 ? "Zoom Out" : "Zoom In"}
            >
              {scale > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setIsPreviewOpen(true);
              }}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white flex items-center justify-center border-0 outline-none cursor-pointer transition shadow-sm"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
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
          className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-sm p-4 animate-fade-in flex flex-col justify-between items-center"
          onClick={() => {
            setIsPreviewOpen(false);
            setZoomLevel(1);
          }}
        >
          {/* Close button at top right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(false);
              setZoomLevel(1);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border-0 outline-none cursor-pointer text-xl font-bold transition duration-200 z-[5020]"
          >
            ✕
          </button>

          {/* Scrollable image container */}
          <div
            className={`w-full h-full max-w-full max-h-full overflow-auto p-4 ${
              zoomLevel > 1 ? "block text-center" : "flex items-center justify-center"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(false);
              setZoomLevel(1);
            }}
          >
            <img
              src={topic?.prompt_image_url}
              alt="Fullscreen Preview"
              className="rounded-lg shadow-2xl transition-all duration-300 mx-auto max-w-full max-h-full object-contain"
              style={{
                width: zoomLevel > 1 ? `${zoomLevel * 100}%` : "auto",
                maxWidth: zoomLevel > 1 ? "none" : "100%",
                height: "auto",
                maxHeight: zoomLevel > 1 ? "none" : "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Zoom controls at bottom */}
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/75 backdrop-blur-xs rounded-full px-4 py-2 text-white border border-white/10 z-[5010]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
              disabled={zoomLevel <= 1}
              className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-12 text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
              disabled={zoomLevel >= 3}
              className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
