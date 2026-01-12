import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const FallbackPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // With native auth, simply redirect based on auth state
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center -mt-28">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Skillcase</h1>
        <p className="text-slate-600">Redirecting...</p>
        <div className="mt-6">
          <div className="size-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default FallbackPage;
