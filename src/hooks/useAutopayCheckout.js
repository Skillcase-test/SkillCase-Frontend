import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Checkout } from "capacitor-razorpay";
import toast from "react-hot-toast";
import api from "../api/axios";
import { setUser } from "../redux/auth/authSlice";
import { trackFeatureEvent } from "../telemetry/events";

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

// Shared UPI-only autopay checkout — used by PaywallBlocker,
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

  const openNativeCheckout = async ({ key, subscription_id, amount, checkoutPrefill, plan }) => {
    const options = {
      key,
      subscription_id,
      amount: String(amount),
      currency: "INR",
      name: "SkillCase Journey",
      // amount is server-driven — the checkout sheet just mirrors it.
      description: `Autopay Subscription - INR ${Math.round(amount / 100)}/month`,
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
        trackFeatureEvent("payments", "payment_verify_succeeded", {
          entityId: plan || "standard",
          attributes: { flow: "subscription" },
        });
        if (onSuccess) onSuccess();
      } else {
        trackFeatureEvent("payments", "payment_verify_failed", {
          entityId: plan || "standard",
          attributes: { flow: "subscription" },
        });
        toast.error(
          "Payment received — we are activating your plan. If it does not reflect in a few minutes, please contact support.",
        );
      }
    } catch (err) {
      const parsed = parseNativeCheckoutError(err);
      if (isUserCancellation(parsed)) {
        trackFeatureEvent("payments", "checkout_dismissed", {
          entityId: plan || "standard",
          attributes: { flow: "subscription" },
        });
      } else {
        trackFeatureEvent("payments", "checkout_failed", {
          entityId: plan || "standard",
          attributes: { flow: "subscription", code: parsed?.code ?? "native_error" },
        });
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

  // One Razorpay sheet, Promise-wrapped: resolves the payment response,
  // null on user dismiss/cancel, false on a hard failure. Works for
  // order_id and subscription_id.
  const openSheet = (options) =>
    new Promise((resolve) => {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Checkout")) {
        Checkout.open(options)
          .then((data) => {
            const resp =
              typeof data?.response === "string" ? JSON.parse(data.response) : data?.response;
            resolve(resp);
          })
          .catch((err) => {
            const parsed = parseNativeCheckoutError(err);
            if (!isUserCancellation(parsed)) {
              console.error("Native checkout failed:", err);
              toast.error(
                parsed?.description ||
                  "Payment could not be completed. If money was deducted it will be refunded automatically.",
              );
              return resolve(false);
            }
            resolve(null);
          });
        return;
      }
      loadRazorpayScript().then((ok) => {
        if (!ok) {
          toast.error("Failed to load payment gateway. Please check your internet connection.");
          return resolve(false);
        }
        const rzp = new window.Razorpay({
          ...options,
          handler: (resp) => resolve(resp),
          modal: { ondismiss: () => resolve(null) },
        });
        rzp.open();
      });
    });

  // Instant upgrade for fixed-amount (UPI) mandates: an immediate-start
  // subscription on the new plan bundles the mandate auth and first charge
  // into ONE collect — the unused remainder of the old plan is refunded
  // server-side, netting the fair prorated difference.
  const handleInstantUpgrade = async (plan) => {
    setLoading(true);
    try {
      const res = await api.post("/user/plan-upgrade-order", { plan });
      const orderKind = res.data?.alreadyOnPlan
        ? "already_on_plan"
        : res.data?.upgrade_processing
          ? "upgrade_processing"
          : res.data?.mandate_resume
            ? "mandate_resume"
            : "fresh";
      trackFeatureEvent("payments", "upgrade_order", {
        entityId: plan,
        attributes: { kind: orderKind, refund_estimate_paise: res.data?.refund_estimate_paise || 0 },
      });
      if (res.data?.alreadyOnPlan) {
        if (res.data.user) dispatch(setUser(res.data.user));
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }
      // The pending sub already captured the charge — reopening a sheet would
      // look like a second payment. The webhook promotes it; refetch the user.
      if (res.data?.upgrade_processing) {
        toast(res.data.msg || "Payment received — Plus is activating, give it a moment.");
        if (onSuccess) onSuccess({ processing: true });
        setLoading(false);
        return;
      }
      const { key, subscription_id, amount, refund_estimate_paise, prefill } = res.data;
      if (res.data?.mandate_resume) {
        toast(res.data.msg || "Finish your upgrade — one payment and Plus is live.");
      }
      let checkoutPrefill = buildCheckoutPrefill({ ...user, ...(prefill || {}) });

      if (!checkoutPrefill.contact) {
        try {
          const profileRes = await api.get("/user/profile");
          checkoutPrefill = buildCheckoutPrefill({
            ...user,
            ...(profileRes.data?.profile || {}),
            ...(prefill || {}),
          });
        } catch (profileErr) {
          console.error("Failed to load profile for checkout prefill:", profileErr);
        }
      }
      // No contact on file — don't dead-end: Razorpay's own sheet collects
      // the payer's number. Only prefill-lock when we actually have one.
      const contactLock = checkoutPrefill.contact
        ? { readonly: { contact: true, email: true, name: true }, hidden: { contact: true, email: true } }
        : {};

      trackFeatureEvent("payments", "checkout_opened", {
        entityId: plan,
        attributes: { flow: orderKind === "mandate_resume" ? "upgrade_resume" : "upgrade", amount_paise: amount },
      });
      const resp = await openSheet({
        key,
        subscription_id,
        amount: String(amount),
        currency: "INR",
        name: "SkillCase Journey",
        description: refund_estimate_paise
          ? `Plus upgrade — INR ${Math.round(amount / 100)} now, INR ${Math.round(refund_estimate_paise / 100)} back`
          : `Plus upgrade — INR ${Math.round(amount / 100)}/month`,
        image: "https://skillcase.co/images/logo.png",
        method: "upi",
        prefill: {
          name: checkoutPrefill.name,
          contact: checkoutPrefill.contact,
          email: checkoutPrefill.email,
        },
        ...contactLock,
        theme: { color: "#002856" },
      });
      if (!resp?.razorpay_payment_id) {
        // null = user backed out; false = the sheet itself failed to run.
        const dismissed = resp !== false;
        trackFeatureEvent("payments", dismissed ? "checkout_dismissed" : "checkout_failed", {
          entityId: plan,
          attributes: { flow: "upgrade", ...(dismissed ? {} : { code: "sheet_failed" }) },
        });
        setLoading(false);
        return;
      }

      // The charge is already captured at Razorpay by this point — a dropped
      // verify must not leave the money taken with no upgrade, so retry once.
      const verifyPayload = {
        razorpay_payment_id: resp.razorpay_payment_id,
        razorpay_subscription_id: resp.razorpay_subscription_id || subscription_id,
        razorpay_signature: resp.razorpay_signature,
      };
      let verifyRes;
      try {
        verifyRes = await api.post("/user/verify-plan-upgrade", verifyPayload);
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          verifyRes = await api.post("/user/verify-plan-upgrade", verifyPayload);
        } catch {
          // The charge already captured — this is a verify failure, not a
          // checkout failure. The webhook still promotes the upgrade.
          trackFeatureEvent("payments", "payment_verify_failed", {
            entityId: plan,
            attributes: { flow: "upgrade" },
          });
          toast("Payment received — Plus is activating, give it a moment.");
          setLoading(false);
          return;
        }
      }
      if (verifyRes.data?.user) dispatch(setUser(verifyRes.data.user));
      toast.success(verifyRes.data?.msg || "Plus is active!");
      trackFeatureEvent("payments", "payment_verify_succeeded", {
        entityId: plan,
        attributes: { flow: "upgrade", refunded_paise: verifyRes.data?.refunded_paise || 0 },
      });
      if (onSuccess) onSuccess(verifyRes.data);
    } catch (err) {
      // No live sub to upgrade (stale/abandoned state) — a fresh mandate is
      // the right path anyway, so just open the normal checkout.
      if (err?.response?.data?.code === "no_active_subscription") {
        setLoading(false);
        return handlePay(plan);
      }
      trackFeatureEvent("payments", "checkout_failed", {
        entityId: plan,
        attributes: { flow: "upgrade", code: err?.response?.data?.code || "unknown", status: err?.response?.status || 0 },
      });
      console.error("Instant upgrade failed:", err);
      toast.error(err.response?.data?.msg || "Couldn't complete the upgrade — please try again.");
    } finally {
      setLoading(false);
    }
  };

  // UPI-only by policy — every surface behaves identically. `plan` is the
  // catalog key ("standard" | "b2_plus"); omitted = standard, same as before.
  const handlePay = async (plan) => {
    setLoading(true);
    try {
      const response = await api.post("/user/create-subscription", plan ? { plan } : undefined);

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

      // No usable number on file — still open the sheet; Razorpay collects the
      // payer's contact itself. The readonly/hidden locks only apply when we
      // actually prefilled a verified number.
      const contactLock = checkoutPrefill.contact
        ? { readonly: { contact: true, email: true, name: true }, hidden: { contact: true, email: true } }
        : {};

      // Native checkout needs the plugin compiled into the APK — an OTA
      // update can't add it to older installs, which fall through to WebView.
      trackFeatureEvent("payments", "checkout_opened", {
        entityId: plan || "standard",
        attributes: { flow: "subscription", amount_paise: amount },
      });
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Checkout")) {
        await openNativeCheckout({ key, subscription_id, amount, checkoutPrefill, plan });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        trackFeatureEvent("payments", "checkout_failed", {
          entityId: plan || "standard",
          attributes: { flow: "subscription", code: "script_load_failed" },
        });
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
        description: `Autopay Subscription - INR ${Math.round(amount / 100)}/month`,
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
              trackFeatureEvent("payments", "payment_verify_succeeded", {
                entityId: plan || "standard",
                attributes: { flow: "subscription" },
              });
              if (onSuccess) onSuccess();
            } else {
              trackFeatureEvent("payments", "payment_verify_failed", {
                entityId: plan || "standard",
                attributes: { flow: "subscription" },
              });
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
        ...contactLock,
        theme: { color: "#002856" },
        modal: {
          ondismiss: function () {
            trackFeatureEvent("payments", "checkout_dismissed", {
              entityId: plan || "standard",
              attributes: { flow: "subscription" },
            });
            setLoading(false);
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      trackFeatureEvent("payments", "checkout_failed", {
        entityId: plan || "standard",
        attributes: { flow: "subscription", code: err?.response?.data?.code || "unknown", status: err?.response?.status || 0 },
      });
      console.error("Initiating subscription failed:", err);
      toast.error(
        err.response?.data?.msg || "Failed to start payment checkout session. Please try again.",
      );
      setLoading(false);
    }
  };

  return { loading, handlePay, handleInstantUpgrade };
}
