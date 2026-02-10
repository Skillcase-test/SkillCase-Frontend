import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EditMenu from '../../components/DropdownEditMenu';
import api from '../../../api/axios';
function DashboardCard03() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [a1Count, setA1Count] = useState(0);
  const [a2Count, setA2Count] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/analytics/user-count');


        const data = await response.data;
        setTotalUsers(data.count);
        setA1Count(data.a1Count || 0);
        setA2Count(data.a2Count || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching total users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalUsers();
  }, []);

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

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white  shadow-xs rounded-xl">
      <div className="px-5 pt-5 pb-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800  mb-2">
            Total Users
          </h2>
          {/* Menu button */}
          <EditMenu align="right" className="relative inline-flex">
            <li>
              <Link className="font-medium text-sm text-gray-600  hover:text-gray-800  flex py-1 px-3" to="#0">
                Refresh
              </Link>
            </li>
            <li>
              <Link className="font-medium text-sm text-gray-600  hover:text-gray-800  flex py-1 px-3" to="#0">
                View All Users
              </Link>
            </li>
            <li>
              <Link className="font-medium text-sm text-red-500 hover:text-red-600 flex py-1 px-3" to="#0">
                Remove
              </Link>
            </li>
          </EditMenu>
        </header>
        <div className="text-xs font-semibold text-gray-400  uppercase mb-1">
          All Time
        </div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800  mr-2">
            {totalUsers.toLocaleString()}
          </div>
        </div>
        
        {/* A1/A2 Breakdown */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
              A1
            </div>
            <div className="text-lg font-bold text-gray-800">
              {Number(a1Count).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-1">
              A2
            </div>
            <div className="text-lg font-bold text-gray-800">
              {Number(a2Count).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardCard03;
