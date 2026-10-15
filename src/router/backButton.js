import { useEffect, useRef } from "react";

// Capacitor fires every backButton listener, so screens push a handler here
// instead of registering their own. Newest wins.
const handlers = [];

export function pushBackHandler(handler) {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  };
}

export function runBackHandler() {
  const handler = handlers[handlers.length - 1];
  if (!handler) return false;
  handler();
  return true;
}

/**
 * Makes Android back do what the screen's own back control does, while `enabled`.
 * Only for backs that differ from a plain history back (in-page steps, drawers,
 * leave-confirms, fixed-route backs). Registers once per enable, so re-renders
 * don't reorder the stack.
 */
export function useBackHandler(handler, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!enabled) return undefined;
    return pushBackHandler(() => latest.current?.());
  }, [enabled]);
}
