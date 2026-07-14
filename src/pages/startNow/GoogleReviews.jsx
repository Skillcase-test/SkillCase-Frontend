import React from "react";
import { Star } from "lucide-react";

export default function GoogleReviews({ reviews = [] }) {
  if (reviews.length === 0) return null;

  const list = reviews;

  // Only display reviews with 4+ rating
  const filteredList = list.filter((r) => r.rating >= 4);

  // Loop reviews list for infinite marquee coverage
  const loopedList = [...filteredList, ...filteredList, ...filteredList];

  return (
    <section className="mb-16 overflow-hidden w-full bg-slate-50/20">
      <div className="max-w-7xl mx-auto px-4 mb-8 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
          {/* Mock Google Review G Symbol */}
          <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center font-bold text-xs shadow-xs text-blue-500">
            G
          </div>
          <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
            Google Reviews
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#002856]">
          Hear it Firsthand
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Read verified experiences from Indian nurses who successfully
          completed our program.
        </p>
      </div>

      {/* Infinite Review Marquee */}
      <div className="relative w-full flex overflow-x-hidden group/reviews">
        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 py-4 animate-reviews-marquee whitespace-nowrap group-hover/reviews:[animation-play-state:paused]">
          {loopedList.map((review, index) => {
            const initials = review.author_name
              ? review.author_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "RN";

            return (
              <div
                key={`${review.id}-${index}`}
                className="inline-block flex-shrink-0 w-80 md:w-96 bg-white border border-slate-100/80 p-6 rounded-3xl shadow-xs whitespace-normal transition-all duration-300 hover:scale-103 hover:shadow-md hover:border-[#F9C53D]/30 cursor-pointer"
              >
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#002856]/10 text-[#002856] flex items-center justify-center font-bold text-xs shrink-0">
                    {review.avatar_url ? (
                      <img
                        src={review.avatar_url}
                        alt={review.author_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#002856]">
                      {review.author_name}
                    </h4>
                    {/* Stars */}
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx < review.rating
                              ? "text-[#F9C53D] fill-current"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed italic">
                  "{review.review_text}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes reviews-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.33%, 0, 0);
          }
        }
        .animate-reviews-marquee {
          animation: reviews-marquee 45s linear infinite;
        }
      `}</style>
    </section>
  );
}
