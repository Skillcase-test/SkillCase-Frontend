import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  MessageCircle,
  Instagram,
  Facebook,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { getReferralDetails } from "../../api/jobScreeningApi";
import { trackFeatureEvent } from "../../telemetry/events";

const SHARE_MESSAGE =
  "I'm getting fast-tracked for a job in Germany with Skillcase 🚀 Join with my link and start your own journey:";

const HOW_IT_WORKS = [
  {
    title: "Share your link",
    desc: "Send it to friends on WhatsApp, Instagram, or Facebook.",
  },
  {
    title: "They join Skillcase",
    desc: "Your friend installs the app and completes onboarding.",
  },
  {
    title: "You skip the queue",
    desc: "Your interview review moves to the front — automatically.",
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
          err.response?.data?.message ||
            "Failed to load your referral link.",
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
  const shareText = useMemo(
    () => `${SHARE_MESSAGE} ${shareUrl}`,
    [shareUrl],
  );

  const copyLink = async (source) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      trackFeatureEvent("job_screening", "referral_link_copied", {
        entityType: "referral",
        entityId: details?.code,
        lifecycle: "succeeded",
        attributes: { source },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable in insecure webview contexts.
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Couldn't copy — long-press the link instead");
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

  // Instagram has no reliable web share endpoint — use the native share
  // sheet (which lists Instagram on the device) and fall back to copy.
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
        if (err?.name === "AbortError") return; // user dismissed the sheet
      }
    }
    trackShare("instagram_fallback_copy");
    await copyLink("instagram_fallback");
    toast.success("Link copied — paste it in your Instagram story or DM");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] w-full flex flex-col items-center pt-4 px-4 pb-24">
        <div className="w-full max-w-md flex flex-col gap-4 animate-pulse">
          <div className="h-6 w-32 bg-white/70 rounded-lg" />
          <div className="h-40 w-full bg-white/70 rounded-2xl" />
          <div className="h-20 w-full bg-white/70 rounded-2xl" />
          <div className="h-32 w-full bg-white/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] w-full flex items-center justify-center px-4">
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
    <div
      className="min-h-screen bg-linear-to-b from-[#e0f2fe] to-[#dbeafe] w-full flex flex-col items-center px-4"
      style={{
        paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => navigate("/job-screening")}
            className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-slate-400 text-sm font-semibold">Referral</span>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200/70 rounded-3xl shadow-sm p-5 flex items-center gap-4 overflow-hidden"
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-[#002856] text-xl font-bold tracking-tight leading-tight">
              Refer &amp; skip the queue
            </h1>
            <p className="text-amber-900/80 text-xs sm:text-sm font-medium mt-2 leading-relaxed">
              Invite a friend to Skillcase. When they join, your interview
              review jumps straight to the front of the queue.
            </p>
            {rewardApplied && (
              <p className="mt-2 inline-flex items-center gap-1.5 bg-green-100 text-[#15803d] text-[11px] font-bold px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Fast-forwarded — {stats.completed} friend
                {stats.completed === 1 ? "" : "s"} joined
              </p>
            )}
          </div>
          <img
            src="/rocket.webp"
            alt=""
            aria-hidden="true"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0 -rotate-[17deg] select-none"
            draggable="false"
          />
        </motion.div>

        {/* Link card — copy first, per design */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Your referral link
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[#002856] text-xs font-semibold truncate select-all">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={() => copyLink("link_card")}
              className="shrink-0 h-10 w-10 rounded-xl bg-[#002856] text-white flex items-center justify-center hover:bg-[#001f42] active:scale-95 transition-all cursor-pointer"
              aria-label="Copy referral link"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          {stats.clicked > 0 && (
            <p className="text-slate-400 text-[10px] font-medium mt-2">
              {stats.clicked} click{stats.clicked === 1 ? "" : "s"} ·{" "}
              {stats.completed} joined
            </p>
          )}
        </motion.div>

        {/* Share destinations — exactly WhatsApp / Instagram / Facebook */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider text-center">
            Share via
          </p>
          <div className="mt-3 flex items-start justify-center gap-6">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-[#25D366]/15 text-[#128C4B] flex items-center justify-center group-active:scale-95 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                WhatsApp
              </span>
            </button>
            <button
              type="button"
              onClick={shareInstagram}
              className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center group-active:scale-95 transition-transform">
                <Instagram className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                Instagram
              </span>
            </button>
            <button
              type="button"
              onClick={shareFacebook}
              className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 group"
            >
              <span className="w-12 h-12 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center group-active:scale-95 transition-transform">
                <Facebook className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                Facebook
              </span>
            </button>
          </div>
        </motion.div>

        {/* How it works — three numbered steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <h2 className="text-[#002856] text-sm font-bold">
            How referral works
          </h2>
          <div className="mt-3 flex flex-col">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.title} className="flex gap-3.5 items-stretch">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-[#002856] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                    {idx + 1}
                  </div>
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="w-[1.5px] bg-[#002856]/15 flex-1 my-1" />
                  )}
                </div>
                <div className="pb-4 text-left flex-1 min-w-0">
                  <h4 className="text-slate-800 text-sm font-semibold leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-normal">
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
