import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle } from "lucide-react";

const A2TestPrerequisiteModal = ({ topic, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // FIX: Handle prerequisites that may already be parsed or still a string
  const getPrerequisites = () => {
    if (!topic.prerequisites) return [];
    if (Array.isArray(topic.prerequisites)) return topic.prerequisites;
    if (typeof topic.prerequisites === "string") {
      try {
        return JSON.parse(topic.prerequisites);
      } catch {
        // If parse fails, treat as single item
        return [topic.prerequisites];
      }
    }
    return [];
  };

  const prerequisites = getPrerequisites();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => onDismiss(), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isClosing ? "bg-black/0" : isVisible ? "bg-black/50" : "bg-black/0"
      }`}
    >
      <div
        id="a2-test-prerequisite-modal"
        className={`bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all duration-300 ${
          isClosing
            ? "scale-95 opacity-0"
            : isVisible
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#fff5df] rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#edb843]" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#002856]">
              Before You Start
            </h3>
            <p className="text-sm text-gray-500">{topic.name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          We recommend completing these topics first for the best learning
          experience:
        </p>
        <div className="space-y-2 mb-6">
          {prerequisites.map((prereq, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {prereq}
              </span>
            </div>
          ))}
        </div>
        <button
          id="a2-test-got-it-btn"
          onClick={handleDismiss}
          className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold hover:bg-[#003d83] transition-colors"
        >
          Got it! ✓
        </button>
      </div>
    </div>
  );
};

export default A2TestPrerequisiteModal;
