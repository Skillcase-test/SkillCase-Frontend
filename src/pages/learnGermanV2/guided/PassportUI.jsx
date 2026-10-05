/* Shared pieces of the guided screens — stamp, header, art tile. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Coffee, UtensilsCrossed, Croissant, Beef, ShoppingBasket,
  ShoppingCart, Shirt, Signpost, TrainFront, House, BookOpen, CalendarDays, Pill, Users,
  HeartPulse, Hospital, Globe2, LockKeyhole,
} from "lucide-react";
import SkillcaseLogo from "../../../components/SkillcaseLogo";
import { formatStampDate } from "./journeyModel";
import StampPress, { STAMP_PRESS_DELAY } from "./StampPress";
import "./passport.css";
import "./guided-local.css";

const icons = {
  coffee: Coffee, utensils: UtensilsCrossed, croissant: Croissant, beef: Beef,
  basket: ShoppingBasket, cart: ShoppingCart, shirt: Shirt, signpost: Signpost,
  train: TrainFront, home: House, book: BookOpen, calendar: CalendarDays, pill: Pill,
  users: Users, heart: HeartPulse, hospital: Hospital, globe: Globe2,
};
export function ChallengeIcon({ name, ...props }) {
  const Icon = icons[name] || Globe2;
  return <Icon {...props} />;
}

export function ScenarioArt({ challenge, className = "" }) {
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  if (!challenge.image || broken) {
    return (
      <div className={`gp-art gp-art-fallback ${className}`} aria-hidden="true">
        <ChallengeIcon name={challenge.icon} />
      </div>
    );
  }
  return (
    <div className={`gp-art ${className}`} aria-hidden="true">
      {!ready && <span className="gp-art-shimmer" />}
      <img src={challenge.image} alt="" loading="lazy" decoding="async" draggable={false}
        data-ready={ready || undefined}
        onLoad={() => setReady(true)} onError={() => setBroken(true)} />
    </div>
  );
}

export function PassportIcon({ className = "", ...props }) {
  return <svg viewBox="0 0 32 36" fill="none" className={className} aria-hidden="true" {...props}><rect x="3" y="2" width="26" height="32" rx="4" fill="currentColor"/><path d="M7 3v30" stroke="#f7f9fd" strokeOpacity=".2"/><circle cx="18" cy="15" r="7" stroke="#efba45" strokeWidth="1.4"/><ellipse cx="18" cy="15" rx="3" ry="7" stroke="#efba45" strokeWidth="1.1"/><path d="M11 15h14M13 11h10M13 19h10M13 27h10" stroke="#efba45" strokeWidth="1.1"/></svg>;
}

// Stamp shapes alternate round and ticket down the path.
const shapeOf = (challenge) => (Number(String(challenge.id).replace(/\D/g, "")) % 2 ? "round" : "ticket");

export function PassportStamp({ challenge, earned = true, date, animate = false, animationDelay = STAMP_PRESS_DELAY, small = false, caption }) {
  const impression = (
    <div className={`gp-stamp ${small ? "gp-stamp-small" : ""}`} data-earned={earned} data-shape={shapeOf(challenge)} style={{ "--stamp-ink": challenge.color }} aria-hidden="true">
      <span className="gp-stamp-rim" />
      <span className="gp-stamp-top">{earned ? "SKILLCASE · DEUTSCH" : "YOUR NEXT ADVENTURE"}</span>
      {earned ? <ChallengeIcon name={challenge.icon} strokeWidth={1.6} /> : <LockKeyhole strokeWidth={1.5} />}
      <strong>{challenge.stamp}</strong>
      <span className="gp-stamp-date">{caption || (earned ? formatStampDate(date) : "STAMP TO COLLECT")}</span>
    </div>
  );
  return animate && earned && !small
    ? <StampPress delay={animationDelay} inkColor={challenge.color}>{impression}</StampPress>
    : impression;
}

export function GuidedHeader({ title, onBack, action }) {
  return (
    <header className="gp-header">
      <button type="button" className="gp-back" onClick={onBack} aria-label="Back to guided learning"><ArrowLeft size={21} /><span>Back</span></button>
      <span>{title}</span>
      {action || <span className="gp-level">German</span>}
    </header>
  );
}

export function JourneyState({ loading, error, retry, children }) {
  if (loading) {
    return <div className="gp-status" role="status" aria-label="Loading your challenges"><div className="gp-skeleton"/><div className="gp-skeleton"/><div className="gp-skeleton"/><span className="sr-only">Loading your challenges</span></div>;
  }
  if (error) {
    return <div className="gp-status"><BookOpen size={32}/><h1>Your journey will be right back</h1><p>We couldn’t load your progress. Your stamps are safe.</p><button className="gp-button" onClick={retry}>Try again</button></div>;
  }
  return children;
}

export function FocusTitle({ children, className }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <h1 className={className} tabIndex={-1} ref={ref}>{children}</h1>;
}

export { SkillcaseLogo };

export function NextChallengeButton({ challenge, onOpen, label = "Continue learning" }) {
  return <button type="button" className="gp-button" onClick={() => onOpen(challenge)}>{label}<ArrowRight size={18}/></button>;
}
