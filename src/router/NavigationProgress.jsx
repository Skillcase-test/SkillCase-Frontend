import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

const SHOW_DELAY_MS = 150;

// Old screen stays up while the next chunk loads — this shows the tap registered.
export default function NavigationProgress() {
  const { state } = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state === "idle") {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[100001] h-[3px] overflow-hidden bg-sky-100/60"
      style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-sky-500" />
    </div>
  );
}
