import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";
import { getA1EntryRoute } from "../api/a1Api";

export default function ContinuePractice() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const userLevel = (user?.user_prof_level || "A1").toUpperCase();
        let a1ResolvedRoute = null;
        let isRevampA1User = false;

        if (userLevel === "A1") {
          try {
            const routeRes = await getA1EntryRoute();
            a1ResolvedRoute = routeRes?.data?.route || null;
            isRevampA1User =
              typeof a1ResolvedRoute === "string" &&
              a1ResolvedRoute.startsWith("/a1");
          } catch (routeErr) {
            console.error("Error resolving A1 entry route:", routeErr);
          }
        }

        const res = await api.get("/streak/last-chapter");
        if (res.data?.hasProgress) {
          const {
            proficiencyLevel,
            setId,
            setName,
            currentIndex,
            isA2,
            chapterId,
          } = res.data;

          // Handle A2 users - redirect to A2 flashcard route
          if (isA2) {
            navigate(`/a2/flashcard/${chapterId}`, { replace: true });
          } else if (isRevampA1User) {
            const targetChapterId = chapterId || setId;
            if (targetChapterId) {
              navigate(
                `/a1/flashcard/${targetChapterId}?start_index=${
                  currentIndex || 0
                }&name=${encodeURIComponent(setName || "Chapter")}`,
                { replace: true },
              );
            } else {
              navigate(a1ResolvedRoute || "/a1/flashcard", { replace: true });
            }
          } else {
            // A1 users - use original route format
            navigate(
              `/practice/${proficiencyLevel}/${setId}?set_name=${encodeURIComponent(
                setName,
              )}&start_index=${currentIndex}`,
              { replace: true },
            );
          }
        } else {
          // No progress - redirect based on user's proficiency level
          if (userLevel.toUpperCase() === "A2") {
            navigate("/a2/flashcard", { replace: true });
          } else if (isRevampA1User) {
            navigate(a1ResolvedRoute || "/a1/flashcard", { replace: true });
          } else {
            navigate(`/practice/${userLevel}`, { replace: true });
          }
        }
      } catch (err) {
        console.error("Error fetching last chapter:", err);
        navigate("/", { replace: true });
      }
    };

    if (user) {
      fetchAndRedirect();
    }
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
