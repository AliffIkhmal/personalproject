import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';

const emptyForm = { name: '', phone: '', email: '', address: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('per_page', 20);
      if (search.trim()) params.set('q', search);
      const data = await api.get(`/customers?${params.toString()}`);
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch {
      addToast('Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customers', form);
      addToast('Customer created!', 'success');
      setAddOpen(false);
      setForm(emptyForm);
      fetchCustomers();
    } catch (err) {
      addToast(err.error || 'Failed to create customer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (c) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      addToast('Customer deleted.', 'success');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err) {
      addToast(err.error || 'Failed to delete.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="h-12 bg-white rounded-xl animate-pulse mb-6" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-[Plus_Jakarta_Sans] tracking-tight text-on-surface">Customers</h2>
          <p className="text-on-surface-variant font-medium mt-1">Manage customer profiles and service history.</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setAddOpen(true); }}
          className="flex items-center gap-2 indigo-pulse text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-lg">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-sky-600 text-xl">search</span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm font-medium text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-sm"
          placeholder="Search by name, phone, or email..."
        />
      </form>

      {/* Customer Cards */}
      {customers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-outline">people_outline</span>
          </div>
          <h3 className="text-xl font-[Plus_Jakarta_Sans] font-bold text-on-surface">No customers yet</h3>
          <p className="text-on-surface-variant max-w-xs mt-2 font-medium">Add your first customer to start tracking service history.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((c) => (
            <div key={c.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden border border-transparent hover:border-sky-100">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sky-600 text-xl">person</span>
                  </div>
                  <div>
                    <h3 className="font-[Plus_Jakarta_Sans] font-bold text-lg text-on-surface">{c.name}</h3>
                    {c.email && <p className="text-xs font-medium text-on-surface-variant">{c.email}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-5">
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-base">phone</span>
                    <span className="text-sm font-medium text-on-surface-variant">{c.phone}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-base">location_on</span>
                    <span className="text-sm font-medium text-on-surface-variant truncate">{c.address}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex items-center gap-1 text-sky-600 font-bold text-sm group/link"
                >
                  <span>View Profile</span>
                  <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-1">chevron_right</span>
                </button>
                <button
                  onClick={() => openDelete(c)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {customers.length > 0 && pagination.total_pages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    page === p ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
            className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}

      {/* ====== ADD CUSTOMER MODAL ====== */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Customer" subtitle="Enter customer information.">
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all outline-none font-semibold" placeholder="e.g. John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" placeholder="Optional" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? 'Creating...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====== DELETE CONFIRM MODAL ====== */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Customer" subtitle="This action cannot be undone.">
        <p className="text-sm text-on-surface-variant mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Linked service records will be unlinked but not deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="flex-[2] py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
            {submitting ? 'Deleting...' : 'Delete Customer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
