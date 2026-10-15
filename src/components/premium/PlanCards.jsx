import { ArrowRight, Gift } from "lucide-react";
import { GoTrophy } from "react-icons/go";
import { PREMIUM_TIER_NAMES } from "../../utils/premium";

export const PLAN_TROPHY = "/plan-trophy.webp";

function CardShell({ className, children }) {
  return (
    <div className={`w-full p-3 rounded-xl flex items-center justify-between gap-3 ${className}`}>
      <div className="flex-1 min-w-0 flex flex-col gap-4">{children}</div>
      <img
        src={PLAN_TROPHY}
        alt=""
        aria-hidden="true"
        className="w-20 xs:w-24 aspect-5/6 object-contain shrink-0"
      />
    </div>
  );
}

function CardLink({ onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 w-fit text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
      <ArrowRight className="size-3" strokeWidth={2.5} />
    </button>
  );
}

/** Profile plan card for free users. */
export function FreePlanCard({ upgradeTier = "pro", onUpgrade }) {
  return (
    <CardShell className="bg-linear-45 from-white to-orange-200">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-blue-950 rounded-full flex shrink-0">
            <Gift className="size-4 text-white" strokeWidth={1.75} />
          </span>
          <span className="text-blue-950 text-base font-semibold leading-5">Free Plan active</span>
        </div>
        <p className="text-blue-950 text-xs leading-4">
          Subscribe to Premium Plan for unlimited access to all features.
        </p>
      </div>
      <CardLink onClick={onUpgrade} className="text-blue-950">
        Upgrade to {PREMIUM_TIER_NAMES[upgradeTier]}
      </CardLink>
    </CardShell>
  );
}

/** Profile plan card for premium users (both tiers, subscribed or admin-granted). */
export function PremiumPlanCard({ name, lines, actionLabel, onAction }) {
  return (
    <CardShell className="bg-linear-120 from-black from-5% via-premium-navy via-50% to-premium-gold">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-zinc-800 rounded-full flex shrink-0">
            <GoTrophy className="size-4 text-gold-300" />
          </span>
          <span className="text-white text-base font-semibold leading-5">{name} Active</span>
        </div>
        <div className="flex flex-col gap-1">
          {lines.map((line) => (
            <p key={line} className="text-white text-xs leading-4">
              {line}
            </p>
          ))}
        </div>
      </div>
      <CardLink onClick={onAction} className="text-gold-400">
        {actionLabel}
      </CardLink>
    </CardShell>
  );
}
