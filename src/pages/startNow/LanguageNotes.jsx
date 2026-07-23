import React, { useEffect, useRef, useState } from "react";
import { FileText, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

const AUTO_ADVANCE_MS = 5000;

// Scrolls `element` to the horizontal center of `container` without touching
// any ancestor/page scroll — unlike element.scrollIntoView(), which walks up
// every scrollable ancestor (including the document) and can jump the whole page.
function scrollIntoContainer(container, element) {
  if (!container || !element) return;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const currentOffset = elementRect.left - containerRect.left + container.scrollLeft;
  const target = currentOffset - containerRect.width / 2 + elementRect.width / 2;
  container.scrollTo({ left: target, behavior: "smooth" });
}

export default function LanguageNotes({ notes = [] }) {
  const scrollRef = useRef(null);
  const pillScrollRef = useRef(null);
  const noteRefs = useRef([]);
  const pillRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const list = notes;

  // Extract unique languages for filter badges
  const distinctLanguages = [...new Set(list.map((n) => n.language))];

  useEffect(() => {
    if (list.length === 0) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % list.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [list.length]);

  useEffect(() => {
    if (list.length === 0) return;
    scrollIntoContainer(scrollRef.current, noteRefs.current[activeIndex]);

    const activeLanguage = list[activeIndex]?.language;
    const pillIndex = distinctLanguages.indexOf(activeLanguage);
    if (pillIndex >= 0) {
      scrollIntoContainer(pillScrollRef.current, pillRefs.current[pillIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  if (list.length === 0) return null;

  const goTo = (index) => setActiveIndex(((index % list.length) + list.length) % list.length);
  const scrollLeftManual = () => goTo(activeIndex - 1);
  const scrollRightManual = () => goTo(activeIndex + 1);
  const goToLanguage = (lang) => {
    const targetIndex = list.findIndex((n) => n.language === lang);
    if (targetIndex >= 0) goTo(targetIndex);
  };

  const activeLanguage = list[activeIndex]?.language;

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
              onClick={scrollLeftManual}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all duration-200"
              aria-label="Previous note"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollRightManual}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all duration-200"
              aria-label="Next note"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Badges — the pill matching the currently showing note lights up yellow */}
        <div
          ref={pillScrollRef}
          className="flex gap-2 mb-8 overflow-x-auto no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {distinctLanguages.map((lang, idx) => (
            <button
              key={idx}
              type="button"
              ref={(el) => (pillRefs.current[idx] = el)}
              onClick={() => goToLanguage(lang)}
              className={`shrink-0 cursor-pointer px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-300 ${
                lang === activeLanguage
                  ? "bg-[#F9C53D] text-[#002856] border-[#F9C53D]"
                  : "bg-[#002d5b] text-[#a7c8ff] border-[#254776] hover:border-[#F9C53D]/50"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Horizontal scroll container — auto-advances every 5s, infinite loop */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {list.map((note, idx) => (
            <div
              key={note.id}
              ref={(el) => (noteRefs.current[idx] = el)}
              className={`flex-shrink-0 w-72 bg-[#171c26]/60 p-6 rounded-3xl shadow-xl border flex flex-col justify-between transition-all duration-300 hover:shadow-2xl ${
                idx === activeIndex
                  ? "border-[#F9C53D]/60"
                  : "border-white/5 hover:border-white/10"
              }`}
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
