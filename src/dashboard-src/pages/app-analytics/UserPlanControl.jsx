import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import PillDropdown from "./PillDropdown";
import { PLAN_OPTIONS, planOf, userPlanOf } from "./plans";

// C1/C2 learners sit in the B2 segment
const PRO_LEVELS = ["A2", "B1", "B2", "C1", "C2"];

const SUPER_ADMIN_TAG = (
  <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-px text-[9px] font-semibold text-amber-700">
    <ShieldCheck className="h-2.5 w-2.5" />
    Super admin
  </span>
);

// Free / Plus / Pro picker for one learner. Every change goes through an
// "Are you sure?" step; the backend re-checks all of these rules.
export default function UserPlanControl({ user, canGrantPro, saving, onChange }) {
  const [pending, setPending] = useState(null);
  const current = userPlanOf(user);
  const proLevelOk = PRO_LEVELS.includes(String(user.current_profeciency_level || "").toUpperCase());
  // Only the Pro admins can move someone onto or off Pro
  const locked = current === "pro" && !canGrantPro;
  const options = useMemo(
    () =>
      PLAN_OPTIONS.filter((o) => o.value !== "pro" || canGrantPro || current === "pro").map((o) =>
        o.value === "pro"
          ? { ...o, tag: SUPER_ADMIN_TAG, disabled: !proLevelOk && current !== "pro", disabledDesc: "Not available for A1 learners" }
          : o,
      ),
    [canGrantPro, current, proLevelOk],
  );

  if (user.own_subscription) {
    return (
      <span
        title="Has their own AutoPay subscription, so the plan can't be changed here"
        className="inline-flex h-7 min-w-[92px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-semibold text-indigo-700"
      >
        <Lock className="h-3 w-3" />
        AutoPay
      </span>
    );
  }

  return (
    <>
      <PillDropdown
        value={current}
        options={options}
        onPick={setPending}
        saving={saving}
        locked={locked}
        lockedTitle="Only the Pro admins can change a Career Pro plan"
        heading="Change plan"
        ariaLabel="Plan"
      />

      {pending &&
        createPortal(
          <PlanConfirm
            name={user.fullname || user.username || "this user"}
            from={planOf(current)}
            to={planOf(pending)}
            downgrade={PLAN_OPTIONS.findIndex((o) => o.value === pending) < PLAN_OPTIONS.findIndex((o) => o.value === current)}
            onCancel={() => setPending(null)}
            onConfirm={() => {
              const to = pending;
              setPending(null);
              onChange(to);
            }}
          />,
          document.body,
        )}
    </>
  );
}

function PlanConfirm({ name, from, to, downgrade, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              downgrade ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-slate-900">Are you sure?</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">{name}</span>'s access in the app changes right away.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
          <PlanChip plan={from} />
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          <PlanChip plan={to} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              downgrade ? "bg-rose-600 hover:bg-rose-700" : "bg-[#002856] hover:bg-[#001e40]"
            }`}
          >
            Yes, move to {to.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanChip({ plan }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${plan.trigger}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${plan.dot}`} />
      {plan.name}
    </span>
  );
}
