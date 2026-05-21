import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../api/axios";
import { loginSuccess } from "../../redux/auth/authSlice";
import { hapticLight } from "../../utils/haptics";
import { setClarityTag, trackClarityEvent } from "../../observability/clarity";

// Mascot Assets
import mayaStanding from "../../assets/onboarding/mayaStanding.webp";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import mayaSmiling from "../../assets/onboarding/mayaSmiling.webp";
import mayaFull from "../../assets/onboarding/mayaFull.webp";
import nurseIcon from "../../assets/onboarding/nurse.webp";
import studentIcon from "../../assets/onboarding/student.webp";
import supportIcon from "../../assets/onboarding/support.webp";
import otherIcon from "../../assets/onboarding/other.webp";
import whiteLogo from "../../assets/onboarding/white_mainlogo.webp";

// Shared Components
import TypewriterText from "../learnGerman/lesson/screens/shared/TypewriterText";
import { setLgFirstLandingMarker } from "../learnGerman/lgFirstTimeGuide";

// Map German level label to proficiency route
const LEVEL_ROUTE_MAP = {
  "A1 - Beginner\n(I know a few words)": "/a1",
  "A2 - Elementary\n(I understand basic sentences)": "/a2",
  "B1 - Intermediate\n(I can have simple conversations)": "/a2",
  "B2 - Upper Intermediate\n(I can speak fairly confidently)": "/a2",
};

const OTP_RESEND_SECONDS = 90;

const ONBOARDING_STEP_EVENTS = {
  1: "lg_onboarding_splash_viewed",
  2: "lg_onboarding_phone_viewed",
  3: "lg_onboarding_otp_viewed",
  4: "lg_onboarding_name_viewed",
  5: "lg_onboarding_occupation_viewed",
  6: "lg_onboarding_status_viewed",
  7: "lg_onboarding_level_viewed",
  8: "lg_onboarding_preference_viewed",
};

function normalizeOnboardingValue(value) {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// german_preference codes: "1" = Learn German, "2" = Practice German
// Also handles legacy text labels stored by an old onboarding bug
function isLearnGermanPref(pref) {
  if (!pref) return false;
  if (pref === "1") return true;
  if (typeof pref === "string" && pref.toLowerCase().includes("learn"))
    return true;
  return false;
}

const getPostLoginRoute = (user) => {
  if (user.lg_preferred_mode === "learn") {
    return "/learn-german";
  }
  if (isLearnGermanPref(user.german_preference)) {
    return "/learn-german";
  }
  return user.user_prof_level === "A2" ? "/a2" : "/a1";
};

const TopSection = React.memo(({ mascot, tooltip }) => (
  <div className="h-[42%] relative flex items-end px-4 pb-8">
    <img
      src={mascot}
      alt="Maya"
      className="h-[85%] w-[45%] object-contain object-bottom"
    />
    <div className="relative bg-white px-5 py-4 rounded-2xl shadow-sm mb-12 ml-2 w-[50%]">
      <p className="text-black text-[15px] font-medium leading-tight">
        <TypewriterText text={tooltip} speed={30} onCharacter={hapticLight} />
      </p>
      <svg
        className="absolute -left-[14px] top-[50%] -translate-y-1/2 w-[15px] h-[18px]"
        viewBox="0 0 15 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15 0C15 0 5 9 0 11C5 13 15 18 15 18V0Z" fill="white" />
      </svg>
    </div>
  </div>
));

const Step8TopSection = React.memo(({ germanStatus, mayaFull }) => {
  const text =
    germanStatus === "Yet to start (no knowledge)"
      ? "Great start! I recommend continuing learning German with guided lessons."
      : "Wonderful! You already know some German. Would you like to practice German or continue learning it.";

  return (
    <div className="h-[50%] relative flex items-end px-4 pb-4">
      <img
        src={mayaFull}
        alt="Maya"
        className="h-[95%] w-[45%] object-contain object-bottom"
      />
      <div className="absolute right-4 top-[15%] bg-white px-4 py-4 rounded-2xl shadow-sm w-[50%] z-10">
        <p className="text-black text-[14px] font-medium leading-snug">
          <TypewriterText text={text} speed={30} onCharacter={hapticLight} />
        </p>
        <svg
          className="absolute -left-[14px] top-[30%] -translate-y-1/2 w-[15px] h-[18px]"
          viewBox="0 0 15 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15 0C15 0 5 9 0 11C5 13 15 18 15 18V0Z" fill="white" />
        </svg>
      </div>
    </div>
  );
});

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [germanStatus, setGermanStatus] = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [preference, setPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const phoneInputRef = useRef(null);
  const lastNameRef = useRef(null);

  // Back navigation map: each step knows its previous step
  const BACK_MAP = { 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
  const handleBack = () => {
    setError("");
    setStep((s) => {
      if (s === 8 && germanStatus === "Yet to start (no knowledge)") {
        return 6;
      }
      return BACK_MAP[s] ?? s;
    });
  };

  // Hide global navbar only for step 1
  useEffect(() => {
    const navbar = document.querySelector("header");
    if (navbar) {
      navbar.style.display = step === 1 ? "none" : "";
    }
    return () => {
      if (navbar) navbar.style.display = "";
    };
  }, [step]);

  useEffect(() => {
    setClarityTag("lg_funnel", "onboarding");
    setClarityTag("lg_onboarding_step", step);
    trackClarityEvent(ONBOARDING_STEP_EVENTS[step] || "lg_onboarding_step_viewed", {
      lg_funnel: "onboarding",
      lg_onboarding_step: step,
    });
  }, [step]);

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => {
        setStep(2);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 3 || resendSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  // Screen 2 → 3: Send OTP
  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) return;
    setLoading(true);
    setError("");
    try {
      trackClarityEvent("lg_onboarding_otp_requested", {
        lg_funnel: "onboarding",
        lg_onboarding_step: 2,
      });
      await api.post("/user/send-otp", { phone: phoneNumber });
      trackClarityEvent("lg_onboarding_otp_sent", {
        lg_funnel: "onboarding",
        lg_onboarding_step: 3,
      });
      setOtp("");
      setResendSeconds(OTP_RESEND_SECONDS);
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.msg || "Failed to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (resendSeconds > 0 || loading) return;
    hapticLight();
    handleSendOTP();
  };

  // Screen 3 → 4 (new user) or Home (returning user)
  const handleVerifyOTP = async (otpOverride) => {
    const code = otpOverride ?? otp;
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/verify-otp", {
        phone: phoneNumber,
        code,
      });
      trackClarityEvent("lg_onboarding_otp_verified", {
        lg_funnel: "onboarding",
        lg_user_type: data.isNewUser ? "new" : "returning",
      }, "lg_onboarding_otp_verified");
      if (data.isNewUser) {
        setStep(4);
      } else {
        dispatch(loginSuccess({ token: data.token, user: data.user }));
        if (data.user?.lg_preferred_mode) {
          localStorage.setItem(
            "lg_preferred_mode",
            data.user.lg_preferred_mode,
          );
        }
        navigate(getPostLoginRoute(data.user), {
          replace: true,
        });
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = () => {
    if (firstName && lastName) {
      setError("");
      setStep(5);
    }
  };

  const handleOccupationSubmit = () => {
    if (occupation) {
      setError("");
      setStep(6);
    }
  };

  const handleGermanStatusSubmit = () => {
    setError("");
    if (germanStatus === "Yet to start (no knowledge)") {
      setGermanLevel("");
      setPreference("1");
      setStep(8);
    } else {
      setPreference("2");
      setStep(7);
    }
  };

  const handleGermanLevelSubmit = () => {
    if (germanLevel) {
      setError("");
      setPreference("2");
      setStep(8);
    }
  };

  // Screen 8 → Complete onboarding
  const handlePreferenceSubmit = async () => {
    if (!preference && germanStatus !== "Yet to start (no knowledge)") return;
    setLoading(true);
    setError("");
    try {
      // Normalize: codes "1"/"2" are canonical; text labels are legacy (step-8 bug fix)
      const germanPrefCode =
        preference === "2" || preference === "Practice my German" ? "2" : "1";
      const { data } = await api.post("/user/complete-onboarding-profile", {
        phone: phoneNumber,
        firstName,
        lastName,
        occupation,
        germanStatus,
        germanLevel,
        germanPreference: germanPrefCode,
      });
      dispatch(loginSuccess({ token: data.token, user: data.user }));
      localStorage.setItem(
        "lg_preferred_mode",
        germanPrefCode === "2" ? "practice" : "learn",
      );
      trackClarityEvent("lg_onboarding_completed", {
        lg_funnel: "onboarding",
        lg_selected_mode: germanPrefCode === "2" ? "practice" : "learn",
        lg_selected_level: germanLevel || "new_to_german",
        lg_german_status: germanStatus,
        lg_occupation: occupation,
      }, "lg_onboarding_completed");

      // Navigate based on preference
      if (germanPrefCode === "2") {
        navigate(LEVEL_ROUTE_MAP[germanLevel] || "/a1", { replace: true });
      } else {
        // "Continue learning German" or "Yet to start"
        setLgFirstLandingMarker();
        navigate("/learn-german", {
          replace: true,
          state: { fromOnboardingFirstLanding: true },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isPhoneValid = phoneNumber.length === 10;
  const isOtpValid = otp.length === 6;
  const isNameValid = firstName.length > 0 && lastName.length > 0;
  const isOccupationValid = occupation !== "";
  const isStatusValid = germanStatus !== "";
  const isLevelValid = germanLevel !== "";
  const isPreferenceValid = preference !== "";

  const selectOccupation = (value) => {
    setOccupation(value);
    trackClarityEvent("lg_onboarding_occupation_selected", {
      lg_funnel: "onboarding",
      lg_occupation: normalizeOnboardingValue(value),
      lg_onboarding_step: 5,
    });
  };

  const selectGermanStatus = (value) => {
    setGermanStatus(value);
    trackClarityEvent("lg_onboarding_status_selected", {
      lg_funnel: "onboarding",
      lg_german_status: normalizeOnboardingValue(value),
      lg_onboarding_step: 6,
    });
  };

  const selectGermanLevel = (value) => {
    setGermanLevel(value);
    trackClarityEvent("lg_onboarding_level_selected", {
      lg_funnel: "onboarding",
      lg_selected_level: normalizeOnboardingValue(value.split("\n")[0]),
      lg_onboarding_step: 7,
    });
  };

  const selectPreference = (value) => {
    setPreference(value);
    trackClarityEvent("lg_onboarding_preference_selected", {
      lg_funnel: "onboarding",
      lg_selected_mode: value === "2" ? "practice" : "learn",
      lg_onboarding_step: 8,
    });
  };

  // Shared Top Section Component for Screens 2-7

  const LevelBars = ({ level }) => {
    const heights = [12, 16, 20, 24]; // h-3, h-4, h-5, h-6
    return (
      <div className="w-8 h-8 relative flex items-end justify-center gap-[3px] pb-1.5 shrink-0">
        {[1, 2, 3, 4].map((i, idx) => (
          <div
            key={i}
            className={`w-1 rounded-lg ${
              i <= level ? "bg-[#001D4A]" : "bg-zinc-300"
            }`}
            style={{ height: `${heights[idx]}px` }}
          />
        ))}
      </div>
    );
  };

  const BottomActions = ({
    onNext,
    disabled,
    nextText = "Next",
    showBack = true,
  }) => (
    <div className="mt-auto mb-4 flex gap-3">
      {showBack && (
        <button
          onClick={() => {
            hapticLight();
            handleBack();
          }}
          className="w-1/3 h-[48px] rounded-lg border-2 border-zinc-200 bg-white text-[#1E3A8A] text-[16px] font-semibold shadow-sm active:scale-[0.98] transition-all"
        >
          Back
        </button>
      )}
      <button
        onClick={() => {
          hapticLight();
          onNext();
        }}
        disabled={disabled || loading}
        className={`flex-1 h-[48px] rounded-lg text-[16px] font-semibold transition-all ${
          !disabled && !loading
            ? "bg-gradient-to-r from-amber-200 to-amber-300 text-[#1E3A8A] shadow-md active:scale-[0.98] border border-[#eec139]"
            : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
        }`}
      >
        {loading ? "Please wait..." : nextText}
      </button>
    </div>
  );

  return (
    <div
      className={`w-full overflow-x-hidden flex justify-center items-center bg-gray-100 sm:p-4 ${
        step === 1
          ? "min-h-[100vh] sm:min-h-[100vh]"
          : "min-h-[calc(100vh-55px)] sm:min-h-[calc(100vh-72px)]"
      }`}
    >
      <div
        className={`w-full max-w-[600px] sm:h-[844px] bg-white relative overflow-hidden sm:rounded-[40px] sm:shadow-2xl flex flex-col ${
          step === 1 ? "h-[100vh]" : "h-[calc(100vh-55px)]"
        }`}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-[#001D4A] to-[#1A4B9F] flex flex-col items-center pt-24 pb-0"
            >
              <div className="absolute w-[600px] h-[600px] -left-[100px] top-[400px] bg-white/10 rounded-full blur-sm" />
              <div className="absolute w-[300px] h-[300px] -right-[50px] top-[500px] bg-white/20 rounded-full blur-sm" />
              <img
                src={whiteLogo}
                alt="Skillcase"
                className="h-60 z-10 -mt-26"
              />
              <div className="flex-1 w-full flex flex-col items-center justify-end relative z-10">
                <div className="mb-2 relative bg-white px-6 py-3 rounded-2xl shadow-xl">
                  <span className="text-black text-[15px] font-medium">
                    Hi, I am Maya.
                  </span>
                  <div className="absolute -bottom-[8px] left-[100px] -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
                </div>
                <img
                  src={mayaStanding}
                  alt="Maya"
                  className="w-[80%] max-w-[280px] object-contain object-bottom"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="phone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection mascot={mayaWave} tooltip="Welcome to Skillcase" />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-6">
                    Enter your 10 digit phone number
                  </h2>
                  <div className="flex min-w-0 gap-3 h-[48px]">
                    <div className="w-[64px] h-full rounded-lg border border-zinc-300 flex items-center justify-center bg-white">
                      <span className="text-[#9CA3AF] font-semibold text-[16px]">
                        +91
                      </span>
                    </div>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setPhoneNumber(val);
                        if (val.length === 10) {
                          phoneInputRef.current?.blur();
                        }
                      }}
                      placeholder="XXXXX-XXXXX"
                      className="min-w-0 flex-1 h-full rounded-lg border border-zinc-300 px-4 text-black font-semibold text-[16px] placeholder:text-zinc-200 focus:outline-none focus:border-[#1E76F3] focus:ring-[0.5px] focus:ring-[#1E76F3] transition-all"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-red-500 text-[13px] font-medium mt-2 mb-1">
                    {error}
                  </p>
                )}
                <div className="mt-auto mb-4">
                  <button
                    onClick={() => {
                      hapticLight();
                      handleSendOTP();
                    }}
                    disabled={!isPhoneValid || loading}
                    className={`w-full h-[48px] rounded-lg text-[16px] font-semibold transition-all ${
                      isPhoneValid && !loading
                        ? "bg-gradient-to-r from-amber-200 to-amber-300 text-black shadow-md active:scale-[0.98] border border-[#eec139]"
                        : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="otp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection mascot={mayaSmiling} tooltip="Enter your OTP." />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-6">
                    Enter the 6 digit OTP
                  </h2>
                  <div className="flex justify-between gap-2 mb-4">
                    {[...Array(6)].map((_, i) => (
                      <input
                        key={i}
                        type="tel"
                        maxLength="1"
                        autoFocus={i === 0}
                        value={otp[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val) {
                            const newOtp = otp.split("");
                            newOtp[i] = val;
                            const newOtpStr = newOtp.join("");
                            setOtp(newOtpStr);
                            if (i < 5) {
                              e.target.nextSibling?.focus();
                            } else if (newOtpStr.length === 6) {
                              e.target.blur();
                              handleVerifyOTP(newOtpStr);
                            }
                          } else {
                            const newOtp = otp.split("");
                            newOtp[i] = "";
                            setOtp(newOtp.join(""));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) {
                            e.target.previousSibling?.focus();
                          }
                        }}
                        className="w-[14%] aspect-square rounded-lg border border-zinc-300 text-center text-xl font-bold text-[#111827] focus:outline-none focus:border-[#1E76F3] focus:ring-[0.5px] focus:ring-[#1E76F3] transition-all shadow-sm"
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleResendOTP}
                    disabled={resendSeconds > 0 || loading}
                    className={`text-[12px] font-medium underline transition-colors ${
                      resendSeconds > 0 || loading
                        ? "text-zinc-400 cursor-not-allowed"
                        : "text-[#1E3A8A]"
                    }`}
                  >
                    {resendSeconds > 0
                      ? `Resend OTP in ${resendSeconds}s`
                      : "Resend OTP"}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-[13px] font-medium mt-2 mb-1">
                    {error}
                  </p>
                )}
                <div className="flex flex-col gap-4 mt-auto mb-4">
                  <button
                    onClick={() => {
                      hapticLight();
                      handleVerifyOTP();
                    }}
                    disabled={!isOtpValid || loading}
                    className={`w-full h-[48px] rounded-lg text-[16px] font-semibold  transition-all ${
                      isOtpValid && !loading
                        ? "bg-gradient-to-r from-amber-200 to-amber-300 text-[#1E3A8A] shadow-md active:scale-[0.98] border border-[#eec139]"
                        : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Verifying..." : "Enter"}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full h-[48px] rounded-lg border border-zinc-200 bg-white text-[#1E3A8A] text-[16px] font-semibold  shadow-sm active:scale-[0.98] transition-all"
                  >
                    Edit phone number
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection
                mascot={mayaSmiling}
                tooltip="What shall I call you?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-6">
                    Enter your name
                  </h2>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[#737373] text-[12px] font-medium mb-1">
                        First name
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") lastNameRef.current?.focus();
                        }}
                        className="w-full h-[48px] rounded-lg border border-zinc-300 px-4 text-black font-semibold text-[16px] focus:outline-none focus:border-[#1E76F3] focus:ring-[0.5px] focus:ring-[#1E76F3] shadow-sm transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[#737373] text-[12px] font-medium  mb-1">
                        Last name
                      </label>
                      <input
                        ref={lastNameRef}
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && firstName && lastName)
                            handleNameSubmit();
                        }}
                        className="w-full h-[48px] rounded-lg border border-zinc-300 px-4 text-black font-semibold text-[16px] focus:outline-none focus:border-[#1E76F3] focus:ring-[0.5px] focus:ring-[#1E76F3] shadow-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
                <BottomActions
                  onNext={handleNameSubmit}
                  disabled={!isNameValid}
                />
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="occupation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection mascot={mayaSmiling} tooltip="What do you do?" />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-5 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-4">
                    Select your current occupation
                  </h2>
                  <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                    {[
                      {
                        id: "A",
                        label: "Student (learning nursing)",
                        icon: studentIcon,
                      },
                      { id: "B", label: "Professional nurse", icon: nurseIcon },
                      {
                        id: "C",
                        label: "Healthcare support staff",
                        icon: supportIcon,
                      },
                      { id: "D", label: "Other", icon: otherIcon },
                    ].map((occ) => (
                      <button
                        key={occ.id}
                        onClick={() => selectOccupation(occ.label)}
                        className={`relative w-full h-[70px] px-2 rounded-[16px] border text-left flex items-center transition-all ${
                          occupation === occ.label
                            ? "border-[#1E76F3] bg-blue-50 ring-[0.5px] ring-[#1E76F3]"
                            : "border-zinc-300 bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <div className="absolute left-4 bottom-0 w-[64px] h-[64px] overflow-hidden pointer-events-none">
                          <img
                            src={occ.icon}
                            alt="Occupation icon"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span
                          className={`pl-[94px] pr-2 text-[14px] leading-tight font-medium transition-colors ${
                            occupation === occ.label
                              ? "text-[#1E76F3]"
                              : "text-[#1F2430]"
                          }`}
                        >
                          {occ.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <BottomActions
                  onNext={handleOccupationSubmit}
                  disabled={!isOccupationValid}
                />
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="germanStatus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection
                mascot={mayaSmiling}
                tooltip="What is your current German level?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-4">
                    Select your German level
                  </h2>
                  <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                    {[
                      { id: "A", label: "Yet to start (no knowledge)" },
                      { id: "B", label: "I am learning German" },
                    ].map((status) => (
                      <button
                        key={status.id}
                        onClick={() => selectGermanStatus(status.label)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all ${
                          germanStatus === status.label
                            ? "border-[#1E76F3] bg-blue-50 ring-[0.5px] ring-[#1E76F3]"
                            : "border-zinc-300 bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold transition-colors ${
                            germanStatus === status.label
                              ? "bg-blue-100 text-[#1E76F3]"
                              : "bg-black/5 text-gray-500"
                          }`}
                        >
                          {status.id}
                        </div>
                        <span
                          className={`text-[14px] font-semibold  transition-colors ${
                            germanStatus === status.label
                              ? "text-[#1E76F3]"
                              : "text-[#111827]"
                          }`}
                        >
                          {status.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <BottomActions
                  onNext={handleGermanStatusSubmit}
                  disabled={!isStatusValid}
                />
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="germanLevel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <TopSection
                mascot={mayaSmiling}
                tooltip="What is your current German level?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-3 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-10">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-4">
                    Select your German level
                  </h2>
                  <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                    {[
                      {
                        level: 1,
                        label: "A1 - Beginner\n(I know a few words)",
                      },
                      {
                        level: 2,
                        label:
                          "A2 - Elementary\n(I understand basic sentences)",
                      },
                      {
                        level: 3,
                        label:
                          "B1 - Intermediate\n(I can have simple conversations)",
                      },
                      {
                        level: 4,
                        label:
                          "B2 - Upper Intermediate\n(I can speak fairly confidently)",
                      },
                    ].map((lvl) => (
                      <button
                        key={lvl.level}
                        onClick={() => selectGermanLevel(lvl.label)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all ${
                          germanLevel === lvl.label
                            ? "border-[#1E76F3] bg-blue-50 ring-[0.5px] ring-[#1E76F3]"
                            : "border-zinc-300 bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <LevelBars level={lvl.level} />
                        <span
                          className={`text-[13px] font-semibold  whitespace-pre-line transition-colors ${
                            germanLevel === lvl.label
                              ? "text-[#1E76F3]"
                              : "text-[#111827]"
                          }`}
                        >
                          {lvl.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <BottomActions
                  onNext={handleGermanLevelSubmit}
                  disabled={!isLevelValid}
                />
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="preference"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col"
            >
              <Step8TopSection
                germanStatus={germanStatus}
                mayaFull={mayaFull}
              />

              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-18">
                <div className="flex-1">
                  <h2 className="text-black text-[16px] font-medium mb-4">
                    Select your preference
                  </h2>
                  <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                    {[
                      {
                        id: "A",
                        label:
                          germanStatus === "Yet to start (no knowledge)"
                            ? "Continue learning German"
                            : "Practice my German",
                        recommended:
                          germanStatus === "Yet to start (no knowledge)",
                      },
                      {
                        id: "B",
                        label:
                          germanStatus === "Yet to start (no knowledge)"
                            ? "Practice my German"
                            : "Continue learning German",
                        recommended:
                          germanStatus !== "Yet to start (no knowledge)",
                      },
                    ].map((pref) => {
                      const prefCode =
                        pref.label === "Continue learning German" ? "1" : "2";
                      const isSelected = preference === prefCode;
                      return (
                        <button
                          key={pref.id}
                          onClick={() => {
                            // Always store numeric codes, not label text
                            selectPreference(prefCode);
                          }}
                          className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all ${
                            isSelected
                              ? "border-[#1E76F3] bg-blue-50 ring-[0.5px] ring-[#1E76F3]"
                              : "border-zinc-300 bg-white hover:bg-zinc-50"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold transition-colors ${
                              isSelected
                                ? "bg-blue-100 text-[#1E76F3]"
                                : "bg-black/5 text-gray-500"
                            }`}
                          >
                            {pref.id}
                          </div>
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[14px] font-semibold  transition-colors ${
                                isSelected ? "text-[#1E76F3]" : "text-[#111827]"
                              }`}
                            >
                              {pref.label}
                            </span>
                            {pref.recommended && (
                              <div className="px-2 py-1 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-[#1E76F3] text-[11px] font-bold ">
                                  Recommended
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {error && (
                  <p className="text-red-500 text-[13px] font-medium mt-2 mb-1">
                    {error}
                  </p>
                )}
                <BottomActions
                  onNext={handlePreferenceSubmit}
                  disabled={!isPreferenceValid || loading}
                  nextText="Next"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
