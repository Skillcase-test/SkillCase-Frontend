import React from "react";

const ARTICLE_COLORS = { der: "#1E76F3", die: "#D6336C", das: "#0E9384" };
const PLURAL_COLOR = "#7A5AF8";

// Colors the leading article of a German term: der/die/das each get their own
// color, "·pl" marks plurals. "x / y" alternatives are handled per part.
export default function ArticleText({ text, className = "" }) {
  if (!text) return null;
  const plural = String(text).endsWith("·pl");
  const clean = String(text).replace("·pl", "");
  return (
    <span className={className}>
      {clean.split(" / ").map((part, i) => {
        const m = part.match(/^(der|die|das)\s+(.+)$/i);
        const color = plural ? PLURAL_COLOR : m ? ARTICLE_COLORS[m[1].toLowerCase()] : undefined;
        return (
          <React.Fragment key={i}>
            {i > 0 && " / "}
            {m ? (
              <>
                <span style={{ color }} className="font-extrabold">
                  {m[1]}
                </span>{" "}
                {m[2]}
              </>
            ) : (
              part
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
}
