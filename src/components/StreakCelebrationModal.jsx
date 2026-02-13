import { useEffect, useState, useRef } from "react";
import { Flame } from "lucide-react";

const StreakCelebrationModal = ({
  showStreakCelebration,
  setShowStreakCelebration,
  streakInfo,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (showStreakCelebration) {
      setIsVisible(true);
      // Small delay to trigger entry animation after render
      setTimeout(() => setAnimate(true), 10);
      
      // Play success sound
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/success-notification.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); // Ignore autoplay errors
    } else {
      setAnimate(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [showStreakCelebration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setShowStreakCelebration(false)}
      />

      {/* Main Card */}
      <div
        className={`relative w-full max-w-[340px] bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center transform transition-all duration-500 ${
          animate
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-90 translate-y-12 opacity-0"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Top Left Red Burst */}
        <div className="absolute top-8 left-8">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className="animate-[spin_3s_linear_infinite]"
          >
            {[...Array(8)].map((_, i) => (
              <rect
                key={i}
                x="18"
                y="0"
                width="4"
                height="10"
                rx="2"
                fill="#FF6B6B"
                transform={`rotate(${i * 45} 20 20)`}
              />
            ))}
          </svg>
        </div>

        {/* Floating Shapes */}
        <div className="absolute top-12 right-10 w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-100" />
        <div className="absolute bottom-32 left-6 w-4 h-4 bg-purple-400 rotate-45 animate-pulse" />
        <div className="absolute top-24 right-4 w-3 h-3 bg-red-400 rounded-sm rotate-12 animate-bounce delay-700" />
        <div className="absolute bottom-40 right-8 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500" />

        {/* Central Badge */}
        <div className="relative mt-8 mb-6">
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 flex justify-center items-end">
            <div className="w-8 h-16 bg-purple-500 -rotate-[25deg] translate-x-3 rounded-b-lg"></div>
            <div className="w-8 h-16 bg-purple-600 rotate-[25deg] -translate-x-3 rounded-b-lg"></div>
          </div>

          <div className="relative z-10 w-32 h-32 bg-[#FFD700] rounded-full flex items-center justify-center shadow-lg animate-[wiggle_1s_ease-in-out_infinite]">
            <div className="absolute inset-0 border-[6px] border-[#FFC107] rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>

            <div className="w-24 h-24 bg-[#FFCA28] rounded-full flex items-center justify-center shadow-inner">
              <div className="relative">
                <Flame className="w-12 h-12 text-white drop-shadow-md fill-white" />
                {/* Streak Count on the badge */}
                <div className="absolute -bottom-2 -right-2 bg-white text-[#FFC107] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                  {streakInfo.streakDays || 1}
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2">
          Streak Extended!
        </h2>

        <p className="text-slate-500 text-sm font-medium px-4 mb-8">
          You completed your daily goal. <br />
          <span className="text-slate-400">
            Current streak: {streakInfo.streakDays || 1} days
          </span>
        </p>

        <button
          onClick={() => setShowStreakCelebration(false)}
          className="w-full py-3.5 rounded-full font-bold text-white text-lg shadow-lg shadow-[#426996]  
                   bg-[#002856] hover:bg-[#002856] 
                   active:scale-95 transition-all duration-200 mb-2"
        >
          Continue Learning!
        </button>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
};

export default StreakCelebrationModal;
