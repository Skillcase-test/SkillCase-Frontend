import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/axios";

export default function ContinuePractice() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const res = await api.get("/streak/last-chapter");
        if (res.data?.hasProgress) {
          const { proficiencyLevel, setId, setName, currentIndex } = res.data;
          navigate(
            `/practice/${proficiencyLevel}/${setId}?set_name=${encodeURIComponent(
              setName
            )}&start_index=${currentIndex}`,
            { replace: true }
          );
        } else {
          navigate(`/practice/${user?.user_prof_level || "A1"}`, {
            replace: true,
          });
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