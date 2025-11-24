import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import LineChart from "../../charts/LineChart01";
import { chartAreaGradient } from "../../charts/ChartjsConfig";
import EditMenu from "../../components/DropdownEditMenu";
import { adjustColorOpacity, getCssVariable } from "../../utils/Utils";
import api from "../../../api/axios";
function DashboardCard02() {
  const [interactionData, setInteractionData] = useState({
    count: 0,
    result: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchInteractionData = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          "/admin/analytics/prev-month-interaction-analytics"
        );

        const data = await response.data;
        setInteractionData(data);
        processChartData(data.result);
        setError(null);
      } catch (err) {
        console.error("Error fetching flashcard interactions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInteractionData();
  }, []);

  const processChartData = (interactions) => {
    // Group interactions by date
    const interactionsByDate = interactions.reduce((acc, interaction) => {
      const date = new Date(interaction.modified_at).toLocaleDateString(
        "en-US",
        {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }
      );
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Sort dates and create chart data
    const sortedDates = Object.keys(interactionsByDate).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    const counts = sortedDates.map((date) => interactionsByDate[date]);

    const formattedChartData = {
      labels: sortedDates,
      datasets: [
        {
          data: counts,
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return chartAreaGradient(ctx, chartArea, [
              {
                stop: 0,
                color: adjustColorOpacity(
                  getCssVariable("--color-blue-500"),
                  0
                ),
              },
              {
                stop: 1,
                color: adjustColorOpacity(
                  getCssVariable("--color-blue-500"),
                  0.2
                ),
              },
            ]);
          },
          borderColor: getCssVariable("--color-blue-500"),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: getCssVariable("--color-blue-500"),
          pointHoverBackgroundColor: getCssVariable("--color-blue-500"),
          pointBorderWidth: 0,
          pointHoverBorderWidth: 0,
          clip: 20,
          tension: 0.2,
        },
      ],
    };

    setChartData(formattedChartData);
  };

  const calculateGrowth = () => {
    if (interactionData.result.length === 0) return 0;

    const now = new Date();
    const halfMonthAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const recentInteractions = interactionData.result.filter(
      (interaction) => new Date(interaction.modified_at) >= halfMonthAgo
    ).length;

    const olderInteractions = interactionData.count - recentInteractions;

    if (olderInteractions === 0) return recentInteractions > 0 ? 100 : 0;
    return Math.round(
      ((recentInteractions - olderInteractions) / olderInteractions) * 100
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500 ">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  const growthPercentage = calculateGrowth();

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white  shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800  mb-2">
            Flashcard Interactions
          </h2>
          <EditMenu align="right" className="relative inline-flex">
            <li>
              <Link
                className="font-medium text-sm text-gray-600  hover:text-gray-800  flex py-1 px-3"
                to="#0"
              >
                Refresh
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-sm text-gray-600  hover:text-gray-800  flex py-1 px-3"
                to="#0"
              >
                Export
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-sm text-red-500 hover:text-red-600 flex py-1 px-3"
                to="#0"
              >
                Remove
              </Link>
            </li>
          </EditMenu>
        </header>
        <div className="text-xs font-semibold text-gray-400  uppercase mb-1">
          Last 30 Days
        </div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800  mr-2">
            {interactionData.count}
          </div>
          <div
            className={`text-sm font-medium px-1.5 rounded-full ${
              growthPercentage >= 0
                ? "text-green-700 bg-green-500/20"
                : "text-red-700 bg-red-500/20"
            }`}
          >
            {growthPercentage >= 0 ? "+" : ""}
            {growthPercentage}%
          </div>
        </div>
      </div>
      {chartData && (
        <div className="grow max-sm:max-h-[128px] max-h-[128px]">
          <LineChart data={chartData} width={389} height={128} />
        </div>
      )}
    </div>
  );
}

export default DashboardCard02;
