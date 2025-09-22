import React from 'react';
import MetricGrid from '../../components/dashboard/MetricGrid';
import StatsCard from '../../components/dashboard/StatsCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import EngagementChart from '../../components/dashboard/EngagementChart';

const AdminDashboardPage = () => {
  // Mock data - to be replaced with API calls
  const metrics = [
    {
      id: 'users',
      label: 'Total Users',
      value: '12,487',
      trend: 8.4,
      description: 'Active user accounts on the platform',
      sparkline: [15, 22, 18, 28, 35, 30, 40, 42, 38, 45],
      footer: <span>New today: <strong className="text-purple-200">152</strong></span>,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V10h-5M9 20H4V4h16v6M9 14h6" />
        </svg>
      ),
    },
    {
      id: 'posts',
      label: 'Total Posts',
      value: '183,920',
      trend: 3.2,
      description: 'All posts including comments and shares',
      sparkline: [30, 28, 32, 35, 38, 37, 40, 42, 45, 49],
      footer: <span>Today: <strong className="text-purple-200">4,218</strong></span>,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v7a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
    {
      id: 'engagement',
      label: 'Engagement Rate',
      value: '4.28%',
      trend: 1.6,
      description: 'Daily active users interacting with content',
      sparkline: [8, 10, 9, 12, 11, 13, 12, 14, 13, 15],
      footer: <span>Target: <strong className="text-purple-200">5.0%</strong></span>,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M8 17l4-4 4 4m0 0l-4-4 4-4" />
        </svg>
      ),
    },
    {
      id: 'reports',
      label: 'Pending Reports',
      value: '342',
      trend: -5.1,
      description: 'Open content/user reports pending review',
      sparkline: [55, 52, 50, 48, 47, 45, 44, 42, 41, 40],
      footer: <span>Resolved today: <strong className="text-purple-200">68</strong></span>,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const activityItems = [
    {
      id: '1',
      type: 'system',
      actor: 'System',
      time: '2m ago',
      content: 'Daily analytics processing completed',
      meta: { duration: '32s', records: '12.4K' },
    },
    {
      id: '2',
      type: 'report',
      actor: 'Moderator',
      time: '8m ago',
      content: 'Reviewed user report #48327 (content removed)',
      meta: { category: 'harassment' },
    },
    {
      id: '3',
      type: 'post',
      actor: 'alice_dev',
      time: '15m ago',
      content: 'Created a new post in #webdev trending to 350 users',
      meta: { likes: 24, shares: 6 },
    },
    {
      id: '4',
      type: 'follow',
      actor: 'new_user_84',
      time: '22m ago',
      content: 'Followed 7 content creators after signup',
      meta: { suggestions: 'enabled' },
    },
    {
      id: '5',
      type: 'share',
      actor: 'marketing_bot',
      time: '30m ago',
      content: 'Shared promotional content across 3 communities',
      meta: { reach: '2.3K' },
    },
    {
      id: '6',
      type: 'comment',
      actor: 'dev_jim',
      time: '42m ago',
      content: 'Commented on post #123543 in #react',
      meta: { replies: 3 },
    },
  ];

  const engagementData = [15, 18, 21, 17, 23, 25, 21, 28, 32, 30, 34, 37];
  const engagementLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const miniStats = [
    { id: 'auth', title: 'Auth Success', value: '98.2%', change: 0.4, variant: 'green', tooltip: 'Last 24h' },
    { id: 'latency', title: 'Avg API Latency', value: '182ms', change: -3.1, variant: 'blue', tooltip: 'All endpoints' },
    { id: 'errors', title: 'Error Rate', value: '0.42%', change: -0.08, variant: 'orange', tooltip: '500 responses' },
    { id: 'queue', title: 'Job Queue', value: '43', change: 12.5, variant: 'pink', tooltip: 'Background jobs' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent tracking-tight">
            Platform Analytics
          </h1>
          <p className="mt-2 text-gray-400 max-w-2xl text-sm leading-relaxed">
            High-level overview of platform health, user engagement, and moderation pipeline.
            All metrics update in near real-time and support drill-down analysis.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:space-x-4">
          {miniStats.map(s => (
            <StatsCard key={s.id} {...s} loading={false} />
          ))}
        </div>
      </div>

      <MetricGrid metrics={metrics} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EngagementChart data={engagementData} labels={engagementLabels} />
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Recent Activity</h3>
            <button className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              View all
            </button>
          </div>
          <ActivityTimeline items={activityItems} limit={6} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Moderation Queue</h3>
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex-1 pr-4">
                  <div className="text-xs font-medium text-purple-300 mb-1">Report #{48200 + i}</div>
                  <div className="text-xs text-gray-300 mb-1">Potential harassment in post by <span className="text-white font-medium">user_{120 + i}</span></div>
                  <div className="flex items-center space-x-3 text-[10px] text-gray-500">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">harassment</span>
                    <span>7 flags</span>
                    <span>2h 13m</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <button className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">Approve</button>
                  <button className="text-[10px] px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">System Health</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'API Uptime', value: '99.98%', status: 'good' },
              { label: 'DB Latency', value: '23ms', status: 'good' },
              { label: 'Cache Hit Rate', value: '87%', status: 'warn' },
              { label: 'Error Rate', value: '0.42%', status: 'good' },
              { label: 'Message Queue', value: '43 pending', status: 'warn' },
              { label: 'Background Jobs', value: '12 active', status: 'good' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{s.label}</div>
                  <div className={
                    s.status === 'good' ? 'w-2 h-2 rounded-full bg-emerald-400' :
                    s.status === 'warn' ? 'w-2 h-2 rounded-full bg-amber-400 animate-pulse' :
                    'w-2 h-2 rounded-full bg-rose-400'
                  } />
                </div>
                <div className="text-sm font-semibold text-gray-200">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;