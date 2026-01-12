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
import customI18n from "./constants/countryNames";

import "./auth.css";

const LoginPage = () => {
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

  // Form state
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState(""); // Store phone when OTP sent
  const [countryCode, setCountryCode] = useState("+91");

  // OTP state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(90);
  const [canResend, setCanResend] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize intl-tel-input
  useEffect(() => {
    if (phoneInputRef.current && !itiRef.current) {
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
      if (itiRef.current) {
        itiRef.current.destroy();
        itiRef.current = null;
      }
    };
  }, []);

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
    // Remove non-digits and limit to 15 characters (to allow intl-tel-input to work)
    const value = e.target.value.replace(/\D/g, "");
    setPhone(value);
    setError("");
  };

  // Get the actual phone number from the input
  const getPhoneNumber = () => {
    if (phoneInputRef.current) {
      return phoneInputRef.current.value.replace(/\D/g, "");
    }
    return phone;
  };

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
      const response = await api.post("/auth/login/send-otp", { phone: phoneNumber });

      if (response.data.status === "sendotp") {
        setShowOtp(true);
        setTimer(90);
        setCanResend(false);
        toast.success("OTP sent to your phone!");
        // Make phone readonly
        if (phoneInputRef.current) {
          phoneInputRef.current.setAttribute("readonly", true);
        }
      } else if (response.data.status === "not_found") {
        setError("No record found! Please Signup");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to send OTP";
      setError(message);
      if (err.response?.data?.status === "not_found") {
        toast.error("Please signup first", { icon: "ℹ️" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError("Please enter complete OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login/verify-otp", {
        phone: savedPhone,
        otp,
        timer,
      });
      if (response.data.status === "success") {
        dispatch(
          loginSuccess({ token: response.data.token, user: response.data.user })
        );
        toast.success("Login successful!");
        navigate("/");
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

  return (
    <div className="auth-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="msf-container">
        {/* Title - Centered for Login */}
        <div className="msf-title center">Login</div>
        <div className="msf-subtitle">
          Let us help you find the right healthcare opportunity abroad — faster, smoother, and at zero recruitment cost.
        </div>

        <form onSubmit={handleSendOtp}>
          {/* Phone Input with intl-tel-input */}
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
              {loading ? "Verifying..." : "Login"}
            </button>
          )}
        </form>

        {/* Footer */}
        <div className="buttonoptions" style={{ marginTop: '24px' }}>
          <div className="msf-footer-text">
            Dont have account ? <Link to="/signup">Signup</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
