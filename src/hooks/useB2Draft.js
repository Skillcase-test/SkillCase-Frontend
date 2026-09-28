import { useEffect, useRef, useState } from "react";
import { readB2Draft, writeB2Draft, removeB2Draft } from "../utils/b2Draft";

// Private to this learner, browser, exercise and assessment attempt. Never claims cloud sync.
export default function useB2Draft({
  draftKey,
  answers,
  setAnswers,
  blockIndex,
  setBlockIndex,
  loading,
  totalBlocks,
}) {
  const [readyKey, setReadyKey] = useState(null),
    [status, setStatus] = useState("");
  const cleared = useRef(null);
  useEffect(() => {
    if (loading || !totalBlocks || readyKey === draftKey) return;
    const draft = readB2Draft(draftKey);
    setAnswers(draft?.answers || {});
    setBlockIndex(
      Math.max(0, Math.min(totalBlocks - 1, Number(draft?.blockIndex) || 0)),
    );
    cleared.current = null;
    setReadyKey(draftKey);
  }, [draftKey, loading, totalBlocks, readyKey, setAnswers, setBlockIndex]);
  useEffect(() => {
    if (loading || readyKey !== draftKey || cleared.current === draftKey)
      return;
    setStatus(
      writeB2Draft(draftKey, answers, blockIndex) ? "saved" : "unavailable",
    );
  }, [answers, blockIndex, draftKey, readyKey, loading]);
  return {
    status,
    clear: () => {
      cleared.current = draftKey;
      removeB2Draft(draftKey);
    },
  };
}
