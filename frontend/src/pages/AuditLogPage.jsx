import { useState, useEffect } from 'react';
import api from '../api';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create Record' },
  { value: 'update', label: 'Update Record' },
  { value: 'delete', label: 'Delete Record' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'upload_image', label: 'Upload Image' },
  { value: 'delete_image', label: 'Delete Image' },
  { value: 'register', label: 'Register' },
  { value: 'password_change', label: 'Password Change' },
];

const actionColors = {
  login: 'bg-emerald-500/10 text-emerald-400',
  logout: 'bg-slate-500/10 text-slate-400',
  create: 'bg-sky-500/10 text-sky-400',
  update: 'bg-amber-500/10 text-amber-400',
  delete: 'bg-red-500/10 text-red-400',
  status_change: 'bg-violet-500/10 text-violet-400',
  upload_image: 'bg-cyan-500/10 text-cyan-400',
  delete_image: 'bg-orange-500/10 text-orange-400',
  register: 'bg-teal-500/10 text-teal-400',
  password_change: 'bg-yellow-500/10 text-yellow-400',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (p = 1, action = '') => {
    setLoading(true);
    try {
      let url = `/audit-logs?page=${p}&per_page=20`;
      if (action) url += `&action=${encodeURIComponent(action)}`;
      const data = await api.get(url);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, actionFilter);
  }, []);

  const handleFilterChange = (e) => {
    const val = e.target.value;
    setActionFilter(val);
    setPage(1);
    fetchLogs(1, val);
  };

  const goToPage = (p) => {
    setPage(p);
    fetchLogs(p, actionFilter);
  };

  return (
    <section className="p-8 max-w-7xl mx-auto">
      <div className="mt-12 mb-10">
        <h2 className="text-3xl font-extrabold font-[Plus_Jakarta_Sans] tracking-tight text-on-surface mb-2">Activity Log</h2>
        <p className="text-on-surface-variant font-medium">Track all system actions and changes.</p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-semibold text-on-surface-variant">Filter by action:</label>
        <select
          value={actionFilter}
          onChange={handleFilterChange}
          className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">history</span>
          <p className="text-lg font-medium">No audit logs found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high/50">
                <th className="text-left px-5 py-3.5 text-on-surface-variant font-semibold">Timestamp</th>
                <th className="text-left px-5 py-3.5 text-on-surface-variant font-semibold">Action</th>
                <th className="text-left px-5 py-3.5 text-on-surface-variant font-semibold">User</th>
                <th className="text-left px-5 py-3.5 text-on-surface-variant font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-5 py-3.5 text-on-surface-variant whitespace-nowrap font-mono text-xs">{log.timestamp}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${actionColors[log.action] || 'bg-slate-500/10 text-slate-400'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface font-medium">{log.username || '—'}</td>
                  <td className="px-5 py-3.5 text-on-surface-variant">{log.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-surface-container border border-outline-variant text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-on-surface-variant font-medium px-3">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= pagination.total_pages}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-surface-container border border-outline-variant text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
