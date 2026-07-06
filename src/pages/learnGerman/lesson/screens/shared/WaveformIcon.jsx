import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";

// WaveformIcon renders an animated equalizer waveform when isPlaying is true,
// and a Volume2 icon otherwise. It fully inherits its size from the parent
// via className (e.g. className="w-5 h-5"). Both states match exactly.
export default function WaveformIcon({
  isPlaying,
  className = "",
  color = "bg-blue-950",
  iconColor = "text-blue-950",
}) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        {isPlaying ? (
          <motion.div
            key="waveform"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            // Fill the full container and lay out bars horizontally
            className="flex items-center justify-center gap-[12%] w-full h-full"
          >
            <motion.span
              animate={{ scaleY: [0.3, 0.7, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              style={{ originY: "center" }}
              className={`block w-[12%] h-[55%] rounded-full ${color}`}
            />
            <motion.span
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              style={{ originY: "center" }}
              className={`block w-[12%] h-[80%] rounded-full ${color}`}
            />
            <motion.span
              animate={{ scaleY: [0.7, 1, 0.7] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              style={{ originY: "center" }}
              className={`block w-[14%] h-full rounded-full ${color}`}
            />
            <motion.span
              animate={{ scaleY: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              style={{ originY: "center" }}
              className={`block w-[12%] h-[80%] rounded-full ${color}`}
            />
            <motion.span
              animate={{ scaleY: [0.3, 0.7, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              style={{ originY: "center" }}
              className={`block w-[12%] h-[55%] rounded-full ${color}`}
            />
          </motion.div>
        ) : (
          <motion.div
            key="volume-icon"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center justify-center w-full h-full"
          >
            <Volume2 className={`w-full h-full ${iconColor}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
