import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import StatusPill from '../ui/StatusPill.jsx';
import { formatXlm } from '../../utils/format.js';

export default function TaskCard({ task }) {
  return (
    <GlassCard
      as={Link}
      to={`/marketplace/${task.onChainId}`}
      hover
      className="flex flex-col gap-4 p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-white line-clamp-1">{task.title}</h3>
        <StatusPill status={task.status} />
      </div>
      <p className="line-clamp-2 text-sm text-mist-dim">{task.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {task.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="pill text-[11px] text-mist-dim">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1.5 font-mono text-sm text-amber">
          <Coins size={14} aria-hidden="true" />
          {formatXlm(task.amount)} XLM
        </span>
        <span className="text-xs capitalize text-mist-dim">{task.category}</span>
      </div>
    </GlassCard>
  );
}
