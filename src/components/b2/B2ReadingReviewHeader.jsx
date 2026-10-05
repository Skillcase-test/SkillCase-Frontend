import { useEffect, useId, useRef, useState } from "react";
import { Expand } from "lucide-react";
import B2PassageAudio from "./B2PassageAudio";

export default function B2ReadingReviewHeader({
  block,
  questionStart,
  questionCount,
  totalQuestions,
  passageIndex,
  passageCount,
  isSpeaking,
  isLoadingAudio,
  onListen,
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const imageId = useId();
  const heading = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, []);
  const title = block.block_title || "Leseverstehen";
  const questionEnd = questionStart + questionCount - 1;
  const range = questionCount > 1
    ? `Questions ${questionStart}–${questionEnd} of ${totalQuestions}`
    : questionCount === 1 ? `Question ${questionStart} of ${totalQuestions}` : "Passage review";

  return (
    <header className="b2-reading-review-header">
      <div className="b2-reading-review-position">
        <span>{range}</span>
        {passageCount > 1 && <span>Passage {passageIndex + 1} of {passageCount}</span>}
      </div>
      <div className="b2-reading-review-title">
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {block.hero_image_url && (
          <button
            type="button"
            className="b2-reading-review-thumbnail"
            aria-label={imageOpen ? "Hide passage image" : "Expand passage image"}
            aria-expanded={imageOpen}
            aria-controls={imageId}
            onClick={() => setImageOpen((open) => !open)}
          >
            <img src={block.hero_image_url} alt="" />
            <span><Expand size={12} aria-hidden="true" /> Image</span>
          </button>
        )}
      </div>
      <div className="b2-reading-review-tools">
        <div className="b2-reading-review-tags">
          <span>B2</span>
          {block.difficulty_tag && <span>{block.difficulty_tag}</span>}
        </div>
        {block.passage_text?.trim() && (
          <B2PassageAudio isSpeaking={isSpeaking} isLoadingAudio={isLoadingAudio} onListen={onListen} />
        )}
      </div>
      {block.hero_image_url && (
        <div id={imageId} className="b2-reading-review-image" hidden={!imageOpen}>
          <img src={block.hero_image_url} alt={`Passage illustration: ${title}`} />
        </div>
      )}
    </header>
  );
}
