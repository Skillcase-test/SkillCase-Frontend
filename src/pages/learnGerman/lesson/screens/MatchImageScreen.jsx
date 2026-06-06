import { motion } from "framer-motion";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import ProgressBar from "./shared/ProgressBar";
import DraggablePill from "./shared/DraggablePill";
import DroppableSlot from "./shared/DroppableSlot";
import DragResultModal from "./shared/DragResultModal";
import mayaLooking from "../../../../assets/onboarding/mayaLooking.webp";
import MayaDialogueBubble from "./shared/MayaDialogueBubble";

// screen.slots:  [{ id, image }]  — images should be Cloudinary URLs
// screen.items:  [{ id, label, matchId }]
export default function MatchImageScreen({
  screen,
  sensors,
  placedItems,
  slotStatuses,
  dragQuizState,
  activeDragItem,
  onDragStart,
  onDragEnd,
  onCheck,
  onRemove,
  onNext,
  onCloseModal,
  progressRatio,
  title,
  level,
}) {
  const dragSlots = screen?.slots || [];
  const dragItemsBank = screen?.items || [];
  const allPlaced = Object.values(placedItems).every((i) => i !== null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <motion.div
        key="screen-match-image"
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
            className="px-4 py-2 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-0 ml-2 relative flex items-center border border-gray-100"
          >
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-gray-100" />
            <div className="max-w-[180px] sm:max-w-[200px] pr-2 text-gray-800 text-[13px] sm:text-[14px] font-medium leading-snug">
              <MayaDialogueBubble
                text={
                  screen?.dialogue || "Match the correct words with the images"
                }
              />
            </div>
          </motion.div>
        </div>

        <div className="w-full flex-1 mt-35 bg-white rounded-tl-3xl rounded-tr-3xl flex flex-col items-center px-4 pt-6 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] relative safe-bottom-pad">
          <div className="w-full flex-1 min-h-0 flex flex-col justify-between max-w-[360px] mx-auto">
            <div className="w-full flex flex-col justify-start items-start gap-4">
              {dragSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="w-full relative inline-flex justify-start items-center"
                >
                  <img
                    className="w-[55%] h-[74px] relative rounded-xl object-cover border border-gray-100 shadow-sm"
                    src={slot.image}
                  />
                  <DroppableSlot
                    id={slot.id}
                    placedItem={placedItems[slot.id]}
                    status={slotStatuses[slot.id] || null}
                    onRemove={() => onRemove(slot.id)}
                  />
                </div>
              ))}
            </div>

            <div className="w-full mt-6 mb-6 inline-flex flex-wrap justify-center items-center gap-3">
              {dragItemsBank.map((item) => {
                const isPlaced = Object.values(placedItems).some(
                  (p) => p?.id === item.id,
                );
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
                  <DraggablePill
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    isPlaced={false}
                    isLocked={false}
                  />
                );
              })}
            </div>

            <div className="w-full shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (allPlaced) onCheck();
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
          onClose={onCloseModal}
          onNext={onNext}
          correctText={
            screen?.correctFeedback || "All items matched correctly."
          }
          incorrectText={
            screen?.incorrectFeedback || "This is not the right answer."
          }
        />

        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div className="px-3 py-2 bg-white shadow-xl scale-105 rounded-lg outline-2 outline-offset-[-1px] outline-blue-500 flex justify-center items-center cursor-grabbing">
              <div className="text-blue-600 text-[14px] font-medium leading-5">
                {activeDragItem.label}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </motion.div>
    </DndContext>
  );
}
