import { useState } from "react";
import { Capacitor } from "@capacitor/core";
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

// Shared ₹99/month autopay subscription checkout — used by the blanket
// paywall (PaywallBlocker) and the per-module usage-limit modal. One copy
// of this money-path logic so the two surfaces can never drift apart.
export function useAutopayCheckout({ user, dispatch, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway. Please check your internet connection.");
        setLoading(false);
        return;
      }
      const response = await api.post("/user/create-subscription");
      const { key, subscription_id } = response.data;
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

      const options = {
        key,
        subscription_id,
        webview_intent: Capacitor.getPlatform() === "android",
        name: "SkillCase Journey",
        description: "Autopay Subscription - INR 99/month",
        image: "https://skillcase.co/images/logo.png",
        handler: async function (paymentResponse) {
          setLoading(true);
          try {
            const verifyRes = await api.post("/user/verify-subscription", {
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              subscription_id: paymentResponse.razorpay_subscription_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            dispatch(setUser(verifyRes.data.user));
            if (onSuccess) onSuccess();
          } catch (err) {
            console.error("Signature verification failed:", err);
            toast.error("Payment verification failed. Please contact support.");
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
