import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Checkout } from "capacitor-razorpay";
import toast from "react-hot-toast";
import api from "../api/axios";
import { setUser } from "../redux/auth/authSlice";

const normalizeIndianPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  const last10 = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last10) ? last10 : "";
};

const buildCheckoutPrefill = (source = {}) => {
  const contact = normalizeIndianPhone(
    source.contact || source.phone || source.number || source.phone_number || source.username,
  );
  const email =
    String(source.email || "").trim() || (contact ? `student-${contact}@skillcase.in` : "");

  return {
    name: source.name || source.fullname || source.username || "SkillCase Student",
    contact,
    email,
  };
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// The native plugin rejects with the Razorpay error JSON stringified into
// message/code — dig out the {code, description} object from wherever it landed.
function parseNativeCheckoutError(err) {
  for (const candidate of [err?.message, err?.code, err?.error, err]) {
    try {
      const parsed = typeof candidate === "string" ? JSON.parse(candidate) : candidate;
      if (parsed && typeof parsed === "object") {
        return parsed.error && typeof parsed.error === "object" ? parsed.error : parsed;
      }
    } catch {
      // not JSON — try the next candidate
    }
  }
  return null;
}

// Razorpay Android SDK error code 2 = PAYMENT_CANCELLED (user backed out of
// the sheet or the UPI app). Not an error worth a toast.
function isUserCancellation(parsedError) {
  return (
    parsedError?.code === 2 ||
    /cancel/i.test(String(parsedError?.description || parsedError?.reason || ""))
  );
}

// Shared ₹99/month UPI-only autopay checkout — used by PaywallBlocker,
// UsageLimitModal and the upgrade page. On native builds with the
// capacitor-razorpay plugin we open Razorpay's Android checkout on the UPI
// pane; on web / OTA-updated older APKs we fall back to checkout.js.
export function useAutopayCheckout({ user, dispatch, onSuccess }) {
  const [loading, setLoading] = useState(false);

  // On verify failure, re-fetch the user once — the subscription webhook may
  // already have activated the account (e.g. process killed inside the UPI
  // app), which counts as success rather than a failed-payment toast.
  const verifyPayment = async ({ razorpay_payment_id, subscription_id, razorpay_signature }) => {
    try {
      const verifyRes = await api.post("/user/verify-subscription", {
        razorpay_payment_id,
        subscription_id,
        razorpay_signature,
      });
      dispatch(setUser(verifyRes.data.user));
      return true;
    } catch (err) {
      console.error("verify-subscription failed; re-checking account state:", err);
      try {
        const me = await api.post("/user/me", null, {
          meta: { skipPaywallRefresh: true },
        });
        if (me.data?.user) dispatch(setUser(me.data.user));
        return !!me.data?.user?.autopay_enabled;
      } catch {
        return false;
      }
    }
  };

  const openNativeCheckout = async ({ key, subscription_id, amount, checkoutPrefill }) => {
    const options = {
      key,
      subscription_id,
      amount: String(amount),
      currency: "INR",
      name: "SkillCase Journey",
      description: "Autopay Subscription - INR 99/month",
      image: "https://skillcase.co/images/logo.png",
      method: "upi",
      prefill: {
        name: checkoutPrefill.name,
        contact: checkoutPrefill.contact,
        email: checkoutPrefill.email,
      },
      theme: { color: "#002856" },
    };
    try {
      const data = await Checkout.open(options);
      // paymentData.getData() usually arrives as a JS object but may be a
      // JSON string depending on plugin version.
      const resp =
        typeof data?.response === "string" ? JSON.parse(data.response) : data?.response;
      const verified = await verifyPayment({
        razorpay_payment_id: resp?.razorpay_payment_id,
        subscription_id: resp?.razorpay_subscription_id || subscription_id,
        razorpay_signature: resp?.razorpay_signature,
      });
      if (verified) {
        if (onSuccess) onSuccess();
      } else {
        toast.error(
          "Payment received — we are activating your plan. If it does not reflect in a few minutes, please contact support.",
        );
      }
    } catch (err) {
      const parsed = parseNativeCheckoutError(err);
      if (isUserCancellation(parsed)) {
        // user backed out — just reset
      } else {
        console.error("Native checkout failed:", err);
        toast.error(
          parsed?.description ||
            "Payment could not be completed. If money was deducted it will be refunded automatically.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // UPI-only by policy — every surface behaves identically.
  const handlePay = async () => {
    setLoading(true);
    try {
      const response = await api.post("/user/create-subscription");

      // Account already premium server-side (stale frontend state) — refresh
      // the redux user and bail instead of opening a broken checkout.
      if (response.data?.alreadyActive) {
        if (response.data.user) dispatch(setUser(response.data.user));
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }

      const { key, subscription_id, amount } = response.data;
      let checkoutPrefill = buildCheckoutPrefill({ ...user, ...(response.data?.prefill || {}) });

      if (!checkoutPrefill.contact) {
        try {
          const profileRes = await api.get("/user/profile");
          checkoutPrefill = buildCheckoutPrefill({
            ...user,
            ...(profileRes.data?.profile || {}),
            ...(response.data?.prefill || {}),
          });
        } catch (profileErr) {
          console.error("Failed to load profile for checkout prefill:", profileErr);
        }
      }

      if (!checkoutPrefill.contact) {
        toast.error(
          "We could not find a valid Indian mobile number for autopay. Please contact Skillcase support.",
        );
        setLoading(false);
        return;
      }

      // Native checkout needs the plugin compiled into the APK — an OTA
      // update can't add it to older installs, which fall through to WebView.
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Checkout")) {
        await openNativeCheckout({ key, subscription_id, amount, checkoutPrefill });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway. Please check your internet connection.");
        setLoading(false);
        return;
      }

      const options = {
        key,
        subscription_id,
        webview_intent: Capacitor.getPlatform() === "android",
        method: "upi",
        name: "SkillCase Journey",
        description: "Autopay Subscription - INR 99/month",
        image: "https://skillcase.co/images/logo.png",
        handler: async function (paymentResponse) {
          setLoading(true);
          try {
            const verified = await verifyPayment({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              subscription_id: paymentResponse.razorpay_subscription_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            if (verified) {
              if (onSuccess) onSuccess();
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: checkoutPrefill.name,
          contact: checkoutPrefill.contact,
          email: checkoutPrefill.email,
        },
        readonly: { contact: true, email: true, name: true },
        hidden: { contact: true, email: true },
        theme: { color: "#002856" },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Initiating subscription failed:", err);
      toast.error(
        err.response?.data?.msg || "Failed to start payment checkout session. Please try again.",
      );
      setLoading(false);
    }
  };

  return { loading, handlePay };
}
