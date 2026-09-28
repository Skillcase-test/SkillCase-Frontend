import { useRef, useState } from "react";
import { B2Button } from "../components/b2/B2UI";

export default function useB2SubmitGuard({ questions, answers, index, skill }) {
  const dialog = useRef(null),
    pending = useRef(null),
    trigger = useRef(null);
  const [skipped, setSkipped] = useState(0);
  const request = (action) => {
    if (index < questions.length - 1) {
      action();
      return;
    }
    const unanswered = questions.reduce(
      (count, block) =>
        count +
        (skill === "writing"
          ? [{ key: String(block.id) }]
          : (block.questions || []).map((_, i) => ({ key: `${block.id}_${i}` }))
        ).filter(({ key }) => {
          const value = answers[key];
          return (
            value == null ||
            (typeof value === "string" && !value.trim()) ||
            (Array.isArray(value) && !value.length)
          );
        }).length,
      0,
    );
    if (!unanswered) {
      action();
      return;
    }
    setSkipped(unanswered);
    pending.current = action;
    trigger.current = document.activeElement;
    dialog.current?.showModal();
  };
  const confirmation = (
    <dialog
      ref={dialog}
      className="b2-ui b2-dialog"
      aria-labelledby="b2-submit-title"
      onClose={() => trigger.current?.focus()}
    >
      <h2 id="b2-submit-title">Submit incomplete answers?</h2>
      <p>
        {skipped} {skipped === 1 ? "answer will" : "answers will"} be marked as
        skipped.
      </p>
      <B2Button onClick={() => dialog.current.close()}>Keep answering</B2Button>
      <B2Button
        variant="secondary"
        onClick={() => {
          dialog.current.close();
          pending.current?.();
        }}
      >
        Submit anyway
      </B2Button>
    </dialog>
  );
  return { request, confirmation };
}
