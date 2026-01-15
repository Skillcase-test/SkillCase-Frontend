import { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import ManageEvents from "../../dashboard-src/pages/event/ManageEvents";

// Create axios instance that adds access code header
const createEventApi = (accessCode) => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
  });
  instance.interceptors.request.use((config) => {
    config.headers["x-access-code"] = accessCode;
    return config;
  });
  return instance;
};

export default function ManageEventsPublic() {
  const [accessCode, setAccessCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const storedCode = sessionStorage.getItem("event_access_code");
    if (storedCode) {
      verifyCode(storedCode, true);
    } else {
      setIsCheckingSession(false);
    }
  }, []);

  const verifyCode = async (code, isSessionCheck = false) => {
    if (!isSessionCheck) {
      setIsLoading(true);
    }
    setError("");
    
    try {
      const api = createEventApi(code);
      await api.get("/admin/events");

      sessionStorage.setItem("event_access_code", code);

      setIsAuthenticated(true);
      setError("");
    } catch (err) {
      sessionStorage.removeItem("event_access_code");
      if (!isSessionCheck) {
        setError("Invalid access code");
      }
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      setIsCheckingSession(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyCode(accessCode);
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#163B72] mx-auto mb-3" />
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <ManageEventsWrapper />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#163B72] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#163B72]">
            Event Management
          </h1>
          <p className="text-gray-600 mt-2">Enter access code to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter Access Code"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72] focus:border-transparent"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#163B72] text-white py-3 rounded-lg font-semibold hover:bg-[#0f2d5a] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Access"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Wrapper that provides the custom API to ManageEvents
function ManageEventsWrapper() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <ManageEvents useAccessCodeAuth={true} />
      </div>
    </div>
  );
}
