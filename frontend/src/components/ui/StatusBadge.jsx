const statusConfig = {
  pending: { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', label: 'Queued' },
  in_progress: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700 dark:text-amber-300', label: 'In Progress' },
  completed: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: 'Completed' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
    </div>
  );
}
