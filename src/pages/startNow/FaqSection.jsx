import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FaqSection({ faqs = [] }) {
  const [openId, setOpenId] = useState(null);

  if (faqs.length === 0) return null;

  const toggleFaq = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-16 px-4 mb-16 w-full max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Everything you need to know about joining Skillcase and practicing in
          Germany.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;

          return (
            <div
              key={faq.id}
              className="overflow-hidden bg-white transition-all duration-300 border-b border-slate-100"
            >
              {/* Question Row */}
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full py-5 flex items-center justify-between text-left font-bold text-slate-800 text-sm sm:text-base hover:bg-slate-50/50 transition-colors gap-4"
              >
                <span>Q. {faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[#002856]" : ""
                  }`}
                />
              </button>

              {/* Answer Content */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? "max-h-[400px]" : "max-h-0"
                }`}
              >
                <p className="py-5 text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50/20">
                  A. {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
