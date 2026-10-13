import { useState } from "react";
import { Star } from "lucide-react";
import { useMaya } from "./mayaLevel";
import { trackFeatureEvent } from "../../telemetry/events";

const STARS = [1, 2, 3, 4, 5];

/** "How was your call?" on the reviewing screen: 1-5 stars and an optional note, sent to the team. */
export default function ReviewCard({ sessionId, onDone }) {
  const { level, api } = useMaya();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const track = (event, attributes = {}) =>
    trackFeatureEvent("maya", event, { feature: `${level.toLowerCase()}.maya.feedback`, entityType: "maya_session", entityId: sessionId, attributes: { level, ...attributes } });

  const send = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await api.review(sessionId, { rating, text });
      track("feedback_submitted", { rating });
      onDone();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const skip = () => {
    // The showing is already used, so a failed skip has nothing left to undo.
    api.review(sessionId, { skip: true }).catch(() => {});
    track("feedback_skipped");
    onDone();
  };

  return (
    <section className="review-card" aria-label="Rate your call">
      <strong>How was your call with Maya?</strong>
      <p>Your rating goes straight to our team.</p>
      <div className="review-stars" role="radiogroup" aria-label="Rating">
        {STARS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} className={n <= rating ? "on" : ""} disabled={busy} onClick={() => setRating(n)}>
            <Star size={30} strokeWidth={1.6} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <textarea className="input" rows={3} maxLength={1000} placeholder="Anything we could do better? (optional)" value={text} disabled={busy} onChange={(e) => setText(e.target.value)} />
      )}
      {failed && <p className="error-inline">That didn’t send. Please try again.</p>}
      <div className="review-actions">
        <button type="button" className="secondary" disabled={busy} onClick={skip}>
          Skip
        </button>
        <button type="button" className="primary" disabled={busy || !rating} onClick={send}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </section>
  );
}
