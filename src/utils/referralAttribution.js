import { Capacitor, registerPlugin } from "@capacitor/core";

// Referral attribution stash. Three writers feed the same localStorage keys:
//   1. /r/:code redirect page         -> "landing_link"
//   2. ?ref=CODE captured on app boot  -> "landing_link"
//   3. Play Install Referrer (native)  -> "install_referrer"
// Onboarding reads them once via getReferralAttribution() and clears them on
// success so a later unrelated signup cannot double-claim the reward.
const CODE_KEY = "referral_code";
const CLICK_ID_KEY = "referral_click_id";
const SOURCE_KEY = "referral_source";

const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

export const normalizeReferralCode = (raw) => {
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
};

export const storeReferralAttribution = ({ code, clickId, source }) => {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return false;
  try {
    localStorage.setItem(CODE_KEY, normalized);
    if (clickId !== undefined && clickId !== null && clickId !== "") {
      localStorage.setItem(CLICK_ID_KEY, String(clickId));
    }
    if (source) {
      localStorage.setItem(SOURCE_KEY, String(source));
    }
    return true;
  } catch {
    return false;
  }
};

export const getReferralAttribution = () => {
  try {
    const referralCode = normalizeReferralCode(localStorage.getItem(CODE_KEY));
    if (!referralCode) return {};
    const referralClickId = localStorage.getItem(CLICK_ID_KEY) || undefined;
    const referralSource = localStorage.getItem(SOURCE_KEY) || undefined;
    return { referralCode, referralClickId, referralSource };
  } catch {
    return {};
  }
};

export const clearReferralAttribution = () => {
  try {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(CLICK_ID_KEY);
    localStorage.removeItem(SOURCE_KEY);
  } catch {
    // storage unavailable — attribution simply won't be sent next time either
  }
};

// Captures ?ref=CODE (or ?referral=CODE) from any entry URL. Called once on
// app boot so shared web links onboard the friend with attribution intact.
export const captureReferralParamFromUrl = (search) => {
  try {
    const params = new URLSearchParams(search || "");
    const code = normalizeReferralCode(
      params.get("ref") || params.get("referral"),
    );
    if (!code) return false;
    return storeReferralAttribution({ code, source: "landing_link" });
  } catch {
    return false;
  }
};

const InstallReferrer = registerPlugin("InstallReferrer");

// Reads the Google Play install referrer once per install. The /r/:code page
// appends `referrer=ref_<CODE>` to the Play Store URL; Play hands that string
// back to the freshly installed app. Only meaningful on Play-delivered
// Android installs — silently no-ops elsewhere (adb installs included).
export const captureInstallReferrer = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false;
  }
  try {
    const { referrer } = await InstallReferrer.getReferrer();
    const raw = String(referrer || "");
    const match = raw.match(/ref_([A-Za-z0-9]{4,16})/i);
    if (!match) return false;
    return storeReferralAttribution({
      code: match[1],
      source: "install_referrer",
    });
  } catch {
    return false;
  }
};
