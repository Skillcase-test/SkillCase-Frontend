import React from "react";

// Complete markdown parser for grammar explanations
const parseMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let tableRows = [];
  let inTable = false;
  let listItems = [];
  let inList = false;

  const processInlineFormatting = (text) => {
    // Handle bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-[#019035]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle code `text`
      if (part.includes("`")) {
        const codeParts = part.split(/`([^`]+)`/g);
        return codeParts.map((cp, ci) => {
          if (ci % 2 === 1) {
            return (
              <code
                key={`${idx}-${ci}`}
                className="bg-[#edfaff] text-[#002856] px-1.5 py-0.5 rounded text-sm font-medium"
              >
                {cp}
              </code>
            );
          }
          return cp;
        });
      }
      return part;
    });
  };

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="list-disc pl-6 mb-4 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700">
              {processInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const headers = tableRows[0];
      const dataRows = tableRows.slice(2); // Skip header separator
      
      elements.push(
        <div key={key} className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-[#002856] text-white">
              <tr>
                {headers.map((cell, idx) => (
                  <th key={idx} className="px-4 py-2 text-left font-semibold">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 border-t border-gray-200">
                      {processInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
    inTable = false;
  };

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();

    // Table detection
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      if (inList) flushList(`list-${i}`);
      inTable = true;
      const cells = trimmedLine.slice(1, -1).split("|");
      // Skip separator rows
      if (!trimmedLine.includes("---")) {
        tableRows.push(cells);
      } else {
        tableRows.push(null); // Placeholder for separator
      }
      return;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    // List items
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      inList = true;
      listItems.push(trimmedLine.slice(2));
      return;
    } else if (inList) {
      flushList(`list-${i}`);
    }

    // Headers
    if (trimmedLine.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-lg font-semibold text-[#002856] mt-5 mb-2"
        >
          {trimmedLine.slice(4)}
        </h3>
      );
    } else if (trimmedLine.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-xl font-semibold text-[#002856] mt-6 mb-3 border-b border-[#E5E7EB] pb-2"
        >
          {trimmedLine.slice(3)}
        </h2>
      );
    } else if (trimmedLine.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-[#002856] mb-4">
          {trimmedLine.slice(2)}
        </h1>
      );
    }
    // Empty lines
    else if (trimmedLine === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraphs (with inline formatting)
    else {
      elements.push(
        <p key={i} className="text-[#181d27] leading-relaxed mb-3">
          {processInlineFormatting(trimmedLine)}
        </p>
      );
    }
  });

  // Flush any remaining content
  if (inList) flushList("list-end");
  if (inTable) flushTable("table-end");

  return elements;
};

export default function A2GrammarExplanation({ explanation, title }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {title && (
        <h1 className="text-2xl font-bold text-[#002856] mb-6 pb-2 border-b border-[#E5E7EB]">
          {title}
        </h1>
      )}
      <div className="prose prose-blue max-w-none">
        {parseMarkdown(explanation)}
      </div>
    </div>
  );
}
