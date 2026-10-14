import { Suspense, lazy, useEffect, useState } from "react";

const loadModal = () => import("./UsageLimitModal");
const UsageLimitModal = lazy(loadModal);

// Keeps the modal out of the startup bundle. The first usage-limit event mounts it
// with that event; from then on the modal's own listener handles the rest.
export default function UsageLimitModalHost() {
  const [firstEvent, setFirstEvent] = useState(null);

  useEffect(() => {
    const onHit = (e) => setFirstEvent((prev) => prev ?? { detail: e.detail || null });
    window.addEventListener("skillcase:usage-limit", onHit);
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => loadModal(), { timeout: 8000 })
      : window.setTimeout(loadModal, 4000);
    return () => {
      window.removeEventListener("skillcase:usage-limit", onHit);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  if (!firstEvent) return null;
  return (
    <Suspense fallback={null}>
      <UsageLimitModal initialEvent={firstEvent} />
    </Suspense>
  );
}
