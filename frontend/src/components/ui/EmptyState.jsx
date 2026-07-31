export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <div className="rounded-2xl bg-white/5 p-4 text-mist-dim">
          <Icon size={28} />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-mist">{title}</h3>
      {description && <p className="max-w-sm text-sm text-mist-dim">{description}</p>}
      {action}
    </div>
  );
}
