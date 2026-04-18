import DashboardCard01 from "../partials/dashboard/DashboardCard01";
import DashboardCard02 from "../partials/dashboard/DashboardCard02";
import DashboardCard03 from "../partials/dashboard/DashboardCard03";
import DashboardCard04 from "../partials/dashboard/DashboardCard04";
import DashboardCard05 from "../partials/dashboard/DashboardCard05";
import DashboardCard06 from "../partials/dashboard/DashboardCard06";
import DashboardCard07 from "../partials/dashboard/DashboardCard07";
import DashboardCard08 from "../partials/dashboard/DashboardCard08";
import DashboardCard09 from "../partials/dashboard/DashboardCard09";
import DashboardCard10 from "../partials/dashboard/DashboardCard10";
import DashboardCard11 from "../partials/dashboard/DashboardCard11";
import DashboardCard12 from "../partials/dashboard/DashboardCard12";
import DashboardCard13 from "../partials/dashboard/DashboardCard13";
import DashboardCardDAU from "../partials/dashboard/DashboardCardDAU";

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
        <DashboardCardDAU key="card-dau" />
        <DashboardCard01 key="card-01" />
        <DashboardCard02 key="card-02" />
        <DashboardCard13 key="card-13" />
        <DashboardCard03 key="card-03" />
        <DashboardCard04 key="card-04" />
        <DashboardCard05 key="card-05" />
        <DashboardCard06 key="card-06" />
        <DashboardCard07 key="card-07" />
        <DashboardCard08 key="card-08" />
        <DashboardCard09 key="card-09" />
        <DashboardCard10 key="card-10" />
        <DashboardCard11 key="card-11" />
      </div>
    </div>
  );
}

export default Analytics;
