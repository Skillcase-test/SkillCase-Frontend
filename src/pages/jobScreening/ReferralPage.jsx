import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, MoreHorizontal } from "lucide-react";
import { FaWhatsapp, FaFacebookF, FaInstagram } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { getReferralDetails } from "../../api/jobScreeningApi";
import { trackFeatureEvent } from "../../telemetry/events";

const SHARE_MESSAGE =
  "I am getting fast-tracked for a job in Germany with Skillcase. Join with my link and start your own journey:";

const HOW_IT_WORKS = [
  {
    title: "Share your code or link",
    desc: "Send your invite link to friends on WhatsApp or social media.",
  },
  {
    title: "They join Skillcase",
    desc: "Your friend signs up and completes their onboarding.",
  },
  {
    title: "You skip the queue",
    desc: "Your interview review moves to the front automatically.",
  },
];

const ReferralPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getReferralDetails()
      .then(({ data }) => {
        if (!active) return;
        if (data?.success && data.data?.share_url) {
          setDetails(data.data);
        } else {
          setError("Referral link is unavailable right now.");
        }
      })
      .catch((err) => {
        if (!active) return;
        // 403 = not at review_pending anymore — nothing to refer with.
        if (err.response?.status === 403) {
          navigate("/job-screening", { replace: true });
          return;
        }
        setError(
          err.response?.data?.message || "Failed to load your referral link.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const shareUrl = details?.share_url || "";
  const referralCode = details?.code || "";
  const shareText = useMemo(() => `${SHARE_MESSAGE} ${shareUrl}`, [shareUrl]);

  const copyLink = async (source) => {
    const textToCopy = shareUrl || referralCode;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Referral link copied");
      trackFeatureEvent("job_screening", "referral_link_copied", {
        entityType: "referral",
        entityId: details?.code,
        lifecycle: "succeeded",
        attributes: { source },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback for webviews
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("Referral link copied");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy link");
      }
      document.body.removeChild(textarea);
    }
  };

  const trackShare = (channel) =>
    trackFeatureEvent("job_screening", "referral_shared", {
      entityType: "referral",
      entityId: details?.code,
      lifecycle: "succeeded",
      attributes: { channel },
    });

  const shareWhatsApp = () => {
    trackShare("whatsapp");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareFacebook = () => {
    trackShare("facebook");
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(SHARE_MESSAGE)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareInstagram = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join me on Skillcase",
          text: SHARE_MESSAGE,
          url: shareUrl,
        });
        trackShare("instagram");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    trackShare("instagram_fallback_copy");
    await copyLink("instagram_fallback");
    toast.success("Link copied — paste it in your Instagram story or DM");
  };

  const shareMore = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join me on Skillcase",
          text: SHARE_MESSAGE,
          url: shareUrl,
        });
        trackShare("more_native_share");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    trackShare("more_fallback_copy");
    await copyLink("more_fallback");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white w-full flex flex-col items-center pt-4 px-4 pb-24">
        <div className="w-full max-w-md flex flex-col gap-4 animate-pulse">
          <div className="h-8 w-32 bg-slate-100 rounded-lg" />
          <div className="h-36 w-full bg-slate-100 rounded-3xl" />
          <div className="h-24 w-full bg-slate-100 rounded-2xl" />
          <div className="h-28 w-full bg-slate-100 rounded-2xl" />
          <div className="h-44 w-full bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-white w-full flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800 mb-4">
            {error || "Referral link unavailable"}
          </p>
          <button
            onClick={() => navigate("/job-screening")}
            className="px-5 py-2.5 bg-[#002856] text-white rounded-lg text-sm font-bold active:scale-[0.99] transition-all cursor-pointer"
          >
            Back to Job Progress
          </button>
        </div>
      </div>
    );
  }

  const rewardApplied = Boolean(details.reward_applied);
  const stats = details.stats || { clicked: 0, completed: 0 };

  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center">
      {/* Pure White Header matching SupportWidget */}
      <div
        className="w-full bg-white flex justify-center px-4 shrink-0"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0.75rem",
        }}
      >
        <div className="w-full max-w-md flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/job-screening")}
            className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            aria-label="Back to Job Progress"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-[#002856]">Referral</h1>
        </div>
      </div>

      {/* Full-width top hero gradient area fading seamlessly into white */}
      <div className="w-full bg-gradient-to-b from-[#FEF0CA] via-[#FFF9ED] to-white flex justify-center px-4 pt-4 pb-8">
        <div className="w-full max-w-md flex items-start justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 flex-1"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              Refer &amp; skip queue
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-normal mt-2 leading-relaxed">
              Invite a friend to Skillcase. When they join, your interview
              review jumps straight to the front of the queue.
            </p>
            {rewardApplied && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 bg-green-100 text-[#15803d] text-[11px] font-bold px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                {stats.completed} friend
                {stats.completed === 1 ? "" : "s"} joined
              </p>
            )}
          </motion.div>
          <div className="shrink-0 pt-1">
            <img
              src="/rocket.webp"
              alt=""
              aria-hidden="true"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain -rotate-[17.5deg] select-none pointer-events-none drop-shadow-xs"
              draggable="false"
            />
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div
        className="w-full max-w-md flex flex-col gap-6 px-4"
        style={{
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="w-full bg-[#f8fafc] rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-2"
        >
          <span className="text-slate-400 text-xs sm:text-sm font-medium">
            Your referral code
          </span>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#002856] text-2xl sm:text-3xl font-bold tracking-widest font-mono">
              {referralCode || "SKILLCASE"}
            </span>
            <button
              type="button"
              onClick={() => copyLink("code_card")}
              className="w-10 h-10 rounded-xl bg-transparent hover:bg-slate-200/60 active:scale-95 text-[#002856] flex items-center justify-center transition-all cursor-pointer"
              aria-label="Copy referral code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600 stroke-[2.5]" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          {stats.clicked > 0 && (
            <p className="text-slate-400 text-[11px] font-medium mt-1">
              {stats.completed} joined
            </p>
          )}
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full flex flex-col gap-2.5"
        >
          <h2 className="text-slate-900 text-base font-semibold text-left">
            Share your link
          </h2>
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-4 gap-2">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs group-active:scale-95 transition-transform">
                <FaWhatsapp className="w-6 h-6" />
              </span>
              <span className="text-xs font-normal text-slate-700">
                WhatsApp
              </span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={shareFacebook}
              className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-active:scale-95 transition-transform">
                <FaFacebookF className="w-5 h-5" />
              </span>
              <span className="text-xs font-normal text-slate-700">
                Facebook
              </span>
            </button>

            {/* Instagram */}
            <button
              type="button"
              onClick={shareInstagram}
              className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center shadow-xs group-active:scale-95 transition-transform">
                <FaInstagram className="w-6 h-6" />
              </span>
              <span className="text-xs font-normal text-slate-700">
                Instagram
              </span>
            </button>

            {/* More */}
            <button
              type="button"
              onClick={shareMore}
              className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-white border border-slate-300 text-slate-700 flex items-center justify-center shadow-xs group-active:scale-95 transition-transform">
                <MoreHorizontal className="w-6 h-6" />
              </span>
              <span className="text-xs font-normal text-slate-700">More</span>
            </button>
          </div>
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full flex flex-col gap-2.5"
        >
          <h2 className="text-slate-900 text-base font-semibold text-left">
            How referral works
          </h2>
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.title} className="flex gap-3.5 items-stretch">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-[#002856] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {idx + 1}
                  </div>
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="w-0 flex-1 border-l-2 border-dotted border-slate-300 my-1.5" />
                  )}
                </div>
                <div
                  className={`text-left flex-1 min-w-0 ${
                    idx === HOW_IT_WORKS.length - 1 ? "pb-0" : "pb-5"
                  }`}
                >
                  <h3 className="text-slate-800 text-sm font-semibold leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReferralPage;
