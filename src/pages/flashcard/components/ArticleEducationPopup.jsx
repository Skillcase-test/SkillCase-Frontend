import React, { useEffect, useState } from 'react';
import { ARTICLES } from '../../../utils/articleUtils';
import './articleEducation.css';

/**
 * Educational popup that appears when user first encounters an article
 * Explains der/die/das with examples and tips
 */
const ArticleEducationPopup = ({ article, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const articleInfo = ARTICLES[article];

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!articleInfo) return null;

  const handleDismiss = () => {
    // Start exit animation
    setIsClosing(true);
    
    // Wait for animation to complete (300ms matches CSS animation duration)
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div className={`article-popup-overlay ${isClosing ? 'closing' : (isVisible ? 'visible' : '')}`}>
      <div 
        className={`article-popup-card ${isClosing ? 'exit' : (isVisible ? 'enter' : '')}`}
        style={{ '--article-color': articleInfo.color }}
      >
        {/* Header with colored badge */}
        <div className="article-popup-header">
          <div 
            className="article-badge"
            style={{ backgroundColor: articleInfo.color }}
          >
            {article}
          </div>
          <span className="article-label">{articleInfo.label}</span>
        </div>

        {/* Description */}
        <p 
          className="article-description"
          dangerouslySetInnerHTML={{ __html: articleInfo.description }}
        />

        {/* Examples */}
        <div className="article-examples">
          <strong>Examples:</strong>
          <ul>
            {articleInfo.examples.map((example, idx) => (
              <li key={idx}>{example}</li>
            ))}
          </ul>
        </div>

        {/* Tip */}
        <div className="article-tip">
          <strong>💡 Tip:</strong> {articleInfo.tip}
        </div>

        {/* Dismiss button */}
        <button 
          className="article-popup-button"
          onClick={handleDismiss}
        >
          Got it! ✓
        </button>
      </div>
    </div>
  );
};

export default ArticleEducationPopup;

