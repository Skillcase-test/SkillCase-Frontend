import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children, active = true, lockScroll = true }) {
  useEffect(() => {
    if (!active || !lockScroll) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [active, lockScroll]);

  if (!active) return null;
  return createPortal(children, document.body);
}
