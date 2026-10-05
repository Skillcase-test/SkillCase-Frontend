import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import ModalPortal from "../common/ModalPortal";
import { PositionedPromoAd } from "./PromoAdCard";
import { SURFACE_BY_PATH } from "./promoAdConfig";
import { getEligibleAds, trackAdEvent } from "../../api/promoAdApi";
import { trackFeatureEvent } from "../../telemetry/events";

// Ads already shown this session — rotates to the next unseen one per entry.
const session = { userId: null, shown: new Set() };

const SHOW_DELAY_MS = 700;

const runCta = (ad, navigate) => {
  const target = String(ad.cta_target || "").trim();
  if (!target) return;
  if (ad.cta_type === "route") {
    if (target.startsWith("/")) navigate(target);
    return;
  }
  if (ad.cta_type === "call") {
    window.location.href = `tel:${target.replace(/[^\d+]/g, "")}`;
    return;
  }
  const url =
    ad.cta_type === "whatsapp"
      ? `https://wa.me/${target.replace(/[^\d]/g, "")}`
      : target;
  if (Capacitor.isNativePlatform()) {
    CapApp.openUrl({ url }).catch(() => window.open(url, "_blank"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// One closable ad per hub-screen entry — the server resolves targeting,
// schedule and frequency; the host picks the first ad not shown this session.
export default function PromoAdsHost({ blocked = false }) {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const surface = SURFACE_BY_PATH[location.pathname];
  const [activeAd, setActiveAd] = useState(null);
  const fetchSeq = useRef(0);

  useEffect(() => {
    setActiveAd(null);
    if (!surface || !user?.user_id || blocked) return;
    if (session.userId !== user.user_id) {
      session.userId = user.user_id;
      session.shown.clear();
    }
    const seq = ++fetchSeq.current;
    const timer = setTimeout(() => {
      getEligibleAds(surface)
        .then((res) => {
          if (seq !== fetchSeq.current) return;
          const ads = res?.data?.data || [];
          let pick = ads.find((a) => !session.shown.has(a.id));
          if (!pick && ads.length) {
            // Queue exhausted — every_visit ads start a fresh round.
            const re = ads.filter((a) => a.frequency === "every_visit");
            re.forEach((a) => session.shown.delete(a.id));
            pick = re[0];
          }
          if (!pick) return;
          session.shown.add(pick.id);
          setActiveAd(pick);
          trackAdEvent(pick.id, "view", surface).catch(() => {});
          trackFeatureEvent("promo_ad", "viewed", {
            entityId: pick.id,
            attributes: {
              surface,
              template: pick.template,
              position: pick.position,
            },
          });
        })
        .catch(() => {});
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [surface, user?.user_id, blocked]);

  const close = (event) => {
    if (!activeAd) return;
    trackAdEvent(activeAd.id, event, surface).catch(() => {});
    trackFeatureEvent("promo_ad", event === "click" ? "clicked" : "dismissed", {
      entityId: activeAd.id,
      attributes: { surface },
    });
    if (event === "click") runCta(activeAd, navigate);
    setActiveAd(null);
  };

  return (
    <ModalPortal lockScroll={false}>
      <AnimatePresence>
        {activeAd && (
          <PositionedPromoAd
            key={activeAd.id}
            ad={activeAd}
            onDismiss={() => close("dismiss")}
            onCta={() => close("click")}
          />
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
