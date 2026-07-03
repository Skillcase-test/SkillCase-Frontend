import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CreditCard, Phone } from "lucide-react";
import { setUser } from "../redux/auth/authSlice";
import api from "../api/axios";
import mayaSmiling from "../assets/onboarding/mayaSmiling.webp";

export default function PaywallBlocker({ user, dispatch, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert(
          "Failed to load payment gateway. Please check your internet connection.",
        );
        setLoading(false);
        return;
      }
      const response = await api.post("/user/create-subscription");
      const { key, subscription_id } = response.data;
      const rawPhone = user.number || user.phone || user.username || "";
      const cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");
      const cleanContact = cleanPhone.slice(-10);

      const options = {
        key,
        subscription_id,
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
            alert("Payment verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.fullname || user.username || "Student",
          contact: cleanContact,
          email: user.email || `${cleanContact || "student"}@example.com`,
        },
        readonly: {
          contact: true,
          email: true,
          name: true,
        },
        theme: {
          color: "#002856",
        },
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
      alert(
        err.response?.data?.msg ||
          "Failed to start payment checkout session. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-xs select-none font-sans"
      style={{
        background:
          "radial-gradient(circle, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.95) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{
          y: -2,
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
        }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 flex flex-col items-center text-center gap-6"
      >
        {/* Mascot and Chat Bubble (Horizontal Chat Layout) */}
        <div className="flex items-center gap-4 w-full text-left">
          <img
            src={mayaSmiling}
            alt="Maya mascot smiling"
            className="w-16 h-16 object-contain shrink-0"
          />
          <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-700 text-xs font-semibold leading-relaxed shadow-xs flex-1">
            {/* Left triangle pointer pointing to mascot */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4.5 h-4.5 bg-slate-50 border-b border-l border-slate-100/80 rotate-45" />
            Your learning path is locked. Please enable subscription to continue
            the journey.
          </div>
        </div>
        {/* Program Details */}
        <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left flex flex-col gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Recurring Subscription Plan
          </span>
          <div className="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">
              Subscription Fee
            </span>
            <span className="text-2xl font-black text-[#002856] flex items-baseline">
              <span className="text-lg font-bold mr-0.5">₹</span>99
              <span className="text-[11px] text-slate-400 font-bold ml-1">
                / month
              </span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed px-1">
            Unlocks unlimited access to German level lessons, streak challenges,
            flashcards, pronunciation practice, and more. Cancel anytime.
          </p>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <motion.button
            onClick={handlePay}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            className="w-full h-12 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer flex items-center justify-between px-5 font-bold"
          >
            {loading ? (
              <div className="w-full flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="text-sm font-bold">Processing...</span>
              </div>
            ) : (
              <>
                <span className="text-sm font-extrabold tracking-wide">
                  ₹99 / month
                </span>
                <span className="text-sm font-extrabold flex items-center gap-1.5">
                  Subscribe Now
                  <CreditCard className="w-4 h-4" />
                </span>
              </>
            )}
          </motion.button>
          <motion.a
            href="tel:+919731462667"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-slate-600 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Call Skillcase support at +919731462667</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}
