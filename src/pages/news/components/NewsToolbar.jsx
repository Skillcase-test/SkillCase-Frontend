import React from "react";

const LEVELS = ["ALL", "A1", "A2"];

export default function NewsToolbar({
  level,
  onLevelChange,
  language,
  onLanguageChange,
}) {
  return (
    <div className="w-full max-w-xl mx-auto mb-4 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-3">
        <div className="grid grid-cols-2 rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => onLanguageChange("de")}
            className={`py-2 text-sm font-semibold transition-all ${
              language === "de"
                ? "bg-[#002856] text-white"
                : "bg-gray-50 text-gray-600"
            }`}
          >
            German
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange("en")}
            className={`py-2 text-sm font-semibold transition-all ${
              language === "en"
                ? "bg-[#002856] text-white"
                : "bg-gray-50 text-gray-600"
            }`}
          >
            English
          </button>
        </div>

        <div className="flex items-center gap-2">
          {LEVELS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onLevelChange(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                level === item
                  ? "bg-[#edb843] text-[#002856]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
