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

function Analytics() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <DashboardCard01 key="card-01" />
      <DashboardCard02 key="card-02" />
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
  );
}

export default Analytics;
