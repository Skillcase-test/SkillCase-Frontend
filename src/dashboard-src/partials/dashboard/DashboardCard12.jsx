import { useState, useEffect } from 'react';

import api from '../../../api/axios';

import { Users, Activity } from 'lucide-react';

function DashboardCard12() {
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchActiveUsers();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchActiveUsers();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchActiveUsers = async () => {
    try {
      const response = await api.get('/admin/analytics/active-users-now');
      setActiveUsers(response.data.activeUsersNow);
      setError(null);
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-3 bg-white shadow-xs rounded-xl">
      <div className="px-5 py-5">
        <header className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Active Now</h2>
          <Activity className="w-5 h-5 text-green-500 animate-pulse" />
        </header>
        
        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-gray-400" />
          {loading ? (
            <div className="text-3xl font-bold text-gray-400">--</div>
          ) : error ? (
            <div className="text-sm text-red-500">Error</div>
          ) : (
            <div className="text-4xl font-bold text-green-600">
              {activeUsers}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 mt-2">
          Live users on web & app
        </div>
        
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Updates every 10s</span>
        </div>
      </div>
    </div>
  );
}
export default DashboardCard12;