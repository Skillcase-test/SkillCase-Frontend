import React from "react";

// Paper-style renderer for ward documents (charts, admission forms, signs).
// Block types: heading, subtitle, table, fields, text, list — `highlight`
// marks the value(s) a question is about.
export default function NursingDocumentSheet({ document }) {
  if (!document) return null;

  const renderBlock = (block, i) => {
    const highlights = new Set(
      (Array.isArray(block.highlight)
        ? block.highlight
        : [block.highlight]
      ).filter(Boolean),
    );
    const highlightText = (value) =>
      highlights.has(value)
        ? "bg-[#fde68a] px-1 rounded font-bold"
        : undefined;

    switch (block.type) {
      case "heading":
        return (
          <h4
            key={i}
            className="text-center text-[15px] font-extrabold text-[#002856] uppercase tracking-wide mb-1"
          >
            {block.text}
          </h4>
        );
      case "subtitle":
        return (
          <p
            key={i}
            className="text-center text-[11px] text-gray-500 font-medium mb-2"
          >
            {block.text}
          </p>
        );
      case "text":
        return (
          <p key={i} className="text-[12px] text-gray-800 leading-snug mb-2">
            {block.text}
          </p>
        );
      case "list":
        return (
          <ul key={i} className="mb-2 space-y-0.5">
            {(block.items || []).map((item, j) => (
              <li
                key={j}
                className={`text-[12px] text-gray-800 flex gap-1.5 ${highlightText(item) || ""}`}
              >
                <span className="text-[#ebaf44]">•</span>
                {item}
              </li>
            ))}
          </ul>
        );
      case "fields":
        return (
          <div key={i} className="mb-2 space-y-1">
            {(block.items || []).map((item, j) => (
              <div
                key={j}
                className={`text-[12px] text-gray-800 border-b border-dashed border-gray-300 pb-0.5 ${highlightText(item) || ""}`}
              >
                {item}
              </div>
            ))}
          </div>
        );
      case "table":
        return (
          <table key={i} className="w-full text-[11px] mb-2 border-collapse">
            {block.header && (
              <thead>
                <tr>
                  {block.header.map((h, j) => (
                    <th
                      key={j}
                      className="border border-gray-300 bg-gray-100 px-1.5 py-1 font-bold text-[#002856] text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(block.rows || []).map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td
                      key={k}
                      className={`border border-gray-300 px-1.5 py-1 text-gray-800 ${highlightText(cell) || ""}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return block.text ? (
          <p key={i} className="text-[12px] text-gray-800 mb-2">
            {block.text}
          </p>
        ) : null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 w-full">
      {(document.blocks || []).map(renderBlock)}
      {Array.isArray(document.key_words) && document.key_words.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-x-3 gap-y-1">
          {document.key_words.map((kw, i) => (
            <span key={i} className="text-[11px] text-gray-600">
              <b className="text-[#002856]">{kw.de}</b> — {kw.en}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
