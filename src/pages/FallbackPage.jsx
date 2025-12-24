import { useEffect, useState } from "react";
import api from "../api/axios";

const FallbackPage = () => {
  const [status, setStatus] = useState("Authenticating...");

  useEffect(() => {
    const authenticateAndRedirect = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = /android/i.test(userAgent);
      if (!isAndroid) {
        window.location.href = "https://learner.skillcase.in";
        return;
      }

      try {
        // Validate session with PHP
        const phpRes = await fetch(
          "https://skillcase.in/api/validate-session",
          {
            credentials: "include",
          }
        );

        if (!phpRes.ok) {
          setStatus("Not authenticated. Redirecting...");
          window.location.href =
            "https://skillcase.in/login?redirect=" +
            encodeURIComponent("https://learner.skillcase.in/open-app");
          return;
        }

        const phpData = await phpRes.json();

        if (!phpData.success) {
          window.location.href =
            "https://skillcase.in/login?redirect=" +
            encodeURIComponent("https://learner.skillcase.in/open-app");
          return;
        }

        // Create JWT via Node.js backend
        setStatus("Creating session...");

        const backendRes = await api.post("/sso/create-token", {
          phone: phpData.user.phone,
          name: phpData.user.name,
          email: phpData.user.email,
        });

        if (backendRes.data.success) {
          // Redirect to app WITH token
          setStatus("Opening app...");
          const token = backendRes.data.token;
          const user = encodeURIComponent(JSON.stringify(backendRes.data.user));
          window.location.href = `skillcase://app?token=${token}&user=${user}`;
          // Fallback if deep link fails
          setTimeout(() => {
            window.location.href = "https://learner.skillcase.in";
          }, 3000);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setStatus("Error. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "https://skillcase.in/login";
        }, 2000);
      }
    };
    authenticateAndRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center -mt-28">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Skillcase</h1>
        <p className="text-slate-600">{status}</p>
        <div className="mt-6">
          <div className="size-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto animate-spin"></div>
        </div>
      </div>
    </div>
  );
};
export default FallbackPage;
