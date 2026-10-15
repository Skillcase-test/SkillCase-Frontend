export const PLAN_OPTIONS = [
  {
    value: "free",
    label: "Free",
    name: "Free",
    desc: "No premium access",
    dot: "bg-slate-400",
    trigger: "border-slate-200 bg-white text-slate-600",
  },
  {
    value: "plus",
    label: "Plus",
    name: "Career Plus",
    desc: "Full access · Maya 10 min/day",
    dot: "bg-emerald-500",
    trigger: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "pro",
    label: "Pro",
    name: "Career Pro",
    desc: "Full access · Maya 30 min/day",
    dot: "bg-amber-500",
    trigger: "border-amber-200 bg-amber-50 text-amber-800",
  },
];

// Older backends only send is_paid
export const userPlanOf = (user) => user?.admin_plan || (user?.is_paid ? "plus" : "free");

export const planOf = (value) => PLAN_OPTIONS.find((o) => o.value === value) || PLAN_OPTIONS[0];
