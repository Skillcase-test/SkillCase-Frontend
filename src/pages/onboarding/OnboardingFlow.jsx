import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Capacitor, registerPlugin } from "@capacitor/core";
import api from "../../api/axios";
import { loginSuccess } from "../../redux/auth/authSlice";
import { hapticLight } from "../../utils/haptics";
import { setClarityTag, trackClarityEvent } from "../../observability/clarity";
import { trackFlowAction, useFlowJourney } from "../../telemetry/flow";
import { getPublicPathways } from "../../api/scholarshipExamApi";
import { Briefcase } from "lucide-react";

// Extracts first 6-digit sequence from SMS text
function extractOtp(smsText) {
  const match = smsText?.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

// Custom native Capacitor plugin (SmsPlugin.java in android project)
const SmsPlugin = registerPlugin("SmsPlugin");

// Mascot Assets
import mayaStanding from "../../assets/onboarding/mayaStanding.webp";
import mayaWave from "../../assets/onboarding/mayaWave.webp";
import mayaSmiling from "../../assets/onboarding/mayaSmiling.webp";
import mayaFull from "../../assets/onboarding/mayaFull.webp";
import { getMayaImage } from "../../utils/mayaAvatars";
import nurseIcon from "../../assets/onboarding/nurse.webp";
import studentIcon from "../../assets/onboarding/student.webp";
import supportIcon from "../../assets/onboarding/support.webp";
import otherIcon from "../../assets/onboarding/other.webp";
import whiteLogo from "../../assets/onboarding/white_mainlogo.webp";
import germanFlag from "../../assets/onboarding/germanFlag.webp";

// Shared Components
import TypewriterText from "../learnGerman/lesson/screens/shared/TypewriterText";

// New signups who have never taken their one free trial get the trial offer
// right after onboarding completes ("Welcome to {level} German level!").
// Everyone else lands on their normal destination.
const navigateAfterOnboarding = (userData, navigate, dest, state = {}) => {
  if (userData && !userData.trial_taken) {
    navigate("/trial-offer", { replace: true, state: { from: "/" } });
    return;
  }
  navigate(dest, { replace: true, ...state });
};
import { setLgFirstLandingMarker } from "../learnGerman/lgFirstTimeGuide";

// Map German level label to proficiency route
const LEVEL_ROUTE_MAP = {
  "A1 - Beginner\n(I know a few words)": "/a1",
  "A2 - Elementary\n(I understand basic sentences)": "/a2",
  "B1 - Intermediate\n(I can have simple conversations)": "/b1",
  "B2 - Upper Intermediate\n(I can speak fairly confidently)": "/b1",
};

const OTP_RESEND_SECONDS = 90;
const INDIAN_MOBILE_PHONE_REGEX = /^[6-9]\d{9}$/;

const ONBOARDING_STEP_EVENTS = {
  1: "lg_onboarding_splash_viewed",
  2: "lg_onboarding_phone_viewed",
  3: "lg_onboarding_otp_viewed",
  4: "lg_onboarding_name_viewed",
  5: "lg_onboarding_occupation_viewed",
  6: "lg_onboarding_pathway_viewed",
  7: "lg_onboarding_status_viewed",
  8: "lg_onboarding_level_viewed",
  9: "lg_onboarding_preference_viewed",
  10: "lg_onboarding_b1_b2_preference_viewed",
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
  if (
    user?.lg_preferred_mode === "job_screening" ||
    user?.german_preference === "3"
  ) {
    return "/job-screening";
  }
  // Scholarship candidates always return to the exam funnel.
  if (user?.lg_preferred_mode === "scholarship") {
    return "/scholarship";
  }
  if (user?.lg_preferred_mode === "learn") {
    return "/learn-german";
  }
  if (isLearnGermanPref(user?.german_preference)) {
    return "/learn-german";
  }
  return "/";
};

const TopSection = React.memo(({ mascot, tooltip }) => (
  <div className="h-[42%] relative flex items-end px-4 pb-8 md:h-full md:w-[45%] md:flex md:items-end md:justify-center md:pb-0 md:px-8 md:bg-[#E5F0FF]">
    <img
      src={mascot}
      alt="Maya"
      className="h-[85%] w-[45%] object-contain object-bottom md:h-[72%] md:max-h-[560px] md:w-auto md:max-w-[340px]"
    />
    <div className="relative bg-white px-5 py-4 rounded-2xl shadow-sm mb-12 ml-2 w-[50%] md:mb-36 md:ml-4 md:w-[260px] md:shadow-md">
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
    <div className="h-[50%] relative flex items-end px-4 pb-4 md:h-full md:w-[45%] md:flex md:items-end md:justify-center md:pb-0 md:px-8 md:bg-[#E5F0FF]">
      <img
        src={mayaFull}
        alt="Maya"
        className="h-[95%] w-[45%] object-contain object-bottom md:h-[78%] md:max-h-[580px] md:w-auto md:max-w-[340px]"
      />
      <div className="absolute right-4 top-[15%] bg-white px-4 py-4 rounded-2xl shadow-sm w-[50%] z-10 md:relative md:right-auto md:top-auto md:w-[260px] md:mb-36 md:ml-4 md:shadow-md">
        <p className="text-black text-[14px] font-medium leading-snug">
          <TypewriterText text={text} speed={30} onCharacter={hapticLight} />
        </p>
        <svg
          className="absolute -left-[14px] top-[30%] -translate-y-1/2 w-[15px] h-[18px] md:top-[50%]"
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

// Horizontal card for "Jobs in Germany" or when single other pathway exists
const BuiltinPathwayCard = React.memo(({ pathway, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full p-3.5 rounded-md border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
      selected
        ? "border-[#002856] bg-blue-50/40 ring-1 ring-[#002856]"
        : "border-zinc-300 bg-white hover:border-zinc-400"
    }`}
  >
    <div className="w-14 h-11 rounded overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
      {pathway.image_url ? (
        <img
          src={pathway.image_url}
          alt=""
          className="w-full h-full object-contain"
        />
      ) : pathway.is_builtin ? (
        <img src={germanFlag} alt="" className="w-full h-full object-contain" />
      ) : (
        <Briefcase className="w-5 h-5 text-zinc-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[13px] sm:text-[14px] font-semibold transition-colors ${
            selected ? "text-[#002856]" : "text-slate-900"
          }`}
        >
          {pathway.title}
        </span>
        {pathway.badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-700/10 text-green-700 border border-green-700/20">
            {pathway.badge}
          </span>
        )}
      </div>
      {pathway.description && (
        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-snug">
          {pathway.description}
        </p>
      )}
    </div>
  </button>
));

// Vertical card for other admin-created pathways in a grid
const OtherPathwayCard = React.memo(({ pathway, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full p-2.5 sm:p-3 rounded-md border text-center flex flex-col items-center justify-start transition-all cursor-pointer h-full ${
      selected
        ? "border-[#002856] bg-blue-50/40 ring-1 ring-[#002856]"
        : "border-zinc-300 bg-white hover:border-zinc-400"
    }`}
  >
    <div className="w-full h-11 sm:h-12 flex items-center justify-center mb-2 overflow-hidden bg-transparent shrink-0">
      {pathway.image_url ? (
        <img
          src={pathway.image_url}
          alt=""
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-slate-500" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0 w-full flex flex-col items-center text-center justify-start">
      <p
        className={`text-[11px] sm:text-[12px] font-bold leading-tight line-clamp-2 transition-colors ${
          selected ? "text-[#002856]" : "text-slate-900"
        }`}
      >
        {pathway.title}
      </p>
      {pathway.description && (
        <p className="text-[9px] sm:text-[10px] text-zinc-500 line-clamp-2 mt-1 leading-tight">
          {pathway.description}
        </p>
      )}
      {pathway.badge && (
        <div className="mt-1.5">
          <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
            {pathway.badge}
          </span>
        </div>
      )}
    </div>
  </button>
));

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpArray, setOtpArray] = useState(["", "", "", "", "", ""]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [germanStatus, setGermanStatus] = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [preference, setPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pathways, setPathways] = useState([]);
  const [selectedPathwayId, setSelectedPathwayId] = useState(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fails closed: a failed fetch leaves the list empty, so the pathway screen
  // is skipped and "Jobs in Germany" is implied (matching the server default).
  useEffect(() => {
    let cancelled = false;
    getPublicPathways()
      .then((res) => {
        if (!cancelled) {
          setPathways(
            Array.isArray(res?.data?.pathways) ? res.data.pathways : [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPathways([]);
          trackFlowAction(
            "onboarding",
            "learner_onboarding",
            "pathways_fetch_failed",
            { step: 6, reasonCode: "api_failed" },
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneInputRef = useRef(null);
  const lastNameRef = useRef(null);
  useFlowJourney({
    domain: "onboarding",
    flowId: "learner_onboarding",
    step,
    stepIndex: step - 1,
    totalSteps: 10,
  });

  // Back navigation map: each step knows its previous step.
  // 6 = pathways, 7 = German status, 8 = level, 9 = preference, 10 = B1/B2 pref.
  const BACK_MAP = { 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 8 };
  const hasOtherPathways = pathways.some((p) => !p.is_builtin);
  const handleBack = () => {
    setError("");
    setStep((s) => {
      let next;
      if (s === 9 && germanStatus === "Yet to start (no knowledge)") {
        // Preference → German status (the level step was skipped).
        next = 7;
      } else if (s === 7 && !hasOtherPathways) {
        // German status → occupation (the pathways screen was skipped).
        next = 5;
      } else {
        next = BACK_MAP[s] ?? s;
      }
      trackFlowAction("onboarding", "learner_onboarding", "step_navigated", {
        step: s,
        direction: "back",
        attributes: { step_index: next - 1 },
      });
      return next;
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
    trackClarityEvent(
      ONBOARDING_STEP_EVENTS[step] || "lg_onboarding_step_viewed",
      {
        lg_funnel: "onboarding",
        lg_onboarding_step: step,
      },
    );
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

  // Web OTP API (Chrome on Android - browser only)
  useEffect(() => {
    if (step !== 3) return undefined;
    if (!("OTPCredential" in window) || Capacitor.isNativePlatform())
      return undefined;

    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((credential) => {
        const code = credential.code;
        if (code) {
          const arr = code.split("").slice(0, 6);
          while (arr.length < 6) arr.push("");
          setOtpArray(arr);
          setOtp(code);
          handleVerifyOTP(code);
        }
      })
      .catch(() => {});

    return () => ac.abort();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native SMS User Consent API
  // Uses SmsPlugin.java to listen for incoming OTP SMS and shows native dialog
  useEffect(() => {
    if (step !== 3) return undefined;
    if (!Capacitor.isNativePlatform()) return undefined;

    let listenerHandle = null;

    const init = async () => {
      try {
        // Register listener BEFORE starting the consent watcher
        listenerHandle = await SmsPlugin.addListener("smsReceived", (data) => {
          const code = extractOtp(data?.message || "");
          if (code) {
            const arr = code.split("").slice(0, 6);
            while (arr.length < 6) arr.push("");
            setOtpArray(arr);
            setOtp(code);
            handleVerifyOTP(code);
          }
        });

        // Start watching for incoming OTP SMS
        await SmsPlugin.startSmsUserConsent();
      } catch (_) {
        // Plugin not available on this platform - silently skip
      }
    };

    init();
    return () => {
      listenerHandle?.remove();
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Screen 2 → 3: Send OTP
  const handleSendOTP = async () => {
    if (!INDIAN_MOBILE_PHONE_REGEX.test(phoneNumber)) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 2, validationCode: "phone_format" },
      );
      return;
    }
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
      setOtpArray(["", "", "", "", "", ""]);
      setResendSeconds(OTP_RESEND_SECONDS);
      setStep(3);
      trackFlowAction("onboarding", "learner_onboarding", "otp_sent", {
        step: 2,
        lifecycle: "succeeded",
      });
    } catch (err) {
      trackFlowAction("onboarding", "learner_onboarding", "otp_send_failed", {
        step: 2,
        lifecycle: "failed",
        reasonCode: "api_failed",
      });
      setError(
        err.response?.data?.msg || "Failed to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (resendSeconds > 0 || loading) return;
    trackFlowAction("onboarding", "learner_onboarding", "otp_resent", {
      step: 3,
      trigger: "manual",
    });
    hapticLight();
    handleSendOTP();
  };

  // Screen 3 → 4 (new user) or Home (returning user)
  const handleVerifyOTP = async (otpOverride) => {
    const code = otpOverride ?? otpArray.join("");
    if (code.length !== 6) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 3, validationCode: "otp_length" },
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/verify-otp", {
        phone: phoneNumber,
        code,
      });
      trackClarityEvent(
        "lg_onboarding_otp_verified",
        {
          lg_funnel: "onboarding",
          lg_user_type: data.isNewUser ? "new" : "returning",
        },
        "lg_onboarding_otp_verified",
      );
      if (data.isNewUser) {
        trackFlowAction("onboarding", "learner_onboarding", "otp_verified", {
          step: 3,
          lifecycle: "succeeded",
          branch: "new_user",
        });
        setStep(4);
      } else {
        trackFlowAction("onboarding", "learner_onboarding", "otp_verified", {
          step: 3,
          lifecycle: "succeeded",
          branch: "returning_user",
        });
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
      trackFlowAction("onboarding", "learner_onboarding", "otp_verify_failed", {
        step: 3,
        lifecycle: "failed",
        reasonCode: "invalid_or_expired",
      });
      setError(err.response?.data?.msg || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val, target) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 1) {
      // Pasted or autofilled sequence of digits
      const newArr = ["", "", "", "", "", ""];
      for (let k = 0; k < 6; k++) {
        if (digits[k]) newArr[k] = digits[k];
      }
      setOtpArray(newArr);
      const full = newArr.join("");
      setOtp(full);
      if (full.length === 6) {
        target.blur();
        handleVerifyOTP(full);
      }
      return;
    }

    const newArr = [...otpArray];
    newArr[i] = digits;
    setOtpArray(newArr);
    const full = newArr.join("");
    setOtp(full);

    if (digits) {
      if (i < 5) {
        target.nextSibling?.focus();
      } else if (newArr.every((d) => d !== "") && full.length === 6) {
        target.blur();
        handleVerifyOTP(full);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData("text") || "";
    const digits = (extractOtp(pasted) || pasted.replace(/\D/g, "")).slice(
      0,
      6,
    );
    if (digits) {
      const newArr = ["", "", "", "", "", ""];
      for (let k = 0; k < 6; k++) {
        if (digits[k]) newArr[k] = digits[k];
      }
      setOtpArray(newArr);
      setOtp(digits);
      if (digits.length === 6) {
        handleVerifyOTP(digits);
      }
    }
  };

  const handleNameSubmit = () => {
    if (firstName && lastName) {
      setError("");
      setStep(5);
      trackFlowAction("onboarding", "learner_onboarding", "step_completed", {
        step: 4,
        lifecycle: "succeeded",
      });
    } else {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 4, validationCode: "name_incomplete" },
      );
    }
  };

  const handleOccupationSubmit = () => {
    if (occupation) {
      setError("");
      // Show "What are you here for?" only when there are other pathways to
      // pick from; otherwise Jobs in Germany is implied and we go straight on.
      setStep(hasOtherPathways ? 6 : 7);
      trackFlowAction("onboarding", "learner_onboarding", "step_completed", {
        step: 5,
        lifecycle: "succeeded",
      });
    } else {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 5, validationCode: "occupation_required" },
      );
    }
  };

  const handleGermanStatusSubmit = () => {
    if (!germanStatus) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 7, validationCode: "german_status_required" },
      );
      return;
    }
    setError("");
    if (germanStatus === "Yet to start (no knowledge)") {
      setGermanLevel("");
      setPreference("1");
      setStep(9);
    } else if (germanStatus === "I have completed learning German") {
      setStep(8);
    } else {
      setPreference("2");
      setStep(8);
    }
  };

  const handleInstantJobScreeningSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/complete-onboarding-profile", {
        phone: phoneNumber,
        firstName,
        lastName,
        occupation,
        germanStatus,
        germanLevel,
        germanPreference: "3",
      });
      dispatch(loginSuccess({ token: data.token, user: data.user }));
      localStorage.setItem("lg_preferred_mode", "job_screening");
      trackClarityEvent(
        "lg_onboarding_completed",
        {
          lg_funnel: "onboarding",
          lg_selected_mode: "job_screening",
          lg_selected_level: germanLevel,
          lg_german_status: germanStatus,
          lg_occupation: occupation,
        },
        "lg_onboarding_completed",
      );
      navigate("/job-screening", { replace: true });
      trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
        step: 8,
        lifecycle: "succeeded",
        branch: "job_screening",
      });
    } catch (err) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "flow_completion_failed",
        { step: 8, lifecycle: "failed", reasonCode: "api_failed" },
      );
      setError(
        err.response?.data?.msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 6 "What are you here for?" — record the picked pathway.
  const selectPathway = (id) => {
    setSelectedPathwayId(id);
    const chosen = pathways.find((p) => p.id === id);
    trackFlowAction("onboarding", "learner_onboarding", "selection_changed", {
      step: 6,
      selectionCode: chosen
        ? normalizeOnboardingValue(chosen.title)
        : String(id),
    });
  };

  // Continue from the pathway screen: Jobs in Germany (built-in) flows into the
  // normal German questions; a real pathway enrols the candidate and routes them
  // straight to its exam.
  const handlePathwayContinue = () => {
    const builtin = pathways.find((p) => p.is_builtin) || null;
    const chosenId = selectedPathwayId ?? builtin?.id ?? null;
    const chosen = pathways.find((p) => p.id === chosenId) || builtin;
    if (!chosen || chosen.is_builtin) {
      trackFlowAction("onboarding", "learner_onboarding", "step_completed", {
        step: 6,
        lifecycle: "succeeded",
        branch: "jobs_in_germany",
      });
      setStep(7);
      return;
    }
    handlePathwaySubmit(chosen.id, chosen.title);
  };

  // Pathway enrolment — same endpoint as normal onboarding, but the backend
  // resolves pathwayId, sets current_pathway_id + the enrolment row, and flags
  // lg_preferred_mode="scholarship".
  const handlePathwaySubmit = async (pathwayId, title) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/complete-onboarding-profile", {
        phone: phoneNumber,
        firstName,
        lastName,
        occupation,
        pathwayId,
      });
      dispatch(loginSuccess({ token: data.token, user: data.user }));
      localStorage.setItem("lg_preferred_mode", "scholarship");
      trackClarityEvent(
        "lg_onboarding_completed",
        {
          lg_funnel: "onboarding",
          lg_selected_mode: "scholarship",
          lg_pathway: normalizeOnboardingValue(title),
          lg_occupation: occupation,
        },
        "lg_onboarding_completed",
      );
      navigate("/scholarship", { replace: true });
      trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
        step: 6,
        lifecycle: "succeeded",
        branch: "pathway",
        attributes: { pathway_id: pathwayId },
      });
    } catch (err) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "flow_completion_failed",
        { step: 6, lifecycle: "failed", reasonCode: "api_failed" },
      );
      setError(
        err.response?.data?.msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGermanLevelSubmit = () => {
    if (germanLevel) {
      setError("");
      if (germanStatus === "I have completed learning German") {
        handleInstantJobScreeningSubmit();
      } else {
        const isB1OrB2 =
          germanLevel.includes("B1") || germanLevel.includes("B2");
        if (isB1OrB2) {
          setPreference("");
          setStep(10);
        } else {
          setPreference("2");
          setStep(9);
        }
      }
    } else {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 8, validationCode: "german_level_required" },
      );
    }
  };

  // Screen 9 → Complete onboarding
  const handlePreferenceSubmit = async () => {
    if (!preference && germanStatus !== "Yet to start (no knowledge)") {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 9, validationCode: "preference_required" },
      );
      return;
    }
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
      trackClarityEvent(
        "lg_onboarding_completed",
        {
          lg_funnel: "onboarding",
          lg_selected_mode: germanPrefCode === "2" ? "practice" : "learn",
          lg_selected_level: germanLevel || "new_to_german",
          lg_german_status: germanStatus,
          lg_occupation: occupation,
        },
        "lg_onboarding_completed",
      );

      // Navigate based on preference
      if (germanPrefCode === "2") {
        trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
          step: 9,
          lifecycle: "succeeded",
          branch: "practice",
        });
        navigateAfterOnboarding(data.user, navigate, "/", {
          state: { justOnboarded: true },
        });
      } else {
        trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
          step: 9,
          lifecycle: "succeeded",
          branch: "learn",
        });
        // "Start learning German" or "Yet to start"
        setLgFirstLandingMarker();
        navigateAfterOnboarding(data.user, navigate, "/learn-german", {
          state: { fromOnboardingFirstLanding: true },
        });
      }
    } catch (err) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "flow_completion_failed",
        { step: 9, lifecycle: "failed", reasonCode: "api_failed" },
      );
      setError(
        err.response?.data?.msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleB1B2PreferenceSubmit = async () => {
    if (!preference) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "validation_blocked",
        { step: 10, validationCode: "preference_required" },
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/user/complete-onboarding-profile", {
        phone: phoneNumber,
        firstName,
        lastName,
        occupation,
        germanStatus,
        germanLevel,
        germanPreference: preference,
      });
      dispatch(loginSuccess({ token: data.token, user: data.user }));
      localStorage.setItem(
        "lg_preferred_mode",
        preference === "3" ? "job_screening" : "practice",
      );
      trackClarityEvent(
        "lg_onboarding_completed",
        {
          lg_funnel: "onboarding",
          lg_selected_mode: preference === "3" ? "job_screening" : "practice",
          lg_selected_level: germanLevel,
          lg_german_status: germanStatus,
          lg_occupation: occupation,
        },
        "lg_onboarding_completed",
      );

      if (preference === "3") {
        trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
          step: 10,
          lifecycle: "succeeded",
          branch: "job_screening",
        });
        navigateAfterOnboarding(data.user, navigate, "/job-screening");
      } else {
        trackFlowAction("onboarding", "learner_onboarding", "flow_completed", {
          step: 10,
          lifecycle: "succeeded",
          branch: "practice",
        });
        navigateAfterOnboarding(data.user, navigate, "/", {
          state: { justOnboarded: true },
        });
      }
    } catch (err) {
      trackFlowAction(
        "onboarding",
        "learner_onboarding",
        "flow_completion_failed",
        { step: 10, lifecycle: "failed", reasonCode: "api_failed" },
      );
      setError(
        err.response?.data?.msg || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isPhoneValid = INDIAN_MOBILE_PHONE_REGEX.test(phoneNumber);
  const isOtpValid =
    otpArray.every((d) => Boolean(d) && d.length === 1) &&
    otpArray.join("").length === 6;
  const isNameValid = firstName.length > 0 && lastName.length > 0;
  const isOccupationValid = occupation !== "";
  const isStatusValid = germanStatus !== "";
  const isLevelValid = germanLevel !== "";
  const isPreferenceValid = preference !== "";

  // New step-6 "What are you here for?" — Jobs in Germany is the built-in card
  // and is pre-selected; admin pathways (each wrapping one exam) list below it.
  const builtinPathway = pathways.find((p) => p.is_builtin) || null;
  const otherPathways = pathways.filter((p) => !p.is_builtin);
  const selectedPathwayOrDefault =
    selectedPathwayId ?? builtinPathway?.id ?? null;

  const selectOccupation = (value) => {
    setOccupation(value);
    trackFlowAction("onboarding", "learner_onboarding", "selection_changed", {
      step: 5,
      selectionCode: normalizeOnboardingValue(value),
    });
    trackClarityEvent("lg_onboarding_occupation_selected", {
      lg_funnel: "onboarding",
      lg_occupation: normalizeOnboardingValue(value),
      lg_onboarding_step: 5,
    });
  };

  const selectGermanStatus = (value) => {
    setGermanStatus(value);
    trackFlowAction("onboarding", "learner_onboarding", "selection_changed", {
      step: 7,
      selectionCode: normalizeOnboardingValue(value),
    });
    trackClarityEvent("lg_onboarding_status_selected", {
      lg_funnel: "onboarding",
      lg_german_status: normalizeOnboardingValue(value),
      lg_onboarding_step: 7,
    });
  };

  const selectGermanLevel = (value) => {
    setGermanLevel(value);
    trackFlowAction("onboarding", "learner_onboarding", "selection_changed", {
      step: 8,
      selectionCode: normalizeOnboardingValue(value.split("\n")[0]),
    });
    trackClarityEvent("lg_onboarding_level_selected", {
      lg_funnel: "onboarding",
      lg_selected_level: normalizeOnboardingValue(value.split("\n")[0]),
      lg_onboarding_step: 8,
    });
  };

  const selectPreference = (value) => {
    setPreference(value);
    trackFlowAction("onboarding", "learner_onboarding", "selection_changed", {
      step: 9,
      selectionCode: value,
    });
    trackClarityEvent("lg_onboarding_preference_selected", {
      lg_funnel: "onboarding",
      lg_selected_mode: value === "2" ? "practice" : "learn",
      lg_onboarding_step: 9,
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
    <div className="mt-auto mb-4 flex gap-3 md:mt-0 md:mb-0">
      {showBack && (
        <button
          onClick={() => {
            hapticLight();
            handleBack();
          }}
          className="w-1/3 h-[48px] rounded-lg border-2 border-zinc-200 bg-white text-[#1E3A8A] text-[16px] font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:bg-zinc-50"
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
            ? "bg-gradient-to-r from-amber-200 to-amber-300 text-[#1E3A8A] shadow-md active:scale-[0.98] border border-[#eec139] cursor-pointer hover:brightness-105"
            : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
        }`}
      >
        {loading ? "Please wait..." : nextText}
      </button>
    </div>
  );

  return (
    <div className="w-full h-[100vh] min-h-[100vh] overflow-x-hidden flex justify-center items-center bg-white">
      <div className="w-full h-full bg-white relative overflow-hidden flex flex-col md:flex-row">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-[#002856] to-[#1A4B9F] flex flex-col items-center justify-between pt-16 pb-0 overflow-hidden select-none"
              style={{
                paddingTop: "max(env(safe-area-inset-top), 4rem)",
                paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
              }}
            >
              {/* Ambient background glow orbs */}
              <div className="absolute w-[500px] h-[500px] -left-[120px] top-[320px] bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute w-[320px] h-[320px] -right-[60px] top-[420px] bg-white/15 rounded-full blur-2xl pointer-events-none" />

              {/* Top Logo */}
              <div className="relative z-10 flex flex-col items-center">
                <img
                  src={whiteLogo}
                  alt="Skillcase"
                  className="h-32 sm:h-40 md:h-44 object-contain drop-shadow-md"
                />
              </div>

              {/* Center/Bottom Mascot & Speech bubble */}
              <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-end">
                <div className="mb-3 relative bg-white px-6 py-3 rounded-2xl shadow-xl flex items-center justify-center max-w-[85%]">
                  <span className="text-black text-[15px] font-semibold text-center leading-tight">
                    Hi, I am Maya.
                  </span>
                  <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
                </div>

                {/* Mascot Image */}
                <img
                  src={mayaStanding}
                  alt="Maya"
                  className="w-[75%] max-w-[260px] sm:max-w-[280px] md:max-w-[300px] object-contain object-bottom"
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
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection mascot={mayaWave} tooltip="Welcome to Skillcase" />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && isPhoneValid && !loading) {
                            handleSendOTP();
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
                  <div className="mt-auto mb-4 md:mt-0 md:mb-0">
                    <button
                      onClick={() => {
                        hapticLight();
                        handleSendOTP();
                      }}
                      disabled={!isPhoneValid || loading}
                      className={`w-full h-[48px] rounded-lg text-[16px] font-semibold transition-all ${
                        isPhoneValid && !loading
                          ? "bg-gradient-to-r from-amber-200 to-amber-300 text-black shadow-md active:scale-[0.98] border border-[#eec139] cursor-pointer hover:brightness-105"
                          : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
                      }`}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
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
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection mascot={mayaSmiling} tooltip="Enter your OTP." />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
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
                          value={otpArray[i] || ""}
                          onPaste={handleOtpPaste}
                          onChange={(e) =>
                            handleOtpChange(i, e.target.value, e.target)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                              if (!otpArray[i] && i > 0) {
                                e.target.previousSibling?.focus();
                                const nextArr = [...otpArray];
                                nextArr[i - 1] = "";
                                setOtpArray(nextArr);
                                setOtp(nextArr.join(""));
                              }
                            } else if (e.key === "Enter") {
                              if (isOtpValid && !loading) {
                                handleVerifyOTP(otpArray.join(""));
                              }
                            }
                          }}
                          className="w-[14%] aspect-square rounded-lg border border-zinc-300 text-center text-xl font-bold text-[#111827] focus:outline-none focus:border-[#1E76F3] focus:ring-[0.5px] focus:ring-[#1E76F3] transition-all shadow-sm"
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleResendOTP}
                      disabled={resendSeconds > 0 || loading}
                      className={`text-[12px] font-medium underline transition-colors cursor-pointer ${
                        resendSeconds > 0 || loading
                          ? "text-zinc-400 cursor-not-allowed"
                          : "text-[#1E3A8A] hover:text-blue-800"
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
                  <div className="flex flex-col gap-4 mt-auto mb-4 md:mt-0 md:mb-0">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        handleVerifyOTP(otpArray.join(""));
                      }}
                      disabled={!isOtpValid || loading}
                      className={`w-full h-[48px] rounded-lg text-[16px] font-semibold transition-all ${
                        isOtpValid && !loading
                          ? "bg-gradient-to-r from-amber-200 to-amber-300 text-[#1E3A8A] shadow-md active:scale-[0.98] border border-[#eec139] cursor-pointer hover:brightness-105"
                          : "bg-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
                      }`}
                    >
                      {loading ? "Verifying..." : "Enter"}
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="w-full h-[48px] rounded-lg border border-zinc-200 bg-white text-[#1E3A8A] text-[16px] font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:bg-zinc-50"
                    >
                      Edit phone number
                    </button>
                  </div>
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
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection
                mascot={mayaSmiling}
                tooltip="What shall I call you?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
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
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="occupation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection mascot={mayaSmiling} tooltip="What do you do?" />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-5 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
                    <h2 className="text-black text-[16px] font-medium mb-4">
                      Select your current occupation
                    </h2>
                    <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                      {[
                        {
                          id: "A",
                          label: "Professional nurse",
                          icon: supportIcon,
                        },
                        { id: "B", label: "Physiotherapist", icon: nurseIcon },
                        {
                          id: "C",
                          label: "Student (learning nursing)",
                          icon: studentIcon,
                        },
                        { id: "D", label: "Other", icon: otherIcon },
                      ].map((occ) => (
                        <button
                          key={occ.id}
                          onClick={() => selectOccupation(occ.label)}
                          className={`relative w-full h-[70px] px-2 rounded-[16px] border text-left flex items-center transition-all cursor-pointer ${
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
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="pathways"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection
                mascot={getMayaImage("wave", occupation)}
                tooltip="What are you here for?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-6 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[420px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-4">
                    <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-2">
                      Language learning and jobs
                    </p>
                    <div className="flex flex-col gap-2.5 mb-4">
                      {builtinPathway && (
                        <BuiltinPathwayCard
                          pathway={builtinPathway}
                          selected={
                            selectedPathwayOrDefault === builtinPathway.id
                          }
                          onSelect={() => selectPathway(builtinPathway.id)}
                        />
                      )}
                    </div>

                    {otherPathways.length > 0 && (
                      <>
                        <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-2">
                          Other pathways
                        </p>
                        {otherPathways.length === 1 ? (
                          <div className="flex flex-col gap-2.5 mb-4">
                            <BuiltinPathwayCard
                              pathway={otherPathways[0]}
                              selected={
                                selectedPathwayOrDefault === otherPathways[0].id
                              }
                              onSelect={() =>
                                selectPathway(otherPathways[0].id)
                              }
                            />
                          </div>
                        ) : (
                          <div
                            className={`grid gap-2 mb-4 ${
                              otherPathways.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-3"
                            }`}
                          >
                            {otherPathways.map((p) => (
                              <OtherPathwayCard
                                key={p.id}
                                pathway={p}
                                selected={selectedPathwayOrDefault === p.id}
                                onSelect={() => selectPathway(p.id)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {error && (
                    <p className="text-red-500 text-[13px] font-medium mt-2 mb-1">
                      {error}
                    </p>
                  )}
                  <BottomActions
                    onNext={handlePathwayContinue}
                    disabled={!selectedPathwayOrDefault || loading}
                    nextText="Continue"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="germanStatus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection
                mascot={getMayaImage("smiling", occupation)}
                tooltip="What is your current German level?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-8 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
                    <h2 className="text-black text-[16px] font-medium mb-4">
                      Select your German level
                    </h2>
                    <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                      {[
                        { id: "A", label: "Yet to start (no knowledge)" },
                        { id: "B", label: "I am learning German" },
                        { id: "C", label: "I have completed learning German" },
                      ].map((status) => (
                        <button
                          key={status.id}
                          onClick={() => selectGermanStatus(status.label)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
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
                    nextText="Next"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="germanLevel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection
                mascot={getMayaImage("smiling", occupation)}
                tooltip="What is your current German level?"
              />
              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-3 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-10 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
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
                      ]
                        .filter(
                          (lvl) =>
                            germanStatus !==
                              "I have completed learning German" ||
                            lvl.level >= 3,
                        )
                        .map((lvl) => {
                          const [title, desc] = lvl.label.split("\n");
                          return (
                            <button
                              key={lvl.level}
                              onClick={() => selectGermanLevel(lvl.label)}
                              className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
                                germanLevel === lvl.label
                                  ? "border-[#1E76F3] bg-blue-50 ring-[0.5px] ring-[#1E76F3]"
                                  : "border-zinc-300 bg-white hover:bg-zinc-50"
                              }`}
                            >
                              <LevelBars level={lvl.level} />
                              <div className="flex flex-col">
                                <span
                                  className={`text-[14px] font-semibold transition-colors ${
                                    germanLevel === lvl.label
                                      ? "text-[#1E76F3]"
                                      : "text-[#111827]"
                                  }`}
                                >
                                  {title}
                                </span>
                                {desc && (
                                  <span
                                    className={`text-[12px] font-normal transition-colors ${
                                      germanLevel === lvl.label
                                        ? "text-[#1E76F3]/80"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {desc}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  <BottomActions
                    onNext={handleGermanLevelSubmit}
                    disabled={!isLevelValid}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div
              key="preference"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <Step8TopSection
                germanStatus={germanStatus}
                mayaFull={mayaFull}
              />

              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-18 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
                    <h2 className="text-black text-[16px] font-medium mb-4">
                      Select your preference
                    </h2>
                    <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                      {[
                        {
                          id: "A",
                          label:
                            germanStatus === "Yet to start (no knowledge)"
                              ? "Start learning German"
                              : "Practice my German",
                          recommended: true,
                        },
                        {
                          id: "B",
                          label:
                            germanStatus === "Yet to start (no knowledge)"
                              ? "Practice my German"
                              : "Start learning German",
                          recommended: false,
                        },
                      ].map((pref) => {
                        const prefCode =
                          pref.label === "Start learning German" ? "1" : "2";
                        const isSelected = preference === prefCode;
                        return (
                          <button
                            key={pref.id}
                            onClick={() => {
                              // Always store numeric codes, not label text
                              selectPreference(prefCode);
                            }}
                            className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
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
                                  isSelected
                                    ? "text-[#1E76F3]"
                                    : "text-[#111827]"
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
              </div>
            </motion.div>
          )}

          {step === 10 && (
            <motion.div
              key="b1_b2_preference"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#E5F0FF] flex flex-col md:flex-row"
            >
              <TopSection
                mascot={getMayaImage("smiling", occupation)}
                tooltip="Since you already have intermediate or advanced German skills, which path would you like to take?"
              />

              <div className="flex-1 bg-white rounded-t-[32px] px-6 py-8 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 -mt-10 md:h-full md:w-[55%] md:rounded-none md:mt-0 md:shadow-none md:px-16 md:py-12 md:justify-center md:overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 md:justify-center">
                  <div className="flex-1 md:flex-initial md:mb-8">
                    <h2 className="text-black text-[16px] font-medium mb-4">
                      Choose your pathway
                    </h2>
                    <div className="flex flex-col gap-3 w-full pb-2 mt-2">
                      {[
                        {
                          id: "A",
                          code: "2",
                          title: "Practice my German",
                        },
                        {
                          id: "B",
                          code: "3",
                          title: "Apply for a job",
                        },
                      ].map((opt) => {
                        const isSelected = preference === opt.code;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setPreference(opt.code)}
                            className={`w-full p-3 rounded-xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
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
                              {opt.id}
                            </div>
                            <span
                              className={`text-[14px] font-semibold transition-colors ${
                                isSelected ? "text-[#1E76F3]" : "text-[#111827]"
                              }`}
                            >
                              {opt.title}
                            </span>
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
                    onNext={handleB1B2PreferenceSubmit}
                    disabled={!preference || loading}
                    nextText="Finish Onboarding"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
