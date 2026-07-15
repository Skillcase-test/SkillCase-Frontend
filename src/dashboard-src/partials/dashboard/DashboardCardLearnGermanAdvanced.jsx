import React, { useState, useEffect, useRef } from "react";
import api from "../../../api/axios";
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  BookOpen, 
  UserCheck, 
  RotateCcw, 
  Grid, 
  Eye,
  Activity
} from "lucide-react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { chartAreaGradient, chartColors } from "../../charts/ChartjsConfig";
import { adjustColorOpacity } from "../../utils/Utils";

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

// Retention Line Chart Component
function RetentionLineChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { tooltipBodyColor, tooltipBgColor, tooltipBorderColor, tooltipTitleColor, gridColor, textColor } = chartColors;

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    
    // Destroy previous chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              boxWidth: 10,
              font: {
                size: 11,
                weight: "600"
              },
              padding: 15,
              color: tooltipTitleColor
            }
          },
          tooltip: {
            mode: "index",
            intersect: false,
            padding: 10,
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipBodyColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            titleFont: {
              weight: "bold"
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            },
            title: {
              display: true,
              text: "Months Since Cohort Start",
              color: textColor,
              font: {
                size: 11,
                weight: "bold"
              }
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            max: 100,
            grid: {
              color: gridColor
            },
            title: {
              display: true,
              text: "Retention Rate (%)",
              color: textColor,
              font: {
                size: 11,
                weight: "bold"
              }
            },
            ticks: {
              color: textColor,
              callback: (value) => `${value}%`
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={canvasRef}></canvas>;
}

function DashboardCardLearnGermanAdvanced() {
  const [activeTab, setActiveTab] = useState("lessons");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lookbackMonths, setLookbackMonths] = useState(6);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [datePreset, setDatePreset] = useState(30);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [lessonsPage, setLessonsPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [visitsPage, setVisitsPage] = useState(1);
  const [milestonesPage, setMilestonesPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);

  const [lessonsPagination, setLessonsPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [eventsPagination, setEventsPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [visitsPagination, setVisitsPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [milestonesPagination, setMilestonesPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [returnsPagination, setReturnsPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });

  // Data states
  const [lessonsData, setLessonsData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [eventsSummary, setEventsSummary] = useState({
    module_started: 0,
    module_completed: 0,
    module_abandoned: 0,
    quiz_answered: 0,
    quiz_accuracy: 0,
  });
  const [visitsData, setVisitsData] = useState([]);
  const [milestonesData, setMilestonesData] = useState([]);
  const [returnsData, setReturnsData] = useState([]);
  const [returnsSummary, setReturnsSummary] = useState({ total_visitors: 0, returned_visitors: 0, return_rate: 0 });
  const [retentionData, setRetentionData] = useState([]);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  // Reset page numbers on tab switch
  useEffect(() => {
    setLessonsPage(1);
    setEventsPage(1);
    setVisitsPage(1);
    setMilestonesPage(1);
    setReturnsPage(1);
  }, [activeTab]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "lessons") {
        const res = await api.get(`/admin/analytics/german-lesson-analytics?startDate=${startDate}&endDate=${endDate}&page=${lessonsPage}&limit=10`);
        setLessonsData(res.data.data);
        setLessonsPagination(res.data.pagination);
      } else if (activeTab === "events") {
        const res = await api.get(`/admin/analytics/learn-german-module-events?startDate=${startDate}&endDate=${endDate}&page=${eventsPage}&limit=10`);
        setEventsData(res.data.data || []);
        setEventsSummary(res.data.summary || {});
        setEventsPagination(res.data.pagination);
      } else if (activeTab === "visits") {
        const res = await api.get(`/admin/analytics/learn-german-visits?startDate=${startDate}&endDate=${endDate}&page=${visitsPage}&limit=10`);
        setVisitsData(res.data.data);
        setVisitsPagination(res.data.pagination);
      } else if (activeTab === "milestones") {
        const res = await api.get(`/admin/analytics/lesson-milestones?startDate=${startDate}&endDate=${endDate}&page=${milestonesPage}&limit=10`);
        setMilestonesData(res.data.data);
        setMilestonesPagination(res.data.pagination);
      } else if (activeTab === "returns") {
        const res = await api.get(`/admin/analytics/two-day-returns?startDate=${startDate}&endDate=${endDate}&page=${returnsPage}&limit=10`);
        setReturnsData(res.data.data);
        setReturnsSummary(res.data.summary);
        setReturnsPagination(res.data.pagination);
      } else if (activeTab === "retention") {
        const res = await api.get(`/admin/analytics/retention?lookbackMonths=${lookbackMonths}`);
        setRetentionData(res.data);
      }
    } catch (err) {
      console.error("Error fetching analytics tab data:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate, lookbackMonths, lessonsPage, eventsPage, visitsPage, milestonesPage, returnsPage]);

  const setPresetRange = (days) => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - days);
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(past.toISOString().split("T")[0]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // Build line chart dataset from retention data
  const getRetentionChartData = () => {
    if (retentionData.length === 0) return null;

    const cohortsMap = {};
    let maxMonthNumber = 0;

    retentionData.forEach((row) => {
      const { cohort, month_number, retention_rate } = row;
      if (!cohortsMap[cohort]) {
        cohortsMap[cohort] = [];
      }
      const mNum = parseInt(month_number);
      cohortsMap[cohort][mNum] = parseFloat(retention_rate);
      if (mNum > maxMonthNumber) {
        maxMonthNumber = mNum;
      }
    });

    const cohortsSorted = Object.keys(cohortsMap).sort();
    const labels = Array.from({ length: maxMonthNumber + 1 }, (_, i) => `Month ${i}`);

    const cohortColors = [
      "#6366f1", // Indigo
      "#10b981", // Emerald
      "#f59e0b", // Amber
      "#ec4899", // Pink
      "#3b82f6", // Blue
      "#8b5cf6", // Purple
      "#06b6d4", // Cyan
      "#f43f5e", // Rose
    ];

    const datasets = cohortsSorted.map((cohort, idx) => {
      const color = cohortColors[idx % cohortColors.length];
      const dataPoints = [];
      for (let m = 0; m <= maxMonthNumber; m++) {
        dataPoints.push(cohortsMap[cohort][m] !== undefined ? cohortsMap[cohort][m] : null);
      }

      return {
        label: cohort,
        data: dataPoints,
        borderColor: color,
        fill: true,
        backgroundColor: function (context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(color, 0) },
            { stop: 1, color: adjustColorOpacity(color, 0.25) },
          ]);
        },
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        clip: 20,
        tension: 0.25,
        spanGaps: true
      };
    });

    return {
      labels,
      datasets
    };
  };

  // Retention Matrix processing
  const renderRetentionMatrix = () => {
    if (retentionData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No retention data found for the lookback period
        </div>
      );
    }

    const cohortsMap = {};
    let maxMonthNumber = 0;

    retentionData.forEach((row) => {
      const { cohort, cohort_size, month_number, retained_users, retention_rate } = row;
      if (!cohortsMap[cohort]) {
        cohortsMap[cohort] = {
          cohortSize: cohort_size,
          months: {}
        };
      }
      cohortsMap[cohort].months[month_number] = {
        rate: parseFloat(retention_rate),
        users: parseInt(retained_users)
      };
      if (parseInt(month_number) > maxMonthNumber) {
        maxMonthNumber = parseInt(month_number);
      }
    });

    const cohortsSorted = Object.keys(cohortsMap).sort().reverse();
    const monthColumns = Array.from({ length: maxMonthNumber + 1 }, (_, i) => i);

    return (
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3.5 text-left font-semibold">Cohort</th>
              <th className="px-4 py-3.5 text-left font-semibold">Size</th>
              {monthColumns.map((m) => (
                <th key={m} className="px-3 py-3.5 text-center font-semibold">M{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm">
            {cohortsSorted.map((cohort) => {
              const data = cohortsMap[cohort];
              return (
                <tr key={cohort} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                    {cohort}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                    {data.cohortSize}
                  </td>
                  {monthColumns.map((m) => {
                    const cell = data.months[m];
                    if (!cell) {
                      return (
                        <td key={m} className="px-3 py-3.5 text-center bg-slate-50/50 text-slate-300">
                          -
                        </td>
                      );
                    }
                    const rate = cell.rate;
                    const bgStyle = {
                      backgroundColor: `rgba(99, 102, 241, ${rate / 100 * 0.85 + 0.15})`,
                      color: rate > 50 ? "#ffffff" : "#1e1b4b"
                    };

                    return (
                      <td 
                        key={m} 
                        style={bgStyle} 
                        className="px-3 py-3.5 text-center font-semibold transition-all duration-200 select-none relative group whitespace-nowrap"
                      >
                        {rate.toFixed(1)}%
                        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap">
                          {cell.users} / {data.cohortSize} active
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPaginationControls = (paginationState, onPageChange) => {
    const { currentPage, totalPages, totalRecords } = paginationState;
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3.5 bg-slate-50/30">
        <div className="text-xs text-slate-500">
          Showing page <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
          <span className="font-semibold text-slate-700">{totalPages}</span> ({totalRecords} total records)
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none ${
              currentPage === 1
                ? "bg-white border-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none ${
              currentPage === totalPages
                ? "bg-white border-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col col-span-full bg-white shadow-sm rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header section with Soft Glassmorphic Touch */}
      <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/0 to-transparent px-6 py-5 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Learn German Advanced Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track student visits, dynamic lesson progress, 2-day returns, and long-term cohort retention.
            </p>
          </div>

          {/* Global Date Range controls */}
          {activeTab !== "retention" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-xs">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="text-xs text-slate-700 focus:outline-none focus:ring-0 cursor-pointer border-none p-0 outline-none bg-transparent"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="text-xs text-slate-700 focus:outline-none focus:ring-0 cursor-pointer border-none p-0 outline-none bg-transparent"
                />
              </div>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => {
                    setPresetRange(7);
                    setDatePreset(7);
                  }}
                  className={`px-2.5 py-1.2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    datePreset === 7
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => {
                    setPresetRange(30);
                    setDatePreset(30);
                  }}
                  className={`px-2.5 py-1.2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    datePreset === 30
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  30D
                </button>
                <button
                  onClick={() => {
                    setPresetRange(90);
                    setDatePreset(90);
                  }}
                  className={`px-2.5 py-1.2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    datePreset === 90
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  90D
                </button>
              </div>
            </div>
          )}

          {/* Cohort range lookback dropdown */}
          {activeTab === "retention" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <span className="text-xs text-slate-500 font-semibold">Lookback:</span>
              <select
                value={lookbackMonths}
                onChange={(e) => setLookbackMonths(Number(e.target.value))}
                className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none py-0 pl-2 pr-2 focus:outline-none focus:ring-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 cursor-pointer"
              >
                <option value={3} className="bg-white text-slate-700 py-1.5 px-3">Last 3 Months</option>
                <option value={6} className="bg-white text-slate-700 py-1.5 px-3">Last 6 Months</option>
                <option value={9} className="bg-white text-slate-700 py-1.5 px-3">Last 9 Months</option>
                <option value={12} className="bg-white text-slate-700 py-1.5 px-3">Last 12 Months</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mt-5 space-x-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "lessons"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Lesson Performance
          </button>
          <button
            onClick={() => setActiveTab("visits")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "visits"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Eye className="w-4 h-4" />
            User Visits
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "events"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Activity className="w-4 h-4" />
            Module Events
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "milestones"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Milestones
          </button>
          <button
            onClick={() => setActiveTab("returns")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "returns"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            2-Day Return Rate
          </button>
          <button
            onClick={() => setActiveTab("retention")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "retention"
                ? "border-indigo-500 text-indigo-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Grid className="w-4 h-4" />
            MoM Retention
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 grow bg-slate-50/20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="text-slate-400 text-xs mt-3">Fetching analytical data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-xs font-semibold bg-red-50/50 rounded-xl border border-red-100 p-4">
            Error: {error}
          </div>
        ) : (
          <div className="w-full">
            {/* 1. LESSON PERFORMANCE TAB */}
            {activeTab === "lessons" && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Order</th>
                        <th className="px-5 py-3 text-left font-semibold">Lesson Name</th>
                        <th className="px-5 py-3 text-center font-semibold">Level</th>
                        <th className="px-5 py-3 text-right font-semibold">Users Started</th>
                        <th className="px-5 py-3 text-right font-semibold">Completions</th>
                        <th className="px-5 py-3 text-right font-semibold">Avg Screens Done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {lessonsData.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-slate-400 text-xs">
                            No lesson progress activity found in selected range.
                          </td>
                        </tr>
                      ) : (
                        lessonsData.map((lesson) => (
                          <tr key={lesson.lesson_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                              {lesson.topic_order}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">
                              {lesson.title}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {lesson.proficiency_level}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-700 font-semibold">
                              {lesson.started_count}
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-700 font-semibold">
                              {lesson.completed_count}
                            </td>
                            <td className="px-5 py-3.5 text-right text-indigo-600 font-bold">
                              {lesson.avg_screens_completed !== null ? lesson.avg_screens_completed : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(lessonsPagination, setLessonsPage)}
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    ["Started", eventsSummary.module_started || 0],
                    ["Completed", eventsSummary.module_completed || 0],
                    ["Abandoned", eventsSummary.module_abandoned || 0],
                    ["Quiz Answers", eventsSummary.quiz_answered || 0],
                    ["Quiz Accuracy", `${eventsSummary.quiz_accuracy || 0}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                      <div className="mt-1 text-xl font-black text-slate-800">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-3 text-left">Module</th>
                          <th className="px-5 py-3 text-center">Level</th>
                          <th className="px-5 py-3 text-right">Started</th>
                          <th className="px-5 py-3 text-right">Completed</th>
                          <th className="px-5 py-3 text-right">Abandoned</th>
                          <th className="px-5 py-3 text-right">Avg Last Screen</th>
                          <th className="px-5 py-3 text-right">Quiz Answers</th>
                          <th className="px-5 py-3 text-right">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {eventsData.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                              No module events found in the selected range.
                            </td>
                          </tr>
                        ) : (
                          eventsData.map((module) => (
                            <tr key={module.lesson_id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-800">{module.lesson_title}</td>
                              <td className="px-5 py-3.5 text-center text-slate-500">{module.proficiency_level || "-"}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-700">{module.module_started}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{module.module_completed}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-amber-600">{module.module_abandoned}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-600">{module.avg_abandoned_screen_index ?? "-"}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-700">{module.quiz_answered}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-indigo-600">{module.quiz_accuracy}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {renderPaginationControls(eventsPagination, setEventsPage)}
                </div>
              </div>
            )}

            {/* 2. USER VISITS TAB */}
            {activeTab === "visits" && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left w-10"></th>
                        <th className="px-5 py-3 text-left">Username</th>
                        <th className="px-5 py-3 text-left">Full Name</th>
                        <th className="px-5 py-3 text-right">Total Visits</th>
                        <th className="px-5 py-3 text-right">Latest Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {visitsData.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-400 text-xs">
                            No user visits recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        visitsData.map((user) => {
                          const isExpanded = expandedUserId === user.user_id;
                          return (
                            <React.Fragment key={user.user_id}>
                              <tr 
                                onClick={() => setExpandedUserId(isExpanded ? null : user.user_id)}
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                              >
                                <td className="px-5 py-3 text-center">
                                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90 text-indigo-500" : ""}`} />
                                </td>
                                <td className="px-5 py-3 font-bold text-slate-800">
                                  {user.username}
                                </td>
                                <td className="px-5 py-3 text-slate-500">
                                  {user.fullname}
                                </td>
                                <td className="px-5 py-3 text-right text-indigo-600 font-bold">
                                  {user.visit_count}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-400 font-mono text-xs">
                                  {user.visit_timestamps && user.visit_timestamps[0] ? formatDate(user.visit_timestamps[0]) : "N/A"}
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan="5" className="bg-slate-50/30 p-4 border-t border-slate-100">
                                    <div className="max-w-2xl ml-6">
                                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Visit History (IST)</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                                        {user.visit_timestamps.map((ts, idx) => (
                                          <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-100 rounded-lg text-xs text-slate-600 shadow-xs font-mono">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {formatDate(ts)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(visitsPagination, setVisitsPage)}
              </div>
            )}

            {/* 3. MILESTONES TAB */}
            {activeTab === "milestones" && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Username</th>
                        <th className="px-5 py-3 text-left">Full Name</th>
                        <th className="px-5 py-3 text-left">First Lesson Started (IST)</th>
                        <th className="px-5 py-3 text-left">First Lesson Completed (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {milestonesData.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-slate-400 text-xs">
                            No milestones recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        milestonesData.map((user) => (
                          <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-slate-800">
                              {user.username}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {user.fullname}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-semibold">
                              {formatDate(user.first_lesson_started_at)}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-emerald-600 font-semibold">
                              {user.first_lesson_completed_at ? formatDate(user.first_lesson_completed_at) : (
                                <span className="text-slate-400 font-normal">Not Completed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPaginationControls(milestonesPagination, setMilestonesPage)}
              </div>
            )}

            {/* 4. 2-DAY RETURN RATE TAB */}
            {activeTab === "returns" && (
              <div className="space-y-6">
                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Visitors</div>
                    <div className="text-2xl font-black text-slate-800 mt-1.5">
                      {returnsSummary.total_visitors}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">Distinct user visits in range</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Returned within 2 Days</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1.5">
                      {returnsSummary.returned_visitors}
                    </div>
                    <p className="text-[10px] text-emerald-500 mt-1.5">Returned within 48h interval</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Return Rate</div>
                    <div className="text-2xl font-black text-indigo-600 mt-1.5">
                      {returnsSummary.return_rate}%
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${returnsSummary.return_rate}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-3 text-left">Username</th>
                          <th className="px-5 py-3 text-left">Full Name</th>
                          <th className="px-5 py-3 text-left">Initial Visit (IST)</th>
                          <th className="px-5 py-3 text-left">Returned Visit (IST)</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {returnsData.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-slate-400 text-xs">
                              No visits recorded in this range.
                            </td>
                          </tr>
                        ) : (
                          returnsData.map((user) => (
                            <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-800">
                                {user.username}
                              </td>
                              <td className="px-5 py-3 text-slate-500">
                                {user.fullname}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                                {user.initial_visit_at ? formatDate(user.initial_visit_at) : "-"}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                                {user.return_visit_at ? formatDate(user.return_visit_at) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  user.returned 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-red-50 text-red-600 border border-red-100"
                                }`}>
                                  {user.returned ? "Returned" : "No Return"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {renderPaginationControls(returnsPagination, setReturnsPage)}
                </div>
              </div>
            )}

            {/* 5. COHORT RETENTION HEAT MAP MATRIX & SIDE-BY-SIDE GRAPH */}
            {activeTab === "retention" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Heatmap Matrix (Left Column) */}
                <div className="flex flex-col bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Retention Cohort Heatmap
                  </h3>
                  {renderRetentionMatrix()}
                </div>

                {/* Graph Curve (Right Column) */}
                <div className="flex flex-col bg-white border border-slate-100 rounded-2xl p-5 shadow-xs min-h-[350px]">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Retention Decay Curves
                  </h3>
                  <div className="grow relative min-h-[280px]">
                    {retentionData.length > 0 ? (
                      <RetentionLineChart data={getRetentionChartData()} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                        No retention data available for graph
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardCardLearnGermanAdvanced;
