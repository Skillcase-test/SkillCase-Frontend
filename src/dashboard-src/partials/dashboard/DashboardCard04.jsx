import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
function DashboardCard04() {
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInteractions = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/analytics/prev-month-user-completetion-analytics');

        const data = await response.data;
        console.log(data)
        setUserData(data.slice(0, 10)); // Top 10 users
        setError(null);
      } catch (err) {
        console.error('Error fetching user interactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInteractions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-gray-500 ">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col col-span-full sm:col-span-6 bg-white  shadow-xs rounded-xl p-5">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 bg-white  shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 ">
        <h2 className="font-semibold text-gray-800 ">
          Top User Interactions
        </h2>
      </header>
      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-500  bg-gray-50  border-t border-b border-gray-200 ">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">Rank</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-left">
                  <div className="font-semibold">User ID</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Submissions</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                  <div className="font-semibold">Completion Rate</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-200 ">
              {userData.map((user, index) => (
                <tr key={user.user_id} className="hover:bg-gray-50 ">
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        index === 0 ? 'bg-blue-500 text-white' :
                        index === 1 ? 'bg-blue-400 text-white' :
                        index === 2 ? 'bg-blue-300 text-white' :
                        'bg-gray-200  text-gray-600 '
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-800 ">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="font-medium text-gray-800 ">
                        {user.submission_count}
                      </div>
                      <div className="h-2 bg-gray-200  rounded-full overflow-hidden" style={{ width: '60px' }}>
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (user.submission_count / Math.max(...userData.map(u => u.submission_count))) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="font-medium text-gray-800 ">
                        {parseFloat(user.completion_rate).toFixed(1)}%
                      </div>
                      <div className="h-2 bg-gray-200  rounded-full overflow-hidden" style={{ width: '60px' }}>
                        <div 
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${user.completion_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardCard04;
