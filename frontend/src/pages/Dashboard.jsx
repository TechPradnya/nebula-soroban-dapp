import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Briefcase, Layers, Coins } from 'lucide-react';
import { api } from '../services/api';
import GlassCard from '../components/ui/GlassCard.jsx';
import { StatCardSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';

const PIE_COLORS = ['#4F46E5', '#22D3EE', '#F5A623', '#7D82A0', '#EF4444', '#34D399'];

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <GlassCard className="p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-mist-dim">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
    </GlassCard>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get('/stats/overview');
      setOverview(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useRealtime(['marketplace:event'], () => load());

  const totalTasks = overview?.statusCounts.reduce((sum, s) => sum + s.count, 0) || 0;
  const completed = overview?.statusCounts.find((s) => s._id === 'completed')?.count || 0;
  const open = overview?.statusCounts.find((s) => s._id === 'open')?.count || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Welcome back{user ? `, ${user.displayName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-mist-dim">Here&rsquo;s what&rsquo;s moving across the marketplace right now.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Briefcase} label="Total tasks" value={totalTasks} accent="text-indigo-soft" />
            <StatCard icon={TrendingUp} label="Completed" value={completed} accent="text-emerald-400" />
            <StatCard icon={Layers} label="Open right now" value={open} accent="text-cyan" />
            <StatCard icon={Coins} label="Categories active" value={overview?.categoryCounts.length || 0} accent="text-amber" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-display font-semibold text-white">Completed task volume</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.dailyVolume || []}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#7D82A0" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7D82A0" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#181B2A',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#22D3EE" fill="url(#volumeFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 font-display font-semibold text-white">By category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overview?.categoryCounts || []}
                  dataKey="count"
                  nameKey="_id"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {(overview?.categoryCounts || []).map((entry, i) => (
                    <Cell key={entry._id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#181B2A',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
