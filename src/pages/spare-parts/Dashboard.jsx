import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const Dashboard = () => {
  const [timeframe, setTimeframe] = useState('day');
  const stats = useQuery(api.billing.getDashboardStats);

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to get recent counts
  const getRecentCounts = useMemo(() => {
    if (!stats) return { billing: 0, drs: 0, emails: 0 };

    const now = Date.now();

    const getStartOfDay = (timestamp) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    };

    const getStartOfWeek = (timestamp) => {
      const date = new Date(timestamp);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };

    if (timeframe === 'day') {
      // Count for today
      const todayKey = getStartOfDay(now).toString();
      return {
        billing: stats.billingByDay[todayKey] || 0,
        drs: stats.drsByDay[todayKey] || 0,
        emails: stats.emailReportsByDay[todayKey] || 0
      };
    } else {
      // Count for this week
      const thisWeekKey = getStartOfWeek(now).toString();
      return {
        billing: stats.billingByWeek[thisWeekKey] || 0,
        drs: stats.drsByWeek[thisWeekKey] || 0,
        emails: stats.emailReportsByWeek[thisWeekKey] || 0
      };
    }
  }, [stats, timeframe]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('day')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeframe === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeframe === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Last Billing Statement Date */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Last Billing Statement</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.lastBillingDate ? formatDate(stats.lastBillingDate) : 'N/A'}
          </p>
        </div>

        {/* Billing Statements Count */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Billing Statements ({timeframe === 'day' ? 'Today' : 'This Week'})
            </h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-600">{getRecentCounts.billing}</p>
        </div>

        {/* DRs Created Count */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              DRs Created ({timeframe === 'day' ? 'Today' : 'This Week'})
            </h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-green-600">{getRecentCounts.drs}</p>
        </div>

        {/* Email Reports Sent Count */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Email Reports Sent ({timeframe === 'day' ? 'Today' : 'This Week'})
            </h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-purple-600">{getRecentCounts.emails}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
