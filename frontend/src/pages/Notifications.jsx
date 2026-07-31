import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useRealtime } from '../hooks/useRealtime.js';
import { useAuth } from '../context/AuthContext.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  async function load() {
    const res = await api.get('/notifications', { auth: true });
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useRealtime(user ? [user._id] : [], () => load());

  async function markAllRead() {
    await api.patch('/notifications/read-all', {}, { auth: true });
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
        {items.some((n) => !n.read) && (
          <button onClick={markAllRead} className="btn-secondary py-2 text-xs">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New task activity will show up here in real time." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <GlassCard key={n._id} className={`p-4 ${!n.read ? 'border-cyan/20' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-mist-dim">{n.body}</p>}
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan" />}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
