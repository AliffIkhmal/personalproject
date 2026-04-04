import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';

const SERVICE_TYPES = ['Major Service', 'Minor Service'];
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const emptyForm = {
  vehicle_name: '', license_plate: '', service_type: 'Major Service',
  status: 'pending', customer_name: '', customer_phone: '',
  estimated_completion: '', notes: '',
};

export default function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Forms
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ ...emptyForm, id: null });
  const [updateForm, setUpdateForm] = useState({ id: null, status: '', note: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  const { addToast } = useToast();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get(`/dashboard?page=${page}&per_page=${perPage}`);
      setRecords(data.records);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch {
      addToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, perPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time: auto-refresh when any client updates records
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchData();
    socket.on('records_updated', handler);
    return () => socket.off('records_updated', handler);
  }, [socket, fetchData]);

  // Filtering
  const filteredRecords = filter === 'all' ? records : records.filter((r) => r.status === filter);

  // Sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortCol) return 0;
    let va = a[sortCol] || '';
    let vb = b[sortCol] || '';
    if (sortCol === 'estimated_completion') {
      va = va || 'zzz';
      vb = vb || 'zzz';
    }
    const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  // Add record
  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      imageFiles.forEach((f) => formData.append('images', f));
      await api.upload('/records', formData);
      addToast('Record created!', 'success');
      setAddOpen(false);
      setForm(emptyForm);
      setImageFiles([]);
      fetchData();
    } catch (err) {
      addToast(err.error || 'Failed to create record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit record
  const openEdit = (r) => {
    setEditForm({
      id: r.id, vehicle_name: r.vehicle_name, license_plate: r.license_plate,
      service_type: r.service_type, status: r.status,
      customer_name: r.customer_name || '', customer_phone: r.customer_phone || '',
      estimated_completion: r.estimated_completion || '', notes: r.notes || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { id, ...body } = editForm;
      await api.put(`/records/${id}`, body);
      addToast('Record updated!', 'success');
      setEditOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.error || 'Failed to update record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Update status
  const openUpdate = (r) => {
    setUpdateForm({ id: r.id, status: r.status, note: '' });
    setUpdateOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/records/${updateForm.id}/status`, { status: updateForm.status, note: updateForm.note });
      addToast('Status updated!', 'success');
      setUpdateOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.error || 'Failed to update status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const openDelete = (r) => {
    setDeleteTarget(r);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/records/${deleteTarget.id}`);
      addToast('Record deleted.', 'success');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      addToast(err.error || 'Failed to delete.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All Records' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'pending', label: 'Queued' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="analytics" label="Total Records" value={stats.total} badgeText="Active Fleet" color="indigo" />
        <StatCard icon="build" label="In Progress" value={stats.active} badgeText="Priority" color="amber" />
        <StatCard icon="schedule" label="Queued" value={stats.pending} badgeText="Waitlist" color="blue" />
        <StatCard icon="check_circle" label="Completed" value={stats.completed} badgeText="Dispatched" color="emerald" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low p-4 rounded-xl">
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {filterButtons.map((fb) => (
            <button
              key={fb.key}
              onClick={() => setFilter(fb.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filter === fb.key
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm dark:hover:shadow-slate-950/20'
              }`}
            >
              {fb.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setForm(emptyForm); setImageFiles([]); setAddOpen(true); }}
          className="flex items-center gap-2 indigo-pulse text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Add New Record
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-950/20 overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-[0.15em] font-extrabold text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 cursor-pointer select-none" onClick={() => toggleSort('vehicle_name')}>Vehicle Name{sortArrow('vehicle_name')}</th>
                <th className="px-6 py-4 cursor-pointer select-none" onClick={() => toggleSort('license_plate')}>Plate Number{sortArrow('license_plate')}</th>
                <th className="px-6 py-4">Service Type</th>
                <th className="px-6 py-4">Status</th>
                {isAdmin && <th className="px-6 py-4">Technician</th>}
                <th className="px-6 py-4 cursor-pointer select-none" onClick={() => toggleSort('estimated_completion')}>Est. Completion{sortArrow('estimated_completion')}</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
                    <p className="font-semibold">No records found</p>
                    <p className="text-xs mt-1">Add a new service record to get started.</p>
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors">
                          <span className="material-symbols-outlined text-lg">directions_car</span>
                        </div>
                        <span className="text-sm font-bold text-on-surface">{r.vehicle_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{r.license_plate}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.technician_name || '—'}</span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        r.service_type === 'Major Service'
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20'
                          : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-500/20'
                      }`}>{r.service_type}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.estimated_completion || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => navigate(`/record/${r.id}`)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all" title="View">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all" title="Edit">
                          <span className="material-symbols-outlined text-lg">edit_note</span>
                        </button>
                        {r.status !== 'completed' && (
                          <button onClick={() => openUpdate(r)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all" title="Update Status">
                            <span className="material-symbols-outlined text-lg">history</span>
                          </button>
                        )}
                        <button onClick={() => openDelete(r)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
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
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Showing {sortedRecords.length} of {pagination.total} vehicles &middot; Page {pagination.page || 1} of {pagination.total_pages || 1}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            {Array.from({ length: pagination.total_pages || 1 }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === (pagination.total_pages || 1) || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-slate-400 dark:text-slate-500 text-xs">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === p ? 'bg-sky-500 text-white shadow-sm dark:shadow-slate-950/20' : 'text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-300'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              disabled={page >= (pagination.total_pages || 1)}
              onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====== ADD RECORD MODAL ====== */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Service Record" subtitle="Enter vehicle and service details.">
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Vehicle Model</label>
              <input value={form.vehicle_name} onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })} required
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none font-semibold" placeholder="e.g. BMW M3" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Plate Number</label>
              <input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })} required
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none font-semibold uppercase" placeholder="ABC-1234" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Service Type</label>
            <div className="flex gap-4">
              {SERVICE_TYPES.map((t) => (
                <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.service_type === t ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-500/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-sky-100 dark:hover:border-sky-500/20 hover:bg-white dark:hover:bg-slate-700'
                }`}>
                  <input type="radio" name="stype" className="hidden" checked={form.service_type === t} onChange={() => setForm({ ...form, service_type: t })} />
                  <span className={`material-symbols-outlined ${form.service_type === t ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>{t === 'Major Service' ? 'build' : 'settings'}</span>
                  <span className={`text-xs font-bold ${form.service_type === t ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Est. Completion</label>
              <input type="date" value={form.estimated_completion} onChange={(e) => setForm({ ...form, estimated_completion: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Customer Name</label>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Phone</label>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" placeholder="Service details..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Images (optional, multiple)</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles([...e.target.files])}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 dark:file:bg-sky-500/10 file:text-sky-700 dark:file:text-sky-300 dark:bg-sky-500/10 dark:text-sky-300 hover:file:bg-sky-100 dark:hover:file:bg-sky-500/20" />
            {imageFiles.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 px-1">{imageFiles.length} file{imageFiles.length > 1 ? 's' : ''} selected</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? 'Creating...' : 'Register Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====== EDIT RECORD MODAL ====== */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Service Record" subtitle="Update vehicle and service details.">
        <form onSubmit={handleEdit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Vehicle Model</label>
              <input value={editForm.vehicle_name} onChange={(e) => setEditForm({ ...editForm, vehicle_name: e.target.value })} required
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Plate Number</label>
              <input value={editForm.license_plate} onChange={(e) => setEditForm({ ...editForm, license_plate: e.target.value.toUpperCase() })} required
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none font-semibold uppercase" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Service Type</label>
            <div className="flex gap-4">
              {SERVICE_TYPES.map((t) => (
                <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  editForm.service_type === t ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-500/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-sky-100 dark:hover:border-sky-500/20 hover:bg-white dark:hover:bg-slate-700'
                }`}>
                  <input type="radio" className="hidden" checked={editForm.service_type === t} onChange={() => setEditForm({ ...editForm, service_type: t })} />
                  <span className={`material-symbols-outlined ${editForm.service_type === t ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>{t === 'Major Service' ? 'build' : 'settings'}</span>
                  <span className={`text-xs font-bold ${editForm.service_type === t ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Est. Completion</label>
              <input type="date" value={editForm.estimated_completion} onChange={(e) => setEditForm({ ...editForm, estimated_completion: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Customer Name</label>
              <input value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Phone</label>
              <input value={editForm.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====== UPDATE STATUS MODAL ====== */}
      <Modal isOpen={updateOpen} onClose={() => setUpdateOpen(false)} title="Update Status" subtitle="Change the current service status.">
        <form onSubmit={handleUpdateStatus} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">New Status</label>
            <select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Note (optional)</label>
            <textarea value={updateForm.note} onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })} rows={3}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" placeholder="Add a status update note..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUpdateOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Deletion" subtitle="This action cannot be undone.">
        {deleteTarget && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
              <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
              <div>
                <p className="font-bold text-on-surface">{deleteTarget.vehicle_name}</p>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{deleteTarget.license_plate}</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">Are you sure you want to permanently delete this service record? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={submitting}
                className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60">
                {submitting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
