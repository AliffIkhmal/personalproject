import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import FloatingInput from '../components/ui/FloatingInput';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  // Modals
  const [roleOpen, setRoleOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [target, setTarget] = useState(null);

  // Forms
  const [newRole, setNewRole] = useState('technician');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTechnicians = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page, per_page: 20 });
      if (search.trim()) params.append('q', search.trim());
      const data = await api.get(`/technicians?${params}`);
      setTechnicians(data.technicians);
      setPagination(data.pagination);
    } catch {
      addToast('Failed to load technicians.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, search]);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openRoleModal = (tech) => {
    setTarget(tech);
    setNewRole(tech.role === 'admin' ? 'technician' : 'admin');
    setRoleOpen(true);
  };

  const openResetModal = (tech) => {
    setTarget(tech);
    setNewPassword('');
    setConfirmPassword('');
    setResetOpen(true);
  };

  const openDeleteModal = (tech) => {
    setTarget(tech);
    setDeleteOpen(true);
  };

  const handleRoleChange = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/technicians/${target.id}/role`, { role: newRole });
      addToast(`Role updated to "${newRole}".`, 'success');
      setRoleOpen(false);
      fetchTechnicians();
    } catch (err) {
      addToast(err.error || 'Failed to update role.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { addToast('Password must be at least 6 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { addToast('Passwords do not match.', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post(`/technicians/${target.id}/reset-password`, { new_password: newPassword, confirm_password: confirmPassword });
      addToast(`Password reset for "${target.username}".`, 'success');
      setResetOpen(false);
    } catch (err) {
      addToast(err.error || 'Failed to reset password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/technicians/${target.id}`);
      addToast(`Technician "${target.username}" deleted.`, 'success');
      setDeleteOpen(false);
      fetchTechnicians();
    } catch (err) {
      addToast(err.error || 'Failed to delete technician.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Manage Technicians</h2>
        <p className="text-on-surface-variant mt-1 font-medium">View, edit roles, reset passwords, and remove accounts.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 dark:text-slate-500 text-xl">search</span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, username, or email..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-950/20 overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-[0.15em] font-extrabold text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Records</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block">group_off</span>
                    <p className="font-semibold">No technicians found</p>
                  </td>
                </tr>
              ) : (
                technicians.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.profile_picture ? (
                          <img src={`/static/uploads/${t.profile_picture}`} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-sky-600/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sky-400 text-lg">{t.role === 'admin' ? 'admin_panel_settings' : 'engineering'}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-on-surface">{t.display_name || t.username}</p>
                          {t.display_name && <p className="text-xs text-slate-400 dark:text-slate-500">@{t.username}</p>}
                          {t.email && <p className="text-xs text-slate-400 dark:text-slate-500">{t.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        t.role === 'admin' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      }`}>{t.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t.records_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.created_at || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => openRoleModal(t)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all" title="Change Role">
                          <span className="material-symbols-outlined text-lg">swap_horiz</span>
                        </button>
                        <button onClick={() => openResetModal(t)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all" title="Reset Password">
                          <span className="material-symbols-outlined text-lg">lock_reset</span>
                        </button>
                        <button onClick={() => openDeleteModal(t)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all" title="Delete Technician">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-all">
                Previous
              </button>
              <button disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== CHANGE ROLE MODAL ====== */}
      <Modal open={roleOpen} onClose={() => setRoleOpen(false)} title="Change Role">
        {target && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Change <span className="font-bold">{target.username}</span>'s role from{' '}
              <span className="font-bold">{target.role}</span> to{' '}
              <span className="font-bold">{newRole}</span>?
            </p>
            <div className="flex gap-4">
              {[{ value: 'technician', label: 'Technician', icon: 'engineering' }, { value: 'admin', label: 'Admin', icon: 'admin_panel_settings' }].map((r) => (
                <label key={r.value} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  newRole === r.value ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-500/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-sky-100 dark:hover:border-sky-500/20'
                }`}>
                  <input type="radio" name="newRole" className="hidden" checked={newRole === r.value} onChange={() => setNewRole(r.value)} />
                  <span className={`material-symbols-outlined ${newRole === r.value ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>{r.icon}</span>
                  <span className={`text-xs font-bold ${newRole === r.value ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRoleOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
              <button onClick={handleRoleChange} disabled={submitting || newRole === target.role}
                className="px-5 py-2 text-sm font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all">
                {submitting ? 'Saving...' : 'Update Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ====== RESET PASSWORD MODAL ====== */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Password">
        {target && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Set a new password for <span className="font-bold">{target.username}</span>.
            </p>
            <FloatingInput label="New Password" icon="lock" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <FloatingInput label="Confirm Password" icon="shield" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setResetOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 text-sm font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all">
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Technician">
        {target && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-bold text-red-500">{target.username}</span>?
              Their service records will be reassigned to you.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={submitting}
                className="px-5 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all">
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
