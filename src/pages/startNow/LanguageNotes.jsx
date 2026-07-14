import React, { useRef } from "react";
import { FileText, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

export default function LanguageNotes({ notes = [] }) {
  const scrollRef = useRef(null);

  if (notes.length === 0) return null;

  const list = notes;

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  // Extract unique languages for filter badges
  const distinctLanguages = [...new Set(list.map((n) => n.language))];

  return (
    <section className="bg-[#001836] py-16 px-4 mb-6 overflow-hidden w-full text-white">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-end mb-6">
          <div>
            {/* Section Heading */}
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Notes in your language
            </h2>
            <p className="text-slate-300 text-sm max-w-xl mt-1">
              Study with custom prep guides designed in your regional native tongue to clarify complex grammatical rules.
            </p>
          </div>
          {/* Scroll Buttons */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={scrollLeft}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all duration-200"
              aria-label="Scroll left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollRight}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all duration-200"
              aria-label="Scroll right"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Badges */}
        <div className="flex flex-wrap gap-2 mb-8">
          {distinctLanguages.map((lang, idx) => (
            <span
              key={idx}
              className="bg-[#002d5b] text-[#a7c8ff] px-4 py-1.5 rounded-full text-xs font-semibold border border-[#254776]"
            >
              {lang}
            </span>
          ))}
        </div>

        {/* Horizontal scroll container */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scroll-smooth no-scrollbar" 
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {list.map((note) => (
            <div
              key={note.id}
              className="flex-shrink-0 w-72 bg-[#171c26]/60 p-6 rounded-3xl shadow-xl border border-white/5 flex flex-col justify-between transition-all duration-300 hover:border-white/10 hover:shadow-2xl"
            >
              <div>
                {/* Header Icon & Language tag */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-[#F9C53D] text-[#002856] rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-white/10 text-slate-300 rounded-md">
                    {note.language}
                  </span>
                </div>

                <h4 className="text-white font-extrabold text-base md:text-lg mb-2">
                  {note.title}
                </h4>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 line-clamp-3">
                  {note.short_description}
                </p>
              </div>

              {/* Action Button */}
              {note.pdf_url && (
                <a
                  href={note.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#F9C53D] font-bold text-xs hover:text-[#e0b02f] transition-colors w-fit"
                >
                  <span>Preview PDF</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
