import DashboardCard07 from "../partials/dashboard/DashboardCard07";
import DashboardCard11 from "../partials/dashboard/DashboardCard11";
import DashboardCardLearnGermanAdvanced from "../partials/dashboard/DashboardCardLearnGermanAdvanced";

function Analytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:p-4">
      <div className="mb-3 px-1">
        <h1 className="text-lg font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">
          Each metric is shown as an independent tile for quick comparison.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <DashboardCardLearnGermanAdvanced key="card-german-advanced" />
        <DashboardCard07 key="card-07" />
        <DashboardCard11 key="card-11" />
      </div>
    </div>
  );
}

export default Analytics;
