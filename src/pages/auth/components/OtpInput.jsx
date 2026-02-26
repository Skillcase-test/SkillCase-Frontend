import { useRef, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Extracts first 6-digit sequence from SMS text
function extractOtp(smsText) {
  const match = smsText?.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

// Custom native Capacitor plugin (SmsPlugin.java in android project)
const SmsPlugin = registerPlugin("SmsPlugin");

// 6-digit OTP Input Component
// onAutoFill(code) — called when OTP is auto-read so parent can auto-submit
const OtpInput = ({ value, onChange, disabled = false, onAutoFill }) => {
  const inputRefs = useRef([]);

  // Web OTP API (Chrome on Android — browser only)
  useEffect(() => {
    if (!("OTPCredential" in window) || Capacitor.isNativePlatform()) return;

    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((credential) => {
        const code = credential.code;
        onChange(code);
        if (onAutoFill) onAutoFill(code);
      })
      .catch(() => {});

    return () => ac.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Native SMS User Consent API
  // Uses SmsPlugin.java
  // Shows Google's native "Allow SkillCase to read this message?" dialog.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;

    const init = async () => {
      try {
        // Register listener BEFORE starting the consent watcher
        listenerHandle = await SmsPlugin.addListener("smsReceived", (data) => {
          const code = extractOtp(data?.message || "");
          if (code) {
            onChange(code);
            if (onAutoFill) onAutoFill(code);
          }
        });

        // Start watching for incoming OTP SMS
        await SmsPlugin.startSmsUserConsent();
      } catch (_) {
        // Plugin not available on this platform — silently skip
      }
    };

    init();
    return () => {
      listenerHandle?.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (val.length > 1) return;
    if (val && !/^\d$/.test(val)) return;

    const newOtp = value.split("");
    newOtp[index] = val;
    onChange(newOtp.join(""));

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData.length > 0) {
      onChange(pastedData.padEnd(6, "").slice(0, 6));
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="otp-container">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="otp-input"
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="0"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OtpInput;
