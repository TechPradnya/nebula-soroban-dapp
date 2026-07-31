import { useEffect, useState } from 'react';
import { Search, Plus, ShoppingBag } from 'lucide-react';
import { useTasks } from '../hooks/useTasks.js';
import { useRealtime } from '../hooks/useRealtime.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import TaskCard from '../components/marketplace/TaskCard.jsx';
import CreateTaskModal from '../components/marketplace/CreateTaskModal.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { TaskCardSkeleton } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUSES = ['', 'open', 'in_progress', 'submitted', 'completed'];
const CATEGORIES = ['', 'development', 'design', 'writing', 'marketing', 'data', 'other'];
const PAGE_SIZE = 12;

export default function Marketplace() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();

  const search = useDebouncedValue(searchInput, 350);

  // Any filter change should snap back to page 1 — staying on page 4 of a
  // now-empty filter result would just show a confusing blank state.
  useEffect(() => {
    setPage(1);
  }, [search, status, category]);

  const { tasks, pagination, loading, refetch } = useTasks({
    search,
    status,
    category,
    page,
    limit: PAGE_SIZE,
  });
  useRealtime(['marketplace:event'], () => refetch());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-sm text-mist-dim">Escrowed tasks, open right now.</p>
        </div>
        {user && (
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} aria-hidden="true" /> Post a task
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3" role="search">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-dim" aria-hidden="true" />
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <input
            id="task-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks…"
            className="input-field pl-9"
          />
        </div>
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field w-auto capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace('_', ' ') : 'Any status'}
            </option>
          ))}
        </select>
        <label htmlFor="category-filter" className="sr-only">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field w-auto capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c || 'Any category'}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading tasks…</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No tasks match yet"
          description="Try a different search or check back soon — new escrowed tasks land here in real time."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {tasks.map((task) => (
              <TaskCard key={task.onChainId} task={task} />
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      <CreateTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refetch} />
    </div>
  );
}
