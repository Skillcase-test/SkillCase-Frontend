import { useEffect } from "react";
import { useLocation, useNavigate, useRouteError } from "react-router-dom";
import { captureTelemetryError } from "../telemetry";
import AppErrorFallback from "../components/AppErrorFallback";
import { isChunkLoadError, reloadForChunkError } from "../utils/chunkErrors";

// Keeps the app chrome up around a failed screen; reports to telemetry itself.
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  const navigate = useNavigate();
  const staleChunk = isChunkLoadError(error);

  useEffect(() => {
    // A deploy replaced the chunk this screen needs — reload onto the new build.
    if (staleChunk && reloadForChunkError(null, error)) return;
    captureTelemetryError(error, {
      domain: "runtime",
      reason_code: "route_error",
      handled: false,
      severity: "fatal",
    });
  }, [error, staleChunk]);

  return (
    <AppErrorFallback
      staleChunk={staleChunk}
      // Re-navigating to the same URL resets the boundary and retries lazy()
      resetError={() =>
        navigate(`${location.pathname}${location.search}`, { replace: true })
      }
    />
  );
}
