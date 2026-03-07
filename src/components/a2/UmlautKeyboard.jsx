import React from "react";

const UMLAUTS = ["ä", "ö", "ü", "Ä", "Ö", "Ü", "ß"];

export default function UmlautKeyboard({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {UMLAUTS.map((char) => (
        <button
          key={char}
          type="button"
          onMouseDown={(e) => {
            // Prevent the input from losing focus on tap/click
            e.preventDefault();
            onInsert(char);
          }}
          className="px-3 py-1.5 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-[#002856] hover:border-[#002856] hover:bg-[#edfaff] active:scale-95 transition-all select-none"
        >
          {char}
        </button>
      ))}
    </div>
  );
}
