import { useState } from "react";
import { retryB2MayaFeedback } from "../../../api/b2MayaApi";
import { Icon } from "./sp";

/** "Try feedback again" on the feedback-error screen; the parent re-polls after it. */
export default function RetryFeedback({ sessionId, onRetried }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await retryB2MayaFeedback(sessionId).catch(() => false);
        onRetried?.();
      }}
    >
      {busy ? "Trying again…" : "Try feedback again"}
      <Icon name="repeat" />
    </button>
  );
}
