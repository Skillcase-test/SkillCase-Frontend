import { motion } from "framer-motion";

export default function TapIndicator({
  className = "absolute right-6 top-[80px]",
  domId,
}) {
  return (
    <motion.div 
      layoutId="tapIndicator"
      id={domId}
      className={`${className} flex items-center justify-center z-50 pointer-events-none`}
    >
      <motion.div
        className="w-10 h-10 rounded-full border-[2.5px] border-white/80 absolute shadow-sm"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [0.8, 1, 2.2],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          times: [0, 0.2, 1],
          ease: "easeOut",
        }}
      />
      <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-white/40 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full" />
      </div>
    </motion.div>
  );
}
