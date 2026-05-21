import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import mayaSad from "../../../../../assets/onboarding/mayaSad.webp";
import { hapticLight } from "../../../../../utils/haptics";

export default function LeaveLessonModal({ isOpen, onClose, onLeave }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm px-6 pt-10 pb-6 relative bg-white rounded-3xl inline-flex flex-col justify-start items-start gap-2.5 z-10 shadow-2xl"
        >
          {/* Close button (top right) */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="self-stretch flex flex-col justify-start items-center gap-6">
            <div className="self-stretch flex flex-col justify-start items-center gap-3">
              <div className="self-stretch flex flex-col justify-start items-center gap-2">
                <div className="self-stretch text-center text-blue-950 text-[28px] font-bold leading-8 tracking-tight">
                  Leave lesson?
                </div>
                <div className="w-full text-center text-blue-900/80 text-base font-medium">
                  Your progress will be saved.
                </div>
              </div>

              {/* Image Container */}
              <div className="relative mt-1 flex justify-center items-center w-48 h-48">
                <img
                  src={mayaSad}
                  alt="Maya Sad"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="self-stretch flex justify-start items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  onClose();
                }}
                className="flex-1 h-[48px] rounded-lg text-[16px] font-semibold transition-all bg-gradient-to-r from-amber-200 to-amber-300 text-[#1E3A8A] shadow-md active:scale-[0.98] border border-[#eec139]"
              >
                <span className="text-[#002856] text-[15px] font-bold font-['Poppins'] tracking-wide">
                  Continue Lesson
                </span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  hapticLight();
                  try {
                    await onLeave();
                  } catch {
                    onLeave();
                  }
                }}
                className="w-[110px] px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex justify-center items-center transition-all active:scale-95 shadow-md border border-slate-200"
              >
                <span className="text-gray-600 text-[16px] font-bold font-['Poppins'] tracking-wide">
                  Leave
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
