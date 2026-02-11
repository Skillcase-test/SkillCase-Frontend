import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import LineChartDAU from "../../charts/LineChartDAU"; // Import the NEW chart
import { chartAreaGradient } from "../../charts/ChartjsConfig";
import EditMenu from "../../components/DropdownEditMenu";
import { adjustColorOpacity, getCssVariable } from "../../utils/Utils";
import api from "../../../api/axios";

function DashboardCardDAU() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);

  useEffect(() => {
    const fetchDAU = async () => {
      try {
        setLoading(true);
        // Fetch last 7 days by default
        const response = await api.get(
          "/admin/analytics/daily-active-users?days=7",
        );
        setRawData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching DAU:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDAU();
  }, []);

  const data = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    // Pass RAW ISO strings (YYYY-MM-DD) to Chart.js. Let the chart parse them.
    const labels = rawData.map((d) => d.activity_date);

    // A1 Dataset
    const a1Color = getCssVariable("--color-blue-500");
    const a1Dataset = {
      label: "A1 Users",
      data: rawData.map((d) => parseInt(d.a1_count)),
      fill: true,
      backgroundColor: function (context) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        return chartAreaGradient(ctx, chartArea, [
          { stop: 0, color: adjustColorOpacity(a1Color, 0) },
          { stop: 1, color: adjustColorOpacity(a1Color, 0.2) },
        ]);
      },
      borderColor: a1Color,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      pointBackgroundColor: a1Color,
      clip: 20,
      tension: 0.2,
    };

    // A2 Dataset
    const a2Color = getCssVariable("--color-emerald-500");
    const a2Dataset = {
      label: "A2 Users",
      data: rawData.map((d) => parseInt(d.a2_count)),
      fill: true,
      backgroundColor: function (context) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        return chartAreaGradient(ctx, chartArea, [
          { stop: 0, color: adjustColorOpacity(a2Color, 0) },
          { stop: 1, color: adjustColorOpacity(a2Color, 0.2) },
        ]);
      },
      borderColor: a2Color,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      pointBackgroundColor: a2Color,
      clip: 20,
      tension: 0.2,
    };

    return {
      labels,
      datasets: [a1Dataset, a2Dataset],
    };
  }, [rawData]);

  if (loading)
    return <div className="p-5 bg-white shadow-xs rounded-xl">Loading...</div>;
  if (error)
    return (
      <div className="p-5 bg-white shadow-xs rounded-xl text-red-500">
        Error: {error}
      </div>
    );

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl">
      <div className="px-5 pt-5 pb-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Daily Active Users
          </h2>
          {/* LEGEND MOVED TO HEADER */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-500">A1</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-gray-500">A2</span>
            </div>
          </div>
        </header>
        <div className="text-xs font-semibold text-gray-400 uppercase mb-1">
          Last 7 Days
        </div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 mr-2">
            {/* Show most recent day's total */}
            {rawData.length > 0
              ? parseInt(rawData[rawData.length - 1].total_active)
              : 0}
          </div>

          <div className="text-sm text-gray-500">Active today</div>
        </div>
      </div>
      {data && (
        <div className="grow max-sm:max-h-[128px] xl:max-h-[128px]">
          {/* USE THE NEW CHART COMPONENT */}
          <LineChartDAU data={data} width={389} height={128} />
        </div>
      )}
    </div>
  );
}

export default DashboardCardDAU;
