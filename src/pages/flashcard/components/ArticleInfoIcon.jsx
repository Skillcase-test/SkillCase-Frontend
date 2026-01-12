import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  ARTICLES,
  getSeenArticles,
  isEducationComplete,
} from "../../../utils/articleUtils";
import "./articleEducation.css";

/**
 * Info icon that appears near article words
 * Shows all learned articles when clicked
 * @param {string} article - Current article on the card
 * @param {string} userId - User ID for user-specific storage
 */
const ArticleInfoIcon = ({ article, userId, chapterNumber }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // ALWAYS show all 3 articles in the popup reference
  const seenArticles = ["der", "die", "das"];

  const handleClick = (e) => {
    e.stopPropagation();
    setShowPopup(true);
    setIsClosing(false);
  };

  const handleClosePopup = (e) => {
    e.stopPropagation();
    setIsClosing(true);
    setTimeout(() => {
      setShowPopup(false);
      setIsClosing(false);
    }, 300); // Match CSS transition duration
  };

  // Check if we should show the helper text (Chapter 1 or 2)
  // chapterNumber is usually a string from URL params, parseInt it
  const showHelperText = chapterNumber && parseInt(chapterNumber) <= 2;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        aria-label="Learn about German articles"
        className="w-8 h-8 flex items-center justify-center rounded-full transition-all bg-[#002856]/10 text-[#002856]/60 hover:bg-[#002856]/20"
      >
        <Info className="w-4 h-4" />
      </button>

      {showHelperText && (
        <span className="text-[10px] font-light text-[#7b7b7b]">
          Understand der, die, das
        </span>
      )}

      {showPopup && (
        <div
          className={`article-popup-overlay ${
            isClosing ? "closing" : "visible"
          }`}
          onClick={handleClosePopup}
        >
          <div
            className={`article-popup-card article-reference-card ${
              isClosing ? "exit" : "enter"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="article-popup-header">
              <span className="article-reference-title">
                📚 German Articles
              </span>
            </div>

            {/* Remember phrase at top */}
            <div className="article-tip" style={{ marginBottom: "16px" }}>
              Every German word has a gender. We show the article with each word
              to help you learn it correctly.
            </div>

            {/* Article list with short examples */}
            <div className="article-reference-list">
              {/* der - Masculine */}
              <div className="article-reference-item">
                <div
                  className="article-badge-small"
                  style={{ backgroundColor: "#3B82F6" }}
                >
                  der
                </div>
                <span className="article-reference-label">
                  Masculine{" "}
                  <span style={{ fontWeight: 400 }}>(der Mann - The man)</span>
                </span>
              </div>

              {/* das - Neutral */}
              <div className="article-reference-item">
                <div
                  className="article-badge-small"
                  style={{ backgroundColor: "#22C55E" }}
                >
                  das
                </div>
                <span className="article-reference-label">
                  Neutral{" "}
                  <span style={{ fontWeight: 400 }}>(das Auto - The car)</span>
                </span>
              </div>

              {/* die - Feminine */}
              <div className="article-reference-item">
                <div
                  className="article-badge-small"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  die
                </div>
                <span className="article-reference-label">
                  Feminine{" "}
                  <span style={{ fontWeight: 400 }}>
                    (die Frau - The woman)
                  </span>
                </span>
              </div>

              {/* Separator line with minimal gap */}
              <div
                style={{
                  height: "2px",
                  background: "#d1d5db",
                  margin: "-6px 0",
                }}
              ></div>

              {/* die - Plural */}
              <div className="article-reference-item">
                <div
                  className="article-badge-small"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  die
                </div>
                <span className="article-reference-label">
                  Plural{" "}
                  <span style={{ fontWeight: 400 }}>
                    (die Bücher - The books)
                  </span>
                </span>
              </div>
            </div>

            {/* Close button */}
            <button className="article-popup-button" onClick={handleClosePopup}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleInfoIcon;
