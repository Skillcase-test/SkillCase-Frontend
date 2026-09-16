import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { getReferralLanding, trackReferralClick } from "../../api/referralApi";
import { storeReferralAttribution } from "../../utils/referralAttribution";

const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

// Thin smart-redirect behind learner.skillcase.in/r/CODE share links:
//   1. Log the click + stash the code locally (covers same-browser web signup)
//   2. Native app already installed -> onboard inside the app
//   3. Android browser -> Play Store with referrer=ref_CODE (Play Install
//      Referrer hands it back to the freshly installed app)
//   4. iOS / desktop -> web onboarding with ?ref=CODE
// Click tracking must never delay or block the redirect.
const ReferralRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [invalid, setInvalid] = useState(false);

  const redirectAndroid = useCallback((referralCode) => {
    const referrer = encodeURIComponent(`ref_${referralCode}`);
    window.location.replace(`${PLAY_STORE_WEB_URL}&referrer=${referrer}`);
  }, []);

  useEffect(() => {
    const referralCode = String(code || "")
      .trim()
      .toUpperCase();
    if (!referralCode) {
      setInvalid(true);
      return;
    }

    // Validate + log the click in parallel; neither is allowed to block the
    // redirect. The click row carries the id we may later bind at onboarding.
    const clickPromise = trackReferralClick(referralCode).catch(() => null);
    const landingPromise = getReferralLanding(referralCode).catch(() => null);

    (async () => {
      const [clickRes, landingRes] = await Promise.all([
        clickPromise,
        landingPromise,
      ]);

      const landingOk = landingRes?.data?.success === true;
      if (landingRes && !landingOk) {
        setInvalid(true);
        return;
      }

      const clickId = clickRes?.data?.data?.click_id;
      storeReferralAttribution({
        code: referralCode,
        clickId,
        source: "landing_link",
      });

      if (Capacitor.isNativePlatform()) {
        navigate("/onboarding", { replace: true });
        return;
      }

      const isAndroid = /android/i.test(navigator.userAgent || "");
      if (isAndroid) {
        redirectAndroid(referralCode);
      } else {
        navigate(`/?ref=${encodeURIComponent(referralCode)}`, {
          replace: true,
        });
      }
    })();
  }, [code, navigate, redirectAndroid]);

  const referralCode = String(code || "").toUpperCase();

  return (
    <div className="min-h-screen bg-[#001836] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="size-12 border-4 border-[#F9C53D] border-t-transparent rounded-full animate-spin mb-6" />
      {invalid ? (
        <>
          <h1 className="text-xl font-bold mb-2">Opening Skillcase...</h1>
          <p className="text-sm text-slate-400 max-w-xs mb-8">
            This invite link looks unusual — no problem, you can still join.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold mb-2">Opening Skillcase...</h1>
          <p className="text-sm text-slate-400 max-w-xs mb-8">
            Taking you to the app. If nothing happens, tap the button below.
          </p>
        </>
      )}
      <button
        type="button"
        onClick={() =>
          /android/i.test(navigator.userAgent || "")
            ? redirectAndroid(referralCode || "DIRECT")
            : navigate("/", { replace: true })
        }
        className="bg-[#F9C53D] hover:bg-[#e0b02f] text-[#002856] font-extrabold py-3.5 px-8 rounded-2xl text-sm shadow-xl active:scale-95 transition-all duration-150 cursor-pointer"
      >
        Open Skillcase
      </button>
    </div>
  );
};

export default ReferralRedirect;
