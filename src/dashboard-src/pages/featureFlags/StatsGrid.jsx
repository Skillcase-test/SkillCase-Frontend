import React from "react";
import { Activity, CheckCircle2, Sliders, UserCheck, Users } from "lucide-react";

export default function StatsGrid({ stats = {}, levels = [] }) {
  const pct = stats.total_eligible
    ? Math.round((stats.total_enabled / stats.total_eligible) * 100)
    : 0;

  const cards = [
    {
      label: "Eligible Students",
      icon: Users,
      iconColor: "text-blue-600",
      value: stats.total_eligible,
      valueColor: "text-slate-900",
      note: `(${levels.join(", ")})`,
    },
    {
      label: "Active Access",
      icon: UserCheck,
      iconColor: "text-emerald-600",
      value: stats.total_enabled,
      valueColor: "text-emerald-600",
      note: `(${pct}%)`,
    },
    {
      label: "Paid Access",
      icon: CheckCircle2,
      iconColor: "text-indigo-600",
      value: stats.paid_enabled,
      valueColor: "text-indigo-600",
      note: `/ ${stats.total_paid || 0} paid`,
    },
    {
      label: "Free/Unpaid Access",
      icon: Activity,
      iconColor: "text-amber-600",
      value: stats.unpaid_enabled,
      valueColor: "text-amber-600",
      note: `/ ${stats.total_unpaid || 0} free`,
    },
    {
      label: "Custom Overrides",
      icon: Sliders,
      iconColor: "text-purple-600",
      value: stats.total_overrides,
      valueColor: "text-purple-600",
      note: "exceptions",
      wide: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs ${
            card.wide ? "col-span-2 lg:col-span-1" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {card.label}
            </span>
            <card.icon className={`w-4 h-4 ${card.iconColor}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${card.valueColor}`}>
              {card.value?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">{card.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
