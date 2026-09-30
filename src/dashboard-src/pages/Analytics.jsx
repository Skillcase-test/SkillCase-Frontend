import DashboardCard01 from "../partials/dashboard/DashboardCard01";
import DashboardCard03 from "../partials/dashboard/DashboardCard03";
import DashboardCard07 from "../partials/dashboard/DashboardCard07";
import DashboardCard11 from "../partials/dashboard/DashboardCard11";
import DashboardCard12 from "../partials/dashboard/DashboardCard12";
import DashboardCard13 from "../partials/dashboard/DashboardCard13";
import DashboardCardDAU from "../partials/dashboard/DashboardCardDAU";
import DashboardCardAllUsers from "../partials/dashboard/DashboardCardAllUsers";
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
        <DashboardCard12 key="card-12" />
        <DashboardCardAllUsers key="card-all-users" />
        <DashboardCardDAU key="card-dau" />
        <DashboardCardLearnGermanAdvanced key="card-german-advanced" />
        <DashboardCard01 key="card-01" />
        <DashboardCard13 key="card-13" />
        <DashboardCard03 key="card-03" />
        <DashboardCard07 key="card-07" />
        <DashboardCard11 key="card-11" />
      </div>
    </div>
  );
}

export default Analytics;
