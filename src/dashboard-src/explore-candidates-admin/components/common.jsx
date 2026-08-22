import { Link, useLocation } from "react-router-dom";
import { RECRUITER_TABS } from "../utils/constants";

export function Spinner({ size = "md", color = "text-slate-400" }) {
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <svg
      className={`animate-spin ${sz} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? "bg-emerald-600" : "bg-slate-300"
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
}

export function StatCard({ label, value, subtext, icon: Icon, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-[#083262] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">{value}</h3>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
        {Icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
              colorMap[color] || colorMap.blue
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h4 className="mt-3 text-sm font-bold text-slate-800">{title}</h4>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageCard({ title, description, children, actions }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
      {children && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6">{children}</div>
        </div>
      )}
    </div>
  );
}

export function TabNavigation({ activeTab, counts = {} }) {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, "");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
      {RECRUITER_TABS.map((tab) => {
        let isActive = false;
        if (activeTab) {
          isActive = activeTab === tab.key;
        } else if (tab.key === "accounts") {
          isActive =
            currentPath === "" ||
            currentPath === "/" ||
            currentPath === "/admin/explore-candidates" ||
            currentPath.startsWith("/accounts") ||
            currentPath.startsWith("/admin/explore-candidates/accounts");
        } else if (tab.key === "library") {
          isActive =
            currentPath.includes("/library") ||
            currentPath.includes("/profiles");
        } else if (tab.key === "jobs") {
          isActive = currentPath.includes("/jobs");
        } else if (tab.key === "access-requests") {
          isActive = currentPath.includes("/access-requests");
        } else {
          isActive =
            currentPath.startsWith(tab.path) ||
            currentPath.endsWith(`/${tab.key}`);
        }

        const count = counts[tab.key];

        return (
          <Link
            key={tab.key}
            to={tab.path}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              isActive
                ? "bg-[#083262] text-white shadow-[#083262]/20"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            {count !== undefined && count !== null && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function TableWrapper({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">{children}</table>
      </div>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return (
    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
      {children}
    </tbody>
  );
}

export function PaginationBar({
  page = 1,
  totalPages,
  totalItems,
  total,
  limit,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const effLimit = pageSize || limit || 10;
  const effTotal = (totalItems !== undefined ? totalItems : total) || 0;
  const effTotalPages =
    totalPages !== undefined
      ? totalPages
      : Math.max(1, Math.ceil(effTotal / effLimit));
  const start = effTotal === 0 ? 0 : (page - 1) * effLimit + 1;
  const end = Math.min(page * effLimit, effTotal);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 py-2">
      <p className="text-xs text-slate-500">
        Showing <span className="font-bold text-slate-800">{start}</span> to{" "}
        <span className="font-bold text-slate-800">{end}</span> of{" "}
        <span className="font-bold text-slate-800">{effTotal}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Previous
        </button>
        <span className="text-xs font-bold text-slate-600 px-2">
          Page {page} of {Math.max(1, effTotalPages || 1)}
        </span>
        <button
          type="button"
          disabled={page >= effTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
