import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ModalPortal from "../../../components/common/ModalPortal";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
import mayaSad from "../../../assets/onboarding/mayaSad.webp";

// Status popup shown once when a candidate opens a pathway whose admin
// decision already landed — shortlisted celebrates with thumbs-up Maya,
// rejected shows sad Maya and routes them back to the remaining paths.
const CONTENT = {
  shortlisted: {
    image: mayaThumbsup,
    imageBg: "bg-emerald-100",
    heading: "Congratulations!",
    body: (title) =>
      `You have been shortlisted for “${title}”. Our team will reach out shortly to guide you through the next steps.`,
    cta: "Great",
    ctaClass: "bg-emerald-500 hover:bg-emerald-600 text-white",
  },
  rejected: {
    image: mayaSad,
    imageBg: "bg-rose-100",
    heading: "Pathway update",
    body: (title) =>
      `Your status for “${title}” has been changed and this path is no longer moving ahead. Explore the other pathways that match your goals.`,
    cta: "Check other pathways",
    ctaClass: "bg-[#002856] hover:bg-[#07192f] text-white",
  },
};

const OpportunityStatusModal = ({ status, title, onDismiss, onCheckOthers }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const content = CONTENT[status];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!content) return null;

  const close = (cb) => {
    setIsClosing(true);
    setTimeout(cb, 250);
  };

  const isRejected = status === "rejected";

  return (
    <ModalPortal active={true}>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isClosing ? "bg-black/0" : isVisible ? "bg-black/50" : "bg-black/0"
        }`}
      >
        <div
          className={`relative bg-white rounded-3xl px-6 pt-7 pb-6 max-w-sm w-full shadow-2xl transform transition-all duration-300 flex flex-col items-center text-center ${
            isClosing
              ? "scale-95 opacity-0"
              : isVisible
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => close(onDismiss)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div
            className={`w-24 h-24 rounded-2xl ${content.imageBg} flex items-end justify-center overflow-hidden mb-4`}
          >
            <img
              src={content.image}
              alt=""
              className="h-full w-auto object-contain object-bottom select-none"
              draggable="false"
            />
          </div>
          <h2 className="text-lg font-bold text-[#002856] tracking-tight mb-1.5">
            {content.heading}
          </h2>
          <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-6">
            {content.body(title)}
          </p>
          <button
            type="button"
            onClick={() =>
              close(isRejected && onCheckOthers ? onCheckOthers : onDismiss)
            }
            className={`w-full py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer border-none ${content.ctaClass}`}
          >
            {content.cta}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default OpportunityStatusModal;
