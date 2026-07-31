const STYLES = {
  open: 'text-cyan border-cyan/30 bg-cyan/5',
  in_progress: 'text-indigo-soft border-indigo-soft/30 bg-indigo-soft/5',
  submitted: 'text-amber border-amber/30 bg-amber/5',
  completed: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  cancelled: 'text-mist-dim border-white/10 bg-white/5',
  disputed: 'text-red-400 border-red-400/30 bg-red-400/5',
  resolved: 'text-mist border-white/10 bg-white/5',
};

const LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  resolved: 'Resolved',
};

export default function StatusPill({ status }) {
  return (
    <span className={`pill border ${STYLES[status] || STYLES.resolved}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
