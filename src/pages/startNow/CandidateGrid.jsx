import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

export default function CandidateGrid({ candidates = [] }) {
  const [activeId, setActiveId] = useState(null);

  // Filter candidates for grid section
  const gridCandidates = candidates
    .filter((c) => c.section_type === "grid")
    .slice(0, 4);

  if (gridCandidates.length === 0) return null;

  const displayList = gridCandidates;
  const activeCandidate = displayList.find((c) => c.id === activeId);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <section className="px-4 max-w-5xl mx-auto w-full">
      <div className="text-center md:text-left mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Every one with a Story
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Click on any nurse to view their qualification mapping and experience
          detail.
        </p>
      </div>

      <div className="relative w-full min-h-[460px] md:min-h-[500px]">
        {/* Grid Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full h-full"
        >
          {displayList.map((candidate) => (
            <motion.div
              key={candidate.id}
              layoutId={`card-container-${candidate.id}`}
              variants={cardVariants}
              onClick={() => setActiveId(candidate.id)}
              className="relative aspect-[3/4] bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md cursor-pointer group max-w-[180px] sm:max-w-[220px] md:max-w-[260px] mx-auto w-full"
              whileHover={{ y: -6 }}
            >
              <img
                src={candidate.image_url}
                alt={candidate.name}
                className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent z-10" />

              <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
                <h4 className="font-bold text-sm md:text-base">
                  {candidate.name}
                </h4>
                <p className="text-xs text-slate-200">{candidate.state}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Expanded View Overlay */}
        <AnimatePresence>
          {activeId && activeCandidate && (
            <motion.div
              key={activeId}
              layoutId={`card-container-${activeId}`}
              className="absolute inset-0 z-35 bg-white rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row border border-slate-100"
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
            >
              {/* Image Section */}
              <div className="w-full md:w-1/2 h-64 md:h-full relative shrink-0">
                <img
                  src={activeCandidate.image_url}
                  alt={activeCandidate.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
              </div>

              {/* Details Section */}
              <div className="flex-1 px-6 py-1 md:p-8 flex flex-col justify-between relative bg-white">
                {/* Close button */}
                <button
                  onClick={() => setActiveId(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="md:mt-6">
                  <h3 className="text-xl md:text-3xl font-extrabold text-[#002856]">
                    {activeCandidate.name}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm md:text-base mt-1">
                    From {activeCandidate.state}
                  </p>

                  <hr className="my-2 border-slate-100" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                        Experience
                      </p>
                      <p className="text-sm md:text-base font-bold text-slate-700 mt-1">
                        {activeCandidate.experience}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                        Language Competence
                      </p>
                      <p className="text-sm md:text-base font-bold text-[#002856] mt-1">
                        {activeCandidate.level}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-1 flex gap-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="w-full py-3 bg-[#002856] hover:bg-[#001c3d] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
