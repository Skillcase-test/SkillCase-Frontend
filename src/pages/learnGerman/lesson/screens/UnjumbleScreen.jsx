import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, X } from "lucide-react";
import ProgressBar from "./shared/ProgressBar";
import DragResultModal from "./shared/DragResultModal";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";

// ---------------------------------------------------------------------------
// Placed pill inside the sentence — useSortable for real-time swap animation
// Visually identical to original DraggablePill (isPlaced=true)
// ---------------------------------------------------------------------------
function SentenceChip({ item, status, onTap }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  let bgClass = "bg-white";
  let outlineClass = "outline-zinc-300 outline-solid";
  let textClass = "text-gray-900";
  if (status === "correct") {
    bgClass = "bg-emerald-100/50";
    outlineClass = "outline-green-700 outline-solid";
    textClass = "text-green-700";
  } else if (status === "incorrect") {
    bgClass = "bg-rose-200/40";
    outlineClass = "outline-red-500 outline-solid";
    textClass = "text-red-500";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTap(item)}
      className={`px-4 py-1.5 ${bgClass} rounded-lg outline-1 outline-offset-[-1px] ${outlineClass} flex justify-start items-center gap-2 shadow-sm whitespace-nowrap touch-none select-none cursor-grab`}
    >
      <div
        className={`${textClass} text-[15px] font-medium leading-6 pointer-events-none`}
      >
        {item.label}
      </div>
      {status === "correct" && (
        <div className="w-3.5 h-3.5 bg-green-700 rounded-full flex items-center justify-center shrink-0 pointer-events-none">
          <Check size={8} color="white" strokeWidth={3} />
        </div>
      )}
      {status === "incorrect" && (
        <div className="w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center shrink-0 pointer-events-none">
          <X size={8} color="white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bank pill — useDraggable so it can be dragged into sentence
// Visually identical to original DraggablePill (isPlaced=false)
// ---------------------------------------------------------------------------
function BankChip({ item, onTap }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { fromBank: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onTap(item)}
      className={`px-3 py-2 bg-white rounded-lg outline-1 outline-offset-[-1px] outline-zinc-300 flex justify-center items-center cursor-grab active:cursor-grabbing shadow-sm transition-opacity touch-none select-none ${
        isDragging ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-gray-900 text-[14px] font-medium leading-5 pointer-events-none">
        {item.label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bank droppable zone — dropping a placed pill here returns it to bank
// ---------------------------------------------------------------------------
function BankZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "bank-drop-zone" });
  return (
    <div
      ref={setNodeRef}
      className={`w-full mt-8 mb-6 inline-flex flex-wrap justify-center items-center gap-3 rounded-2xl min-h-[52px] transition-colors duration-200 ${
        isOver ? "bg-blue-50/60" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentence droppable zone — dropping here places the word
// ---------------------------------------------------------------------------
function SentenceZone({ children, className }) {
  const { setNodeRef, isOver } = useDroppable({ id: "sentence-drop-zone" });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "bg-blue-50/20 rounded-xl" : ""}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main UnjumbleScreen
// ---------------------------------------------------------------------------
export default function UnjumbleScreen({
  screen,
  onNext,
  progressRatio,
  title,
  level,
}) {
  const unjumbleSlots = screen?.slots || [];
  const unjumbleItemsBank = screen?.items || [];

  const [sentenceItems, setSentenceItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [slotStatuses, setSlotStatuses] = useState({});
  const [dragQuizState, setDragQuizState] = useState("idle");
  const [sentenceWidth, setSentenceWidth] = useState(320);
  const sentenceRef = useRef(null);

  useEffect(() => {
    if (!sentenceRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (w) setSentenceWidth(w);
    });
    observer.observe(sentenceRef.current);
    return () => observer.disconnect();
  }, []);

  const bankItems = useMemo(
    () =>
      unjumbleItemsBank.filter(
        (item) => !sentenceItems.find((s) => s.id === item.id),
      ),
    [unjumbleItemsBank, sentenceItems],
  );

  const allPlaced = sentenceItems.length === unjumbleSlots.length;

  // Row layout — same algorithm as before
  const sentenceRows = useMemo(() => {
    const rows = [];
    let current = [];
    let currentW = 0;
    const available = Math.max(sentenceWidth - 12, 220);
    const gap = 10;

    unjumbleSlots.forEach((slot, i) => {
      const item = sentenceItems[i];
      const label =
        item?.label ||
        unjumbleItemsBank.find((b) => b.matchId === slot.id)?.label ||
        "word";
      const estimatedW = Math.max(72, Math.min(170, label.length * 8 + 56));
      const projected =
        current.length === 0 ? estimatedW : currentW + gap + estimatedW;
      if (current.length > 0 && projected > available) {
        rows.push(current);
        current = [{ slotIndex: i, slotId: slot.id, estimatedW }];
        currentW = estimatedW;
      } else {
        current.push({ slotIndex: i, slotId: slot.id, estimatedW });
        currentW = projected;
      }
    });
    if (current.length > 0) rows.push(current);
    return rows;
  }, [sentenceWidth, unjumbleSlots, sentenceItems, unjumbleItemsBank]);

  // ---- DnD sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback(
    (event) => {
      const found =
        sentenceItems.find((s) => s.id === event.active.id) ||
        unjumbleItemsBank.find((b) => b.id === event.active.id);
      setActiveItem(found || null);
    },
    [sentenceItems, unjumbleItemsBank],
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveItem(null);

      const fromSentence = sentenceItems.find((s) => s.id === active.id);
      const fromBank = unjumbleItemsBank.find(
        (b) => b.id === active.id && !sentenceItems.find((s) => s.id === b.id),
      );

      // Drop on bank zone → remove from sentence
      if (over?.id === "bank-drop-zone") {
        if (fromSentence) {
          setSentenceItems((prev) => prev.filter((s) => s.id !== active.id));
          setSlotStatuses({});
        }
        return;
      }

      if (fromSentence) {
        // Reorder within sentence (real-time swap)
        if (over && over.id !== active.id) {
          const oldIdx = sentenceItems.findIndex((s) => s.id === active.id);
          const newIdx = sentenceItems.findIndex((s) => s.id === over.id);
          if (oldIdx !== -1 && newIdx !== -1) {
            setSentenceItems((prev) => arrayMove(prev, oldIdx, newIdx));
            setSlotStatuses({});
          }
        }
        // Dropped outside → snap back (no change)
        return;
      }

      if (fromBank) {
        // Bank drag → always go to first empty position if dropped outside bank
        if (over?.id !== "bank-drop-zone") {
          if (sentenceItems.length < unjumbleSlots.length) {
            setSentenceItems((prev) => [...prev, fromBank]);
            setSlotStatuses({});
          }
        }
      }
    },
    [sentenceItems, unjumbleItemsBank, unjumbleSlots.length],
  );

  // ---- Tap handlers ----
  const handleBankTap = useCallback(
    (item) => {
      if (dragQuizState !== "idle") return;
      if (sentenceItems.length < unjumbleSlots.length) {
        setSentenceItems((prev) => [...prev, item]);
        setSlotStatuses({});
      }
    },
    [dragQuizState, sentenceItems.length, unjumbleSlots.length],
  );

  const handlePlacedTap = useCallback(
    (item) => {
      if (dragQuizState !== "idle") return;
      setSentenceItems((prev) => prev.filter((s) => s.id !== item.id));
      setSlotStatuses({});
    },
    [dragQuizState],
  );

  // ---- Check ----
  const handleCheck = useCallback(() => {
    if (!allPlaced) return;
    const newStatuses = {};
    let allCorrect = true;
    unjumbleSlots.forEach((slot, i) => {
      const placed = sentenceItems[i];
      if (!placed) {
        newStatuses[slot.id] = null;
        allCorrect = false;
      } else if (placed.matchId === slot.id) {
        newStatuses[slot.id] = "correct";
      } else {
        newStatuses[slot.id] = "incorrect";
        allCorrect = false;
      }
    });
    setSlotStatuses(newStatuses);
    setDragQuizState(allCorrect ? "correct" : "incorrect");
  }, [allPlaced, unjumbleSlots, sentenceItems]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        key="screen-unjumble"
        className="w-full flex-1 flex flex-col relative bg-gradient-to-b from-blue-100 to-sky-100 overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
      >
        <ProgressBar
          progressRatio={progressRatio}
          title={title}
          level={level}
        />

        <div className="absolute left-0 top-12 z-10 flex items-center pl-2">
          <motion.img
            layoutId="mayaMascot"
            className="w-[90px] z-10 drop-shadow-md"
            src={mayaLooking}
          />
          <motion.div
            layoutId="mayaDialog"
            className="px-4 py-2 sm:py-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-0 ml-2 relative flex items-center border border-gray-100"
          >
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-gray-100" />
            <div className="max-w-[180px] pr-2 text-gray-800 text-[13px] sm:text-[14px] font-medium leading-snug">
              <MayaDialogueBubble
                text={screen?.dialogue || "Okay, now un-jumble these words."}
              />
            </div>
          </motion.div>
        </div>

        <div className="w-full flex-1 mt-35 bg-white rounded-tl-3xl rounded-tr-3xl flex flex-col items-center px-4 pt-6 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] relative safe-bottom-pad">
          <div className="w-full flex-1 min-h-0 flex flex-col justify-between max-w-[360px] mx-auto">
            {/* Sentence rows with underline */}
            <SentenceZone className="w-full relative mt-4 pb-6 px-2 min-h-[100px]">
              <div className="relative z-10 w-full">
                <SortableContext
                  items={sentenceItems.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {sentenceRows.map((row, rowIdx) => (
                    <div
                      key={`row-${rowIdx}`}
                      className="w-full border-b border-black/40 pb-1 mb-4"
                    >
                      <div className="flex flex-wrap items-end gap-x-2 gap-y-3 min-h-[44px]">
                        {row.map(({ slotIndex, slotId }) => {
                          const item = sentenceItems[slotIndex];
                          const status = slotStatuses[slotId] || null;
                          if (item) {
                            return (
                              <SentenceChip
                                key={item.id}
                                item={item}
                                status={status}
                                onTap={handlePlacedTap}
                              />
                            );
                          }
                          return (
                            <div
                              key={`empty-${slotIndex}`}
                              className="h-[36px] min-w-[72px] max-w-[170px]"
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </div>
            </SentenceZone>

            {/* Word bank */}
            <BankZone>
              {unjumbleItemsBank.map((item) => {
                const isPlaced = sentenceItems.some((s) => s.id === item.id);
                if (isPlaced) {
                  return (
                    <div
                      key={`placeholder-${item.id}`}
                      className="px-3 py-2 bg-neutral-200 rounded-lg outline-1 outline-offset-[-1px] outline-zinc-300 flex justify-center items-center touch-none select-none opacity-50 cursor-default"
                    >
                      <div className="text-[14px] font-medium leading-5 text-gray-500 pointer-events-none">
                        {item.label}
                      </div>
                    </div>
                  );
                }
                return (
                  <BankChip key={item.id} item={item} onTap={handleBankTap} />
                );
              })}
            </BankZone>

            {/* Check button */}
            <div className="w-full shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheck();
                }}
                className={`w-full px-4 py-3.5 rounded-xl shadow-sm outline-2 outline-offset-[-2px] outline-white/10 flex justify-center items-center transition-all duration-300 ${
                  allPlaced
                    ? "bg-gradient-to-r from-amber-200 to-amber-300 text-blue-950 hover:opacity-90 active:scale-[0.98] cursor-pointer border border-[#eec139]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                <span className="text-[16px] font-semibold">Check</span>
              </button>
            </div>
          </div>
        </div>

        <DragResultModal
          dragQuizState={dragQuizState}
          onClose={() => setDragQuizState("idle")}
          onNext={onNext}
          correctText={screen?.correctFeedback || "Perfect sentence!"}
          incorrectText={
            screen?.incorrectFeedback || "That's not the right order."
          }
        />

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="px-3 py-2 bg-white shadow-xl scale-105 rounded-lg outline-2 outline-offset-[-1px] outline-blue-500 flex justify-center items-center cursor-grabbing">
              <div className="text-blue-600 text-[14px] font-medium leading-5">
                {activeItem.label}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </motion.div>
    </DndContext>
  );
}
