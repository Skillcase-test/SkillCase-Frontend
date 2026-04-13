import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getA1EntryRoute } from "../../api/a1Api";

export default function A1EntryResolver() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveRoute = async () => {
      try {
        const routeRes = await getA1EntryRoute();
        if (!mounted) return;

        const resolvedRoute = routeRes.data?.route || "/a1/flashcard";
        if (resolvedRoute === "/practice/A1") {
          navigate("/practice/A1?legacy=1", { replace: true });
          return;
        }

        navigate(resolvedRoute, { replace: true });
      } catch (err) {
        console.error("Failed to resolve A1 entry:", err);
        navigate("/a1/flashcard", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    resolveRoute();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      {loading ? "Preparing A1 experience..." : "Redirecting..."}
    </div>
  );
}
