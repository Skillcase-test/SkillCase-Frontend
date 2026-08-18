import React from "react";
import mayaFull from "../../../assets/onboarding/mayaFull.webp";

const D = {
  heading: "Free German language demo",
  subtitle: "11 June 2026 | 7PM - 7:30 PM",
  check_item_1: "Today",
  check_item_2: "7:00 PM - 7:30 PM",
  button_text: "Register Now",
  button_link: "https://luma.com/Skillcase.in",
  badge_text: "Limited Seats available",
};

export function formatDemoDate(dateStr) {
  if (!dateStr) return "";
  if (dateStr.toLowerCase() === "today") {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return dateStr;
    }
  }
  return dateStr;
}

export default function DemoClassSection({ data }) {
  const d = data ? { ...D, ...data } : D;

  const rawDate = d.check_item_1 || "Today";
  const formattedDate = formatDemoDate(rawDate);
  const timing = d.check_item_2 || "7PM - 7:30 PM";

  const dateSubtitle =
    d.subtitle && !d.check_item_1
      ? d.subtitle
      : formattedDate && timing
        ? `${formattedDate} | ${timing}`
        : formattedDate || timing || "11 June 2026 | 7PM - 7:30 PM";

  return (
    <section className="px-4 py-2 w-full" aria-label="Demo Class">
      <div className="w-full px-4 pt-1 pb-0 bg-gradient-to-r from-[#002856] to-[#1E5CA2] rounded-2xl shadow-sm overflow-hidden flex items-end justify-between gap-3">
        {/* Left Column: Heading, Timing, CTA */}
        <div className="flex-1 flex flex-col justify-between py-1 pb-4 min-w-0">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-white text-base sm:text-lg font-bold leading-snug">
              {d.heading || D.heading}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm font-normal leading-normal">
              {dateSubtitle}
            </p>
          </div>

          <div className="mt-3.5">
            <a
              href={d.button_link || D.button_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 bg-[#EDB843] hover:bg-[#dfa938] active:scale-95 text-[#002856] text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Register Now
            </a>
          </div>
        </div>

        {/* Right Column: Maya Illustration (cropped to upper body/book) */}
        <div className="w-20 sm:w-24 h-30 sm:h-32 relative flex items-start justify-center shrink-0 self-end overflow-hidden">
          <img
            src={mayaFull}
            alt="Free Demo"
            loading="lazy"
            decoding="async"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-auto h-[175%] max-w-none object-contain select-none pointer-events-none"
          />
        </div>
      </div>
    </section>
  );
}
