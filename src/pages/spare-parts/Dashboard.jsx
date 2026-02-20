import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
      // Use UTC to ensure consistency with server
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      return utcDate.getTime();
    };

    const getStartOfWeek = (timestamp) => {
      const date = new Date(timestamp);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const monday = new Date(Date.UTC(year, month, diff, 0, 0, 0, 0));
      return monday.getTime();
    };

    const getStartOfMonth = (timestamp) => {
      const date = new Date(timestamp);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      return firstDay.getTime();
    };

    if (timeframe === 'day') {
      // Count for today
      const todayKey = getStartOfDay(now).toString();
      return {
        billing: stats.billingByDay[todayKey] || 0,
        drs: stats.drsByDay[todayKey] || 0,
        emails: stats.emailReportsByDay[todayKey] || 0
      };
    } else if (timeframe === 'week') {
      // Count for this week
      const thisWeekKey = getStartOfWeek(now).toString();
      return {
        billing: stats.billingByWeek[thisWeekKey] || 0,
        drs: stats.drsByWeek[thisWeekKey] || 0,
        emails: stats.emailReportsByWeek[thisWeekKey] || 0
      };
    } else {
      // Count for this month
      const thisMonthKey = getStartOfMonth(now).toString();
      return {
        billing: stats.billingByMonth[thisMonthKey] || 0,
        drs: stats.drsByMonth[thisMonthKey] || 0,
        emails: stats.emailReportsByMonth[thisMonthKey] || 0
      };
    }
  }, [stats, timeframe]);

  // Prepare chart data based on timeframe
  const chartData = useMemo(() => {
    if (!stats) return [];

    const now = Date.now();
    const getStartOfDay = (timestamp) => {
      const date = new Date(timestamp);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      return utcDate.getTime();
    };

    const getStartOfWeek = (timestamp) => {
      const date = new Date(timestamp);
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const monday = new Date(Date.UTC(year, month, diff, 0, 0, 0, 0));
      return monday.getTime();
    };

    const getStartOfMonth = (timestamp) => {
      const date = new Date(timestamp);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      return firstDay.getTime();
    };

    const formatDateLabel = (timestamp, type) => {
      const date = new Date(timestamp);
      if (type === 'day') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (type === 'week') {
        return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };

    let data = [];
    let dataSource = {};
    let billingSource = {};
    let drsSource = {};
    let emailsSource = {};
    let periods = 0;

    if (timeframe === 'day') {
      // Last 7 days
      periods = 7;
      billingSource = stats.billingByDay;
      drsSource = stats.drsByDay;
      emailsSource = stats.emailReportsByDay;
      
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - i);
        const dayKey = getStartOfDay(date.getTime()).toString();
        data.push({
          name: formatDateLabel(date.getTime(), 'day'),
          key: dayKey,
          'Billing Statements': billingSource[dayKey] || 0,
          'DRs Created': drsSource[dayKey] || 0,
          'Email Reports': emailsSource[dayKey] || 0
        });
      }
    } else if (timeframe === 'week') {
      // Last 4 weeks
      periods = 4;
      billingSource = stats.billingByWeek;
      drsSource = stats.drsByWeek;
      emailsSource = stats.emailReportsByWeek;
      
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - (i * 7));
        const weekKey = getStartOfWeek(date.getTime()).toString();
        data.push({
          name: formatDateLabel(date.getTime(), 'week'),
          key: weekKey,
          'Billing Statements': billingSource[weekKey] || 0,
          'DRs Created': drsSource[weekKey] || 0,
          'Email Reports': emailsSource[weekKey] || 0
        });
      }
    } else {
      // Last 6 months
      periods = 6;
      billingSource = stats.billingByMonth;
      drsSource = stats.drsByMonth;
      emailsSource = stats.emailReportsByMonth;
      
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setUTCMonth(date.getUTCMonth() - i);
        const monthKey = getStartOfMonth(date.getTime()).toString();
        data.push({
          name: formatDateLabel(date.getTime(), 'month'),
          key: monthKey,
          'Billing Statements': billingSource[monthKey] || 0,
          'DRs Created': drsSource[monthKey] || 0,
          'Email Reports': emailsSource[monthKey] || 0
        });
      }
    }

    return data;
  }, [stats, timeframe]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500 text-sm">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-500 text-sm">Overview of billing statements, DRs, and email reports</p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setTimeframe('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === 'day'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimeframe('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === 'week'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Last Billing Statement Date */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Billing Statement</span>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900 leading-tight">
                  {stats.lastBillingDate ? formatDate(stats.lastBillingDate) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Billing Statements Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Billing Statements
                </span>
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-1">
                <p className="text-3xl font-semibold text-gray-900">{getRecentCounts.billing}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'This Week' : 'This Month'}
                </p>
              </div>
            </div>
          </div>

          {/* DRs Created Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">DRs Created</span>
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div className="mt-1">
                <p className="text-3xl font-semibold text-gray-900">{getRecentCounts.drs}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'This Week' : 'This Month'}
                </p>
              </div>
            </div>
          </div>

          {/* Email Reports Sent Count */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Reports</span>
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-1">
                <p className="text-3xl font-semibold text-gray-900">{getRecentCounts.emails}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'This Week' : 'This Month'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Trend Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Trends Over Time
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Billing Statements" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="DRs Created" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Email Reports" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Comparison Chart
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="Billing Statements" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DRs Created" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Email Reports" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
