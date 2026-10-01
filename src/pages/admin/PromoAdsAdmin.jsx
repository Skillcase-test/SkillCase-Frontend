import { useEffect } from "react";
import PromoAdManager from "./components/promoAds/PromoAdManager";

const PromoAdsAdmin = ({ canEdit = true }) => {
  // Lock the viewport height only on desktop; on mobile let the page scroll naturally
  useEffect(() => {
    const mainEl = document.querySelector("main");
    const outerEl = mainEl?.closest(".min-h-screen");

    if (mainEl && outerEl) {
      const originalMainClass = mainEl.className;
      const originalOuterClass = outerEl.className;
      const desktop = window.matchMedia("(min-width: 1024px)");

      const applyLayout = () => {
        if (!desktop.matches) {
          mainEl.className = originalMainClass;
          outerEl.className = originalOuterClass;
          return;
        }
        mainEl.classList.remove("min-h-[calc(100vh-24px)]");
        mainEl.classList.add(
          "h-[calc(100vh-79px)]",
          "lg:h-[calc(100vh-96px)]",
          "overflow-hidden",
          "flex",
          "flex-col",
        );

        outerEl.classList.remove("min-h-screen");
        outerEl.classList.add(
          "h-[calc(100vh-55px)]",
          "lg:h-[calc(100vh-72px)]",
          "overflow-hidden",
        );
      };

      applyLayout();
      desktop.addEventListener("change", applyLayout);

      return () => {
        desktop.removeEventListener("change", applyLayout);
        mainEl.className = originalMainClass;
        outerEl.className = originalOuterClass;
      };
    }
  }, []);

  return <PromoAdManager canEdit={canEdit} />;
};

export default PromoAdsAdmin;
