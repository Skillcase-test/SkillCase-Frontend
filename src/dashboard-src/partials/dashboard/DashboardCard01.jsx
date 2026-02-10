import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LineChart from '../../charts/LineChart01';
import { chartAreaGradient } from '../../charts/ChartjsConfig';
import EditMenu from '../../components/DropdownEditMenu';
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';
import api from '../../../api/axios';

function DashboardCard01() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState('all'); // 'all', 'A1', 'A2'

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/analytics/new-user-analytics');
        const data = await response.data;
        setRawData(data.result || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching user analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Filter data based on selected level
  const filteredData = useMemo(() => {
    if (levelFilter === 'all') return rawData;
    return rawData.filter(user => {
      const level = (user.current_profeciency_level || '').toUpperCase();
      return level === levelFilter;
    });
  }, [rawData, levelFilter]);

  // Compute app/web counts
  const sourceCounts = useMemo(() => {
    let app = 0, web = 0;
    filteredData.forEach(user => {
      if (user.signup_source === 'app') app++;
      else web++;
    });
    return { app, web };
  }, [filteredData]);

  // Process chart data from filtered results
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    const usersByDate = filteredData.reduce((acc, user) => {
      const date = new Date(user.created_at).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const sortedDates = Object.keys(usersByDate).sort((a, b) => new Date(a) - new Date(b));
    const counts = sortedDates.map(date => usersByDate[date]);

    const lineColor = levelFilter === 'A2'
      ? getCssVariable('--color-emerald-500') || '#10b981'
      : getCssVariable('--color-blue-500');

    return {
      labels: sortedDates,
      datasets: [
        {
          data: counts,
          fill: true,
          backgroundColor: function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(lineColor, 0) },
              { stop: 1, color: adjustColorOpacity(lineColor, 0.2) }
            ]);
          },
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: lineColor,
          pointHoverBackgroundColor: lineColor,
          pointBorderWidth: 0,
          pointHoverBorderWidth: 0,
          clip: 20,
          tension: 0.2,
        },
      ],
    };
  }, [filteredData, levelFilter]);

  const calculateGrowth = () => {
    if (filteredData.length === 0) return 0;
    const now = new Date();
    const halfMonthAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    const recentUsers = filteredData.filter(
      user => new Date(user.created_at) >= halfMonthAgo
    ).length;
    const olderUsers = filteredData.length - recentUsers;
    if (olderUsers === 0) return 100;
    return Math.round(((recentUsers - olderUsers) / olderUsers) * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  const growthPercentage = calculateGrowth();

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            New Users
          </h2>
          <div className="flex items-center gap-2">
            {/* A1/A2 Toggle */}
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setLevelFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  levelFilter === 'all'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLevelFilter('A1')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  levelFilter === 'A1'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                A1
              </button>
              <button
                onClick={() => setLevelFilter('A2')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  levelFilter === 'A2'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                A2
              </button>
            </div>
            <EditMenu align="right" className="relative inline-flex">
              <li>
                <Link className="font-medium text-sm text-gray-600 hover:text-gray-800 flex py-1 px-3" to="#0">
                  Refresh
                </Link>
              </li>
            </EditMenu>
          </div>
        </header>
        <div className="text-xs font-semibold text-gray-400 uppercase mb-1">
          Last 30 Days
        </div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 mr-2">
            {filteredData.length}
          </div>
          <div className={`text-sm font-medium px-1.5 rounded-full ${
            growthPercentage >= 0 
              ? 'text-green-700 bg-green-500/20' 
              : 'text-red-700 bg-red-500/20'
          }`}>
            {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
          </div>
        </div>
        {/* App/Web Breakdown */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-500"></div>
            <span className="text-xs text-gray-500">App: <span className="font-semibold text-gray-700">{sourceCounts.app}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs text-gray-500">Web: <span className="font-semibold text-gray-700">{sourceCounts.web}</span></span>
          </div>
        </div>
      </div>
      {chartData && (
        <div className="grow max-sm:max-h-[128px] xl:max-h-[128px]">
          <LineChart data={chartData} width={389} height={128} />
        </div>
      )}
    </div>
  );
}

export default DashboardCard01;

