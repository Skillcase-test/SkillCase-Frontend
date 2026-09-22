import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";

const LEVEL_HOME = {
  A1: "/a1/flashcard",
  A2: "/a2/flashcard",
  B1: "/b1/read-listen",
  B2: "/b2/reading",
};

export default function ContinuePractice() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    let mounted = true;
    const fetchAndRedirect = async () => {
      const userLevel = (user?.user_prof_level || "A1").toUpperCase();
      try {
        const res = await api.cachedGet("/streak/last-chapter", {}, "SHORT_PRIVATE");
        if (!mounted) return;
        if (res.data?.hasProgress) {
          const { chapterId, setId, setName, currentIndex, isA2 } = res.data;

          if (isA2) {
            navigate(`/a2/flashcard/${chapterId}`, { replace: true });
          } else if (userLevel === "A1") {
            const targetChapterId = chapterId || setId;
            navigate(
              targetChapterId
                ? `/a1/flashcard/${targetChapterId}?start_index=${
                    currentIndex || 0
                  }&name=${encodeURIComponent(setName || "Chapter")}`
                : "/a1/flashcard",
              { replace: true },
            );
          } else {
            navigate(LEVEL_HOME[userLevel] || "/", { replace: true });
          }
        } else {
          navigate(LEVEL_HOME[userLevel] || "/", { replace: true });
        }
      } catch (err) {
        console.error("Error fetching last chapter:", err);
        if (mounted) navigate("/", { replace: true });
      }
    };

    if (user) {
      fetchAndRedirect();
    }
    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="size-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto animate-spin mb-4"></div>
        <p className="text-slate-600">Loading your flashcards...</p>
      </div>
    </div>
  );
}
