import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/ui/StatusBadge';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const data = await api.get(`/customers/${id}`);
      setCustomer(data.customer);
      setRecords(data.customer.records || []);
      setForm({
        name: data.customer.name || '',
        phone: data.customer.phone || '',
        email: data.customer.email || '',
        address: data.customer.address || '',
      });
    } catch {
      addToast('Customer not found.', 'error');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/customers/${id}`, form);
      addToast('Customer updated!', 'success');
      setEditing(false);
      fetchCustomer();
    } catch (err) {
      addToast(err.error || 'Failed to update.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Customers
      </button>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-sky-600 text-3xl">person</span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold font-[Plus_Jakarta_Sans] tracking-tight text-on-surface">{customer.name}</h2>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Customer since {customer.created_at?.split(' ')[0] || '—'}</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              editing ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{editing ? 'close' : 'edit'}</span>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all outline-none font-semibold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Address</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
              <p className="text-sm font-semibold text-on-surface">{customer.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
              <p className="text-sm font-semibold text-on-surface">{customer.email || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Address</p>
              <p className="text-sm font-semibold text-on-surface">{customer.address || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Service History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-sky-600 text-lg">build</span>
            Service History
            <span className="ml-auto text-xs font-semibold text-slate-500">{records.length} record{records.length !== 1 ? 's' : ''}</span>
          </h3>
        </div>
        {records.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">inventory_2</span>
            <p className="font-semibold">No service records linked</p>
            <p className="text-xs mt-1">Service records can be linked to this customer from the dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-slate-500 bg-slate-50/50">
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Plate</th>
                  <th className="px-6 py-3">Service Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-bold text-on-surface">{r.vehicle_name}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{r.license_plate}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        r.service_type === 'Major Service'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-sky-50 text-sky-700 border-sky-100'
                      }`}>{r.service_type}</span>
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-3 text-xs font-semibold text-slate-600">{r.created_at?.split(' ')[0] || '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => navigate(`/record/${r.id}`)}
                        className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                        title="View Record"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
