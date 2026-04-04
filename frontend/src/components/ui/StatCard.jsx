const colorMap = {
  indigo: { border: 'border-sky-500', iconBg: 'bg-sky-50 dark:bg-sky-500/10', iconText: 'text-sky-600', badge: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconText: 'text-amber-600', badge: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-500/10', iconText: 'text-blue-600', badge: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  emerald: { border: 'border-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconText: 'text-emerald-600', badge: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
};

export default function StatCard({ icon, label, value, badgeText, color = 'indigo' }) {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm dark:shadow-slate-950/20 border-l-4 ${c.border} hover:shadow-md transition-shadow group`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${c.iconBg} rounded-lg ${c.iconText} group-hover:scale-110 transition-transform`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        {badgeText && (
          <span className={`text-[10px] font-bold tracking-wider uppercase ${c.badge} px-2 py-0.5 rounded`}>{badgeText}</span>
        )}
      </div>
      <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-3xl font-headline font-extrabold text-on-surface">{value}</p>
    </div>
  );
}
