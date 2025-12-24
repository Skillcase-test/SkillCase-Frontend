import { useEffect, useState } from "react";

const FallbackPage = () => {
  const [status, setStatus] = useState("Detecting the device...");
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
      setStatus("Opening Skillcase app...");
      window.location.href = "skillcase://app";

      //it will redirect in future to playstore
      // setTimeout(() => {
      //   window.location.href = "playstore link";
      // }, 2000);
      setTimeout(() => {
        window.location.href = "https://learner.skillcase.in";
      }, 2000);
    } else {
      window.location.href = "https://learner.skillcase.in";
    }
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
