import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// Helper component to count up any number inside a string text
function CountUpText({ text }) {
  const [displayVal, setDisplayVal] = useState("");

  useEffect(() => {
    const match = text.match(/\d+/);
    if (!match) {
      setDisplayVal(text);
      return;
    }

    const targetNum = parseInt(match[0], 10);
    const prefix = text.slice(0, match.index);
    const suffix = text.slice(match.index + match[0].length);

    let start = 0;
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * targetNum);

      setDisplayVal(`${prefix}${current}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayVal(text); // Force exact target text at end
      }
    };

    requestAnimationFrame(animate);
  }, [text]);

  return <span>{displayVal}</span>;
}

export default function HeroSection({ hero }) {
  const title = hero?.title || "250+ nurses on board.";
  const subheading = hero?.subheading || "Every one with a story.";
  const description =
    hero?.description ||
    "Join the elite circle of healthcare professionals who successfully bridged the gap from India to Germany with Skillcase. Learn with custom guides, expert mockups, and regional support.";
  const ctaText = hero?.cta_text || "Start your journey";

  // Stagger entry animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <section className="relative w-full min-h-[calc(100dvh-64px)] flex flex-col justify-end overflow-hidden mb-10 pb-8 lg:pb-12">
      <img
        src="/hero.webp"
        alt="Nurses heading to Germany"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ objectPosition: "18% 42%" }}
      />

      {/* Vignette Overlay: Dark from Bottom-Left and Bottom, fading to Top-Right */}
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-[#001836]/90 to-transparent z-10 pointer-events-none" />

      {/* Main Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 w-full flex flex-col justify-between flex-1 pt-12"
      >
        {/* Top spacer to push contents down */}
        <div className="flex-1" />

        {/* Text Block (Bottom-Left) */}
        <div className="flex flex-col gap-4 text-left text-white max-w-2xl mb-8">
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight whitespace-pre-line"
          >
            <CountUpText text={title} />
          </motion.h1>

          {subheading && (
            <motion.h2
              variants={itemVariants}
              className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight text-[#F9C53D] whitespace-pre-line"
            >
              <CountUpText text={subheading} />
            </motion.h2>
          )}

          <motion.p
            variants={itemVariants}
            className="text-slate-200 text-xs sm:text-base md:text-lg leading-relaxed whitespace-pre-line"
          >
            {description}
          </motion.p>
        </div>

        {/* Button Block (Bottom-Center) */}
        <motion.div
          variants={itemVariants}
          className="w-full flex justify-center mt-4"
        >
          <a
            href="/start-now/cart"
            className="bg-[#F9C53D] hover:bg-[#e0b02f] text-[#002856] font-extrabold px-8 py-4 rounded-2xl w-fit shadow-lg transition-all active:scale-95 duration-150 flex items-center gap-2 text-sm sm:text-base"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
