import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Volume2 } from "lucide-react";
import { getGermanTTSBlob } from "./ttsCache";
import LessonNavFooter from "./LessonNavFooter";
import WaveformIcon from "./screens/shared/WaveformIcon";

function flattenBlanks(dialogues) {
  const rows = [];
  dialogues.forEach((dialogue, dialogueIndex) => {
    const lines = Array.isArray(dialogue?.lines) ? dialogue.lines : [];
    lines.forEach((line, lineIndex) => {
      if (line.answer)
        rows.push({
          key: `${dialogueIndex}-${lineIndex}`,
          answer: line.answer,
        });
    });
  });
  return rows;
}

function OptionChip({ option, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `option-${option}`,
    data: { option },
  });
  const style = {
    opacity: isDragging ? 0 : 1,
    cursor: "grab",
    backgroundColor: selected ? "#002856" : "#ffffff",
    color: selected ? "#fff" : "#374151",
    border: selected ? "1px solid #002856" : "1px solid #e5e7eb",
  };

  return (
    <button
      ref={setNodeRef}
      onClick={() => onSelect(option)}
      className="px-3 py-2 rounded-full text-xs font-semibold transition-all touch-none"
      style={style}
      {...listeners}
      {...attributes}
    >
      {option}
    </button>
  );
}

function BlankDrop({ blankKey, value, checked, correctValue, onTapFill }) {
  const { isOver, setNodeRef } = useDroppable({ id: `blank-${blankKey}` });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: value ? `filled-${blankKey}` : `blank-static-${blankKey}`,
    data: value
      ? { option: value, fromBlankKey: blankKey }
      : { option: null, fromBlankKey: null },
    disabled: !value,
  });
  const isCorrect = checked && value === correctValue;
  const isWrong = checked && value && value !== correctValue;
  return (
    <span ref={setNodeRef} className="mx-1 inline-flex align-middle min-w-24">
      <button
        ref={setDraggableRef}
        onClick={onTapFill}
        className="w-full px-2 py-1 rounded-lg text-xs font-semibold touch-none"
        style={{
          opacity: isDragging ? 0.35 : 1,
          cursor: value ? "grab" : "pointer",
          backgroundColor: isOver
            ? "#dbeafe"
            : isCorrect
            ? "#dcfce7"
            : isWrong
            ? "#fee2e2"
            : "#f3f4f6",
          border: `1px solid ${
            isCorrect
              ? "#22c55e"
              : isWrong
              ? "#ef4444"
              : isOver
              ? "#3b82f6"
              : "#d1d5db"
          }`,
          color: isCorrect ? "#15803d" : isWrong ? "#dc2626" : "#4b5563",
        }}
        {...listeners}
        {...attributes}
      >
        {value || "_______"}
      </button>
    </span>
  );
}

export default function DialogueListenMatch({
  data,
  savedAnswers,
  onNext,
  onPrev,
  onDraftChange,
}) {
  const options = Array.isArray(data?.options) ? data.options : [];
  const dialogues = Array.isArray(data?.dialogues) ? data.dialogues : [];
  const blanks = useMemo(() => flattenBlanks(dialogues), [dialogues]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 4 },
    }),
  );

  const [selectedOption, setSelectedOption] = useState(null);
  const [filled, setFilled] = useState(savedAnswers?.filled || {});
  const [checked, setChecked] = useState(Boolean(savedAnswers?.checked));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeOption, setActiveOption] = useState(null);

  const allFilled = blanks.every((b) => Boolean(filled[b.key]));
  const touched = Object.keys(filled).length > 0;
  const usedOptions = new Set(Object.values(filled).filter(Boolean));

  useEffect(() => {
    if (!onDraftChange) return;
    onDraftChange({ filled, checked });
  }, [filled, checked, onDraftChange]);

  useEffect(() => {
    if (!selectedOption) return;
    if (usedOptions.has(selectedOption)) {
      setSelectedOption(null);
    }
  }, [selectedOption, usedOptions]);

  const handleNext = () => {
    if (!touched) {
      onNext({ skipped: true, filled: {}, checked: false });
      return;
    }
    setChecked(allFilled);
    onNext({ filled, checked: allFilled, skipped: false });
  };

  const assignValue = (blankKey, value, fromBlankKey = null) => {
    if (!value) return;
    setFilled((prev) => {
      const next = { ...prev };

      if (fromBlankKey && fromBlankKey !== blankKey) {
        const targetExisting = next[blankKey];
        next[blankKey] = value;

        if (targetExisting && targetExisting !== value) {
          next[fromBlankKey] = targetExisting;
        } else {
          delete next[fromBlankKey];
        }

        return next;
      }

      const existingKey = Object.keys(next).find(
        (key) => next[key] === value && key !== blankKey,
      );
      if (existingKey) {
        delete next[existingKey];
      }
      next[blankKey] = value;
      return next;
    });
    setChecked(false);
  };

  const handleDragEnd = (event) => {
    const option = event.active?.data?.current?.option;
    const fromBlankKey = event.active?.data?.current?.fromBlankKey || null;
    const overId = event.over?.id;
    setActiveOption(null);
    if (!option || !overId || !String(overId).startsWith("blank-")) return;
    const blankKey = String(overId).replace("blank-", "");
    assignValue(blankKey, option, fromBlankKey);
  };

  const customCollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  };

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const blob = await getGermanTTSBlob(data.audioScript);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={(event) =>
        setActiveOption(event.active?.data?.current?.option || null)
      }
      onDragEnd={handleDragEnd}
    >
      <div className="px-4 pt-4 pb-28">
        <div className="mb-3">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "#edb843" }}
          >
            What Fits?
          </p>
          <h2 className="text-xl font-bold" style={{ color: "#002856" }}>
            Listen and Match Up
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {data?.instruction || "Listen and fill the blanks."}
          </p>
        </div>

        <button
          onClick={handlePlayAudio}
          disabled={isPlaying || !data?.audioScript}
          className="w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold active:scale-[0.99] mb-3"
          style={{
            backgroundColor: isPlaying ? "#2563eb" : "#dbeafe",
            color: isPlaying ? "#fff" : "#1e40af",
            opacity: data?.audioScript ? 1 : 0.6,
          }}
        >
          {isPlaying ? (
             <WaveformIcon isPlaying={isPlaying} className="w-5 h-5" iconColor="text-white" color="bg-white" />
          ) : (
             <Volume2 size={18} />
          )}
          {isPlaying ? "Playing dialogue..." : "Play full dialogue"}
        </button>

        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">
            Drag to blank (or tap option then blank):
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) =>
              usedOptions.has(option) ? null : (
                <OptionChip
                  key={option}
                  option={option}
                  selected={selectedOption === option}
                  onSelect={setSelectedOption}
                />
              ),
            )}
          </div>
        </div>

        {dialogues.length === 0 ? (
          <div
            className="rounded-xl border px-3 py-2.5 mb-3"
            style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
          >
            <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
              Dialogue content is not ready yet.
            </p>
            <p className="text-[11px] mt-1" style={{ color: "#a16207" }}>
              Add dialogue lines and blank answers in the studio to preview this
              step.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {dialogues.map((dialogue, dialogueIndex) => (
            <div
              key={`${dialogue?.title || "dialogue"}-${dialogueIndex}`}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: "0 2px 12px rgba(0,40,86,0.08)" }}
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                {dialogue.title}
              </p>
              <div className="space-y-2">
                {(Array.isArray(dialogue?.lines) ? dialogue.lines : []).map(
                  (line, lineIndex) => {
                    const key = `${dialogueIndex}-${lineIndex}`;
                    const value = filled[key];
                    const hasBlank = Boolean(line.answer);
                    return (
                      <p
                        key={key}
                        className="text-sm text-gray-700 leading-relaxed"
                      >
                        <span>{line.prefix}</span>
                        {hasBlank ? (
                          <BlankDrop
                            blankKey={key}
                            value={value}
                            checked={checked}
                            correctValue={line.answer}
                            onTapFill={() =>
                              assignValue(key, selectedOption, null)
                            }
                          />
                        ) : null}
                        <span>{line.suffix}</span>
                      </p>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>

        <LessonNavFooter
          onPrev={onPrev}
          onNext={handleNext}
          nextLabel={touched ? "Next" : "Skip"}
          nextDisabled={false}
        />
        <DragOverlay dropAnimation={null}>
          {activeOption ? (
            <div
              className="px-3 py-2 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: "#002856",
                color: "#fff",
                boxShadow: "0 10px 24px rgba(0,40,86,0.28)",
                transform: "scale(1.08)",
              }}
            >
              {activeOption}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
