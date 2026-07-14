import React from "react";
import { Play } from "lucide-react";

export default function LearningStack({ components = [] }) {
  if (components.length === 0) return null;

  const list = components;

  return (
    <section className="px-4 mb-16 max-w-4xl mx-auto w-full">
      <div className="max-w-7xl mx-auto px-4 mb-10 text-center md:text-left">
        <h3 className="text-xl md:text-2xl font-extrabold text-[#002856]">
          Learning beyond the books
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          German doesn't have to feel like a subject.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {list.map((item, index) => {
          // Alternate borders between yellow and blue

          return (
            <div key={item.id} className="flex flex-col gap-4">
              {/* Main Heading outside the card (e.g. Learning is Simple) */}
              {item.heading && (
                <h2 className="text-lg md:text-2xl font-extrabold text-[#002856] tracking-tight px-1">
                  {item.heading}
                </h2>
              )}

              {/* Styled Card Component */}
              <div
                className={`border-l-4 py-6 px-3 sm:p-8 rounded-r-3xl shadow-xs border-y border-r border-slate-300 flex flex-col gap-4 transition-all duration-300 hover:shadow-md  bg-slate-100`}
              >
                {/* Playable Video Block (Interchanged to be above description) */}
                <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-video relative w-full max-w-2xl mt-1 mx-auto shadow-inner group">
                  {item.video_url ? (
                    <video
                      key={item.video_url}
                      src={item.video_url}
                      controls
                      className="w-full h-full object-cover"
                      poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800"
                      preload="auto"
                      playsInline
                    />
                  ) : (
                    // Video placeholder if no URL is uploaded
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#002856] text-white p-6 text-center">
                      <img
                        src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800"
                        alt="Class placeholder"
                        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                      />
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-[#F9C53D] text-[#002856] rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-95 cursor-pointer">
                          <Play className="w-5 h-5 fill-current text-[#002856]" />
                        </div>
                        <span className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                          Video Class Preview
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Short Description (Interchanged to be below video) */}
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  {item.short_description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
