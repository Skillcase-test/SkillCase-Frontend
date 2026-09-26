import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 208; // w-52

// Portal-anchored dropdown: escapes overflow-auto wrappers and flips up when space runs out.
export default function AnchoredMenu({ anchorEl, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
      setPos({
        openUp,
        top: openUp ? undefined : Math.round(rect.bottom + 6),
        bottom: openUp
          ? Math.round(window.innerHeight - rect.top + 6)
          : undefined,
        left: Math.max(
          8,
          Math.min(
            Math.round(rect.right - MENU_WIDTH),
            window.innerWidth - MENU_WIDTH - 8,
          ),
        ),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorEl]);

  useEffect(() => {
    function handleOutside(e) {
      if (anchorEl && anchorEl.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      onClose();
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={`fixed z-[9999] w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 ${
        pos?.openUp ? "origin-bottom-right" : "origin-top-right"
      }`}
      style={{
        top: pos?.openUp ? "auto" : `${pos?.top ?? -9999}px`,
        bottom: pos?.openUp ? `${pos.bottom}px` : "auto",
        left: `${pos?.left ?? -9999}px`,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
