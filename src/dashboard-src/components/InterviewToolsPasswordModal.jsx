import React, { useState, useEffect, useRef } from "react";

const INTERVIEW_TOOLS_PASSWORD = import.meta.env.VITE_INTERVIEW_PASSWORD;

function InterviewToolsPasswordModal({ onSuccess, onCancel }) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (inputValue === INTERVIEW_TOOLS_PASSWORD) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setShaking(true);
      setInputValue("");
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
        style={{ animation: "fadeInScale 0.2s ease-out" }}
      >
        <style>{`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-8px); }
            40%       { transform: translateX(8px); }
            60%       { transform: translateX(-6px); }
            80%       { transform: translateX(6px); }
          }
          .shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>

        {/* Lock icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#004E92"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
          Interview Tools
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter the password to access this section.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={`mb-4 ${shaking ? "shake" : ""}`}>
            <input
              ref={inputRef}
              type="password"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Password"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-150 ${
                error
                  ? "border-red-400 bg-red-50 text-red-700 placeholder-red-300"
                  : "border-gray-200 bg-gray-50 text-gray-800 focus:border-blue-400 focus:bg-white"
              }`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1.5 ml-1">
                Incorrect password. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "#004E92" }}
          >
            Unlock
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 mt-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

export default InterviewToolsPasswordModal;
