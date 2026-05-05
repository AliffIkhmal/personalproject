import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';

const STATUS_COLORS = {
  requested: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-500/20',
  confirmed: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20',
  completed: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-500/20',
  cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20',
};

const STATUS_OPTIONS = [
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Format "14:30" → "2:30 PM", returns empty string if falsy */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Format "2026-05-10" → "10 May 2026" */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notifying, setNotifying] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const emptyForm = {
    customer_id: '', appointment_date: '', appointment_time: '',
    service_type: '', vehicle_name: '', license_plate: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ id: null, ...emptyForm, status: 'requested' });

  const { addToast } = useToast();

  const fetchAppointments = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const data = await api.get(`/appointments${params}`);
      setAppointments(data.appointments || []);
    } catch {
      addToast('Failed to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data.customers || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const openAdd = async () => {
    await fetchCustomers();
    setForm(emptyForm);
    setAddOpen(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/appointments', form);
      addToast('Appointment created!', 'success');
      setAddOpen(false);
      fetchAppointments();
    } catch (err) {
      addToast(err.error || 'Failed to create.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (a) => {
    setEditForm({
      id: a.id,
      customer_id: a.customer_id,
      appointment_date: a.appointment_date || '',
      appointment_time: a.appointment_time || '',
      service_type: a.service_type || '',
      vehicle_name: a.vehicle_name || '',
      license_plate: a.license_plate || '',
      notes: a.notes || '',
      status: a.status || 'requested',
    });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { id, customer_id, ...rest } = editForm;
      await api.put(`/appointments/${id}`, rest);
      addToast('Appointment updated!', 'success');
      setEditOpen(false);
      fetchAppointments();
    } catch (err) {
      addToast(err.error || 'Failed to update.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/appointments/${deleteId}`);
      addToast('Appointment deleted.', 'success');
      setDeleteId(null);
      fetchAppointments();
    } catch (err) {
      addToast(err.error || 'Failed to delete.', 'error');
    }
  };

  const handleNotify = async (id) => {
    setNotifying(id);
    try {
      await api.post(`/appointments/${id}/notify`);
      addToast('Notification sent via Telegram!', 'success');
    } catch (err) {
      const errorMsg = err.error || 'Failed to notify.';
      if (errorMsg.includes('chat not found')) {
        addToast('Telegram Chat ID is invalid. The customer must message your bot first to get a valid Chat ID, then update it in their customer profile.', 'error');
      } else if (errorMsg.includes('no Telegram Chat ID')) {
        addToast('No Telegram Chat ID set. Go to the customer profile and add their Chat ID first.', 'error');
      } else {
        addToast(errorMsg, 'error');
      }
    } finally {
      setNotifying(null);
    }
  };

  // Recompute counts from unfiltered list
  const [allAppointments, setAllAppointments] = useState([]);
  useEffect(() => {
    api.get('/appointments').then((data) => setAllAppointments(data.appointments || [])).catch(() => {});
  }, [appointments]);

  const allCounts = {
    '': allAppointments.length,
    requested: allAppointments.filter((a) => a.status === 'requested').length,
    confirmed: allAppointments.filter((a) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a) => a.status === 'completed').length,
    cancelled: allAppointments.filter((a) => a.status === 'cancelled').length,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-sky-500">calendar_month</span>
            Appointments
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage customer service appointments.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-lg">add</span>
          New Appointment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'requested', label: 'Requested' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === t.value
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-500/30'
            }`}>
            {t.label} ({allCounts[t.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin mb-2 block">hourglass_top</span>
            Loading...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2 block">event_busy</span>
            <p className="font-semibold">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Service Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-bold text-on-surface">{a.customer_name}</p>
                      {a.customer_phone && <p className="text-xs text-slate-500 dark:text-slate-400">{a.customer_phone}</p>}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-semibold text-on-surface">{a.vehicle_name || '—'}</p>
                      {a.license_plate && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{a.license_plate}</span>}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-semibold text-on-surface">{formatDate(a.appointment_date)}</p>
                      <p className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${a.appointment_time ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {a.appointment_time ? formatTime(a.appointment_time) : 'No time set'}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-on-surface">{a.service_type || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[a.status] || ''}`}>
                        {a.status?.charAt(0).toUpperCase() + a.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(a)} title="Edit"
                          className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleNotify(a.id)} disabled={notifying === a.id || !a.telegram_chat_id}
                          title={a.telegram_chat_id ? 'Send Telegram Notification' : 'No Telegram Chat ID — set it in Customer Profile'}
                          className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                          <span className="material-symbols-outlined text-lg">{notifying === a.id ? 'hourglass_top' : 'send'}</span>
                        </button>
                        <button onClick={() => setDeleteId(a.id)} title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== ADD APPOINTMENT MODAL ====== */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Appointment" subtitle="Schedule a service appointment for a customer.">
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Customer *</label>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
              <option value="">Select customer...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Date *</label>
              <input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Time</label>
              <input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Service Type</label>
            <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
              <option value="">Select...</option>
              <option value="Major Service">Major Service</option>
              <option value="Minor Service">Minor Service</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Vehicle Name</label>
              <input value={form.vehicle_name} onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" placeholder="e.g. Toyota Vios" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Plate Number</label>
              <input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold uppercase" placeholder="e.g. WKL 1234" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none" placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====== EDIT APPOINTMENT MODAL ====== */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Appointment" subtitle="Update appointment details and status.">
        <form onSubmit={handleEdit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Date</label>
              <input type="date" value={editForm.appointment_date} onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Time</label>
              <input type="time" value={editForm.appointment_time} onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
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
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Service Type</label>
              <select value={editForm.service_type} onChange={(e) => setEditForm({ ...editForm, service_type: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold">
                <option value="">Select...</option>
                <option value="Major Service">Major Service</option>
                <option value="Minor Service">Minor Service</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Vehicle Name</label>
              <input value={editForm.vehicle_name} onChange={(e) => setEditForm({ ...editForm, vehicle_name: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Plate Number</label>
              <input value={editForm.license_plate} onChange={(e) => setEditForm({ ...editForm, license_plate: e.target.value.toUpperCase() })}
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold uppercase" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2}
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

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Appointment" subtitle="This action cannot be undone.">
        <div className="space-y-5">
          <p className="text-sm text-on-surface-variant">Are you sure you want to delete this appointment?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
            <button onClick={handleDelete} className="flex-[2] py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
