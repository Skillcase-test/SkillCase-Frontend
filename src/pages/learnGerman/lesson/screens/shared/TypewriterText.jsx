import { useEffect, useRef, useState } from "react";

export default function TypewriterText({
  text = "",
  speed = 55,
  className = "",
  onDone,
  onCharacter,
}) {
  const [visibleText, setVisibleText] = useState("");
  const onDoneRef = useRef(onDone);
  const onCharacterRef = useRef(onCharacter);

  useEffect(() => {
    onDoneRef.current = onDone;
    onCharacterRef.current = onCharacter;
  }, [onDone, onCharacter]);

  useEffect(() => {
    const safeText = String(text || "");
    setVisibleText("");
    if (!safeText) {
      onDoneRef.current?.();
      return undefined;
    }

    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setVisibleText(safeText.slice(0, i));
      // Fire only at the very first character (start of typing)
      if (i === 1) onCharacterRef.current?.();
      if (i >= safeText.length) {
        clearInterval(timer);
        onDoneRef.current?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <span className={className}>{visibleText}</span>;
}
