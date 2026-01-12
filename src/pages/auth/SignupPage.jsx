import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import intlTelInput from "intl-tel-input";
import "intl-tel-input/build/css/intlTelInput.css";

import toast from "react-hot-toast";

import { loginSuccess } from "../../redux/auth/authSlice";

import api from "../../api/axios";
import { hapticMedium } from "../../utils/haptics";

import OtpInput from "./components/OtpInput";
import CustomDropdown from "./components/CustomDropdown";
import {
  QUALIFICATION_OPTIONS,
  LANGUAGE_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "./constants/dropdownOptions";
import customI18n from "./constants/countryNames";

import "./auth.css";

const SignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const phoneInputRef = useRef(null);
  const itiRef = useRef(null);

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Signup step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Phone state
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState(""); // Store phone when OTP sent
  const [countryCode, setCountryCode] = useState("+91");

  // Personal details form state
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    qualification: "",
    language_level: "",
    experience: "",
  });

  // OTP state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(90);
  const [canResend, setCanResend] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Initialize intl-tel-input
  useEffect(() => {
    if (phoneInputRef.current && !itiRef.current && currentStep === 1) {
      itiRef.current = intlTelInput(phoneInputRef.current, {
        initialCountry: "in",
        countryOrder: ["in", "de"],
        separateDialCode: true,
        useFullscreenPopup: false,
        countrySearch: false,
        i18n: customI18n,
      });

      phoneInputRef.current.addEventListener("countrychange", () => {
        const data = itiRef.current.getSelectedCountryData();
        setCountryCode("+" + data.dialCode);
      });
    }

    return () => {
      if (itiRef.current && currentStep !== 1) {
        itiRef.current.destroy();
        itiRef.current = null;
      }
    };
  }, [currentStep]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (showOtp && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtp, timer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePhoneChange = (e) => {
    // Remove non-digits
    const value = e.target.value.replace(/\D/g, "");
    setPhone(value);
    setError("");
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  // Get phone number from input field
  const getPhoneNumber = () => {
    if (phoneInputRef.current) {
      return phoneInputRef.current.value.replace(/\D/g, "");
    }
    return phone;
  };

  // Send OTP to user's phone number
  const handleSendOtp = async (e) => {
    e.preventDefault();

    const phoneNumber = getPhoneNumber();
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setSavedPhone(phoneNumber);
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/signup/send-otp", {
        phone: phoneNumber,
        countrycode: countryCode,
      });

      if (response.data.status === "sendotp") {
        setShowOtp(true);
        setTimer(90);
        setCanResend(false);
        toast.success("OTP sent to your phone!");
        // Prevent phone number changes during verification
        if (phoneInputRef.current) {
          phoneInputRef.current.setAttribute("readonly", true);
        }
      } else if (response.data.status === "already") {
        setError("Candidate already exist! Please login");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and proceed to personal details
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/signup/verify-otp", {
        phone: savedPhone,
        otp,
      });

      if (response.data.status === "success") {
        // Proceed to personal details form
        setCurrentStep(2);
        setError("");
      } else if (response.data.status === "expired") {
        setError("OTP expired. Please request again.");
        setCanResend(true);
      } else if (response.data.status === "incorrect") {
        setError("OTP incorrect please check");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setLoading(true);

    try {
      await api.post("/auth/resend-otp", { phone: savedPhone });
      setTimer(90);
      setCanResend(false);
      setOtp("");
      toast.success("OTP resent!");
    } catch (err) {
      toast.error("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Validate personal details form
  const validateStep2 = () => {
    const errors = {};
    let valid = true;

    if (!formData.fullname.trim()) {
      errors.fullname = "Full name is required";
      valid = false;
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
      valid = false;
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        errors.email = "Email format incorrect";
        valid = false;
      }
    }

    if (!formData.qualification) {
      errors.qualification = "This field is required.";
      valid = false;
    }

    if (!formData.language_level) {
      errors.language_level = "This field is required.";
      valid = false;
    }

    if (!formData.experience) {
      errors.experience = "This field is required.";
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  // Complete signup with personal details
  const handleStep2Submit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/signup/complete", {
        phone: savedPhone,
        countrycode: countryCode,
        fullname: formData.fullname,
        email: formData.email,
        qualification: formData.qualification,
        language_level: formData.language_level,
        experience: formData.experience,
      });

      if (response.data.status === "success") {
        dispatch(
          loginSuccess({ token: response.data.token, user: response.data.user })
        );
        toast.success("Signup successful!");
        navigate("/");
      } else if (response.data.status === "emailalready") {
        setError("Email already registered");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Return to phone verification
  const handleBack = () => {
    setCurrentStep(1);
    setShowOtp(false);
    setOtp("");
    setTimer(90);
    setCanResend(false);
    setError("");
    // Reset phone readonly
    if (phoneInputRef.current) {
      phoneInputRef.current.removeAttribute("readonly");
    }
  };

  return (
    <div className="auth-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="msf-container">
        {/* STEP 1 - Phone + OTP */}
        {currentStep === 1 && (
          <div id="msf-step1">
            {/* Progress Bar */}
            <div className="msf-progress">
              <div className="msf-step active"></div>
              <div className="msf-step"></div>
            </div>

            <div className="msf-title">Register to get started</div>
            <div className="msf-subtitle">
              Let us help you find the right healthcare opportunity abroad — faster, smoother, and at zero recruitment cost.
            </div>

            <form onSubmit={handleSendOtp}>
              {/* Phone Input */}
              <div className="form-group">
                <label className="formlabels">Phone Number *</label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  className="msf-input"
                  placeholder="Enter your number"
                  value={(loading || showOtp) && savedPhone ? savedPhone : phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  disabled={showOtp}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* OTP Section */}
              {showOtp && (
                <>
                  <div className="form-group">
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                  </div>

                  {/* Resend Timer */}
                  <div className="resendcontainer">
                    {timer > 0 ? (
                      <>
                        <span className="resend-link disabled">Resend OTP in</span>
                        <span className="timer">&nbsp;{formatTimer(timer)}</span>
                      </>
                    ) : (
                      <span className="resend-link" onClick={handleResendOtp}>
                        Resend
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && <p className="otperror">{error}</p>}

              {/* Buttons */}
              {!showOtp ? (
                <button
                  type="submit"
                  className="msf-btn-primary"
                  disabled={loading}
                  onClick={hapticMedium}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              ) : (
                <button
                  type="button"
                  className="msf-btn-primary"
                  onClick={() => { hapticMedium(); handleVerifyOtp(); }}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? "Verifying..." : "Sign Up"}
                </button>
              )}
            </form>

            {/* Divider */}
            <div className="msf-divider">
              <span>or</span>
            </div>

            {/* Footer */}
            <div className="buttonoptions">
              <div className="msf-footer-text">
                Already have an account? <Link to="/login">Login</Link>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 - Personal Details */}
        {currentStep === 2 && (
          <div id="msf-step2">
            {/* Progress Bar - Both Active */}
            <div className="msf-progress">
              <div className="msf-step active"></div>
              <div className="msf-step active"></div>
            </div>

            <div className="msf-title">Tell us about yourself</div>
            <div className="msf-subtitle">
              Let us help you find the right healthcare opportunity abroad — faster, smoother, and at zero recruitment cost.
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="formlabels">Fullname *</label>
              <input
                type="text"
                className={`msf-input ${fieldErrors.fullname ? 'invalid-input' : ''}`}
                name="fullname"
                placeholder="Full Name *"
                value={formData.fullname}
                onChange={(e) => handleChange("fullname", e.target.value)}
                required
              />
              {fieldErrors.fullname && <div className="error-message">{fieldErrors.fullname}</div>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="formlabels">Email *</label>
              <input
                type="email"
                className={`msf-input ${fieldErrors.email ? 'invalid-input' : ''}`}
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
              {fieldErrors.email && <div className="error-message">{fieldErrors.email}</div>}
            </div>

            {/* Qualification Dropdown */}
            <div className="form-group">
              <label className="formlabels">Educational Qualification *</label>
              <CustomDropdown
                options={QUALIFICATION_OPTIONS}
                value={formData.qualification}
                onChange={(value) => handleChange("qualification", value)}
                placeholder="Select Qualification"
                name="qualification"
                error={!!fieldErrors.qualification}
              />
              {fieldErrors.qualification && <div className="error-message">{fieldErrors.qualification}</div>}
            </div>

            {/* Language Dropdown */}
            <div className="form-group">
              <label className="formlabels">German Language Proficiency *</label>
              <CustomDropdown
                options={LANGUAGE_OPTIONS}
                value={formData.language_level}
                onChange={(value) => handleChange("language_level", value)}
                placeholder="Select Language"
                name="language"
                error={!!fieldErrors.language_level}
              />
              {fieldErrors.language_level && <div className="error-message">{fieldErrors.language_level}</div>}
            </div>

            {/* Experience Dropdown */}
            <div className="form-group">
              <label className="formlabels">Work Experience *</label>
              <CustomDropdown
                options={EXPERIENCE_OPTIONS}
                value={formData.experience}
                onChange={(value) => handleChange("experience", value)}
                placeholder="Select Experience"
                name="experience"
                error={!!fieldErrors.experience}
              />
              {fieldErrors.experience && <div className="error-message">{fieldErrors.experience}</div>}
            </div>

            {/* Error Message */}
            {error && <p className="otperror">{error}</p>}

            {/* Buttons */}
            <div className="buttonoptions">
              <button
                type="button"
                className="msf-btn-primary"
                onClick={handleStep2Submit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Continue"}
              </button>
              <button
                type="button"
                className="msf-btn-outline"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupPage;
