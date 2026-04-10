import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';

function getUrgency(dateStr) {
  if (!dateStr) return 'none';
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'due-soon';
  return 'upcoming';
}

function urgencyBadge(urgency) {
  const map = {
    overdue: { label: 'Overdue', cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20' },
    'due-soon': { label: 'Due Soon', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20' },
    upcoming: { label: 'Upcoming', cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20' },
    none: { label: 'Not Set', cls: 'bg-slate-50 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-500/20' },
  };
  const cfg = map[urgency] || map.none;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>;
}

export default function RemindersPage() {
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [dateValue, setDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(null);
  const [tab, setTab] = useState('scheduled');
  const [filter, setFilter] = useState('all');
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get('/reminders?all=1');
      setAllRecords(data.reminders || []);
    } catch {
      addToast('Failed to load reminders.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const scheduled = allRecords.filter((r) => r.next_service_date);
  const unscheduled = allRecords.filter((r) => !r.next_service_date);

  const displayRecords = tab === 'scheduled'
    ? scheduled.filter((r) => {
        if (filter === 'all') return true;
        return getUrgency(r.next_service_date) === filter;
      })
    : unscheduled;

  const counts = {
    all: scheduled.length,
    overdue: scheduled.filter((r) => getUrgency(r.next_service_date) === 'overdue').length,
    'due-soon': scheduled.filter((r) => getUrgency(r.next_service_date) === 'due-soon').length,
    upcoming: scheduled.filter((r) => getUrgency(r.next_service_date) === 'upcoming').length,
  };

  const sendReminder = async (recordId) => {
    setSending(recordId);
    try {
      const data = await api.post(`/reminders/${recordId}/send`);
      addToast('Reminder sent via Telegram!', 'success');
      setAllRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, last_reminder_sent: data.last_reminder_sent } : r));
    } catch (err) {
      addToast(err.error || 'Failed to send reminder.', 'error');
    } finally {
      setSending(null);
    }
  };

  const startEditDate = (record) => {
    setEditingDate(record.id);
    setDateValue(record.next_service_date || '');
  };

  const saveDate = async (recordId) => {
    setSavingDate(recordId);
    try {
      const data = await api.patch(`/reminders/${recordId}/date`, { next_service_date: dateValue });
      addToast(dateValue ? 'Next service date set!' : 'Date cleared.', 'success');
      setAllRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, next_service_date: data.next_service_date } : r));
      setEditingDate(null);
    } catch (err) {
      addToast(err.error || 'Failed to save date.', 'error');
    } finally {
      setSavingDate(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-500">notifications_active</span>
          Service Reminders
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Set next service dates and send Telegram reminders to customers.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('scheduled'); setFilter('all'); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'scheduled'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-500/30'
          }`}>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">event</span>
            Scheduled ({scheduled.length})
          </span>
        </button>
        <button onClick={() => setTab('all')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'all'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-500/30'
          }`}>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">list</span>
            No Date Set ({unscheduled.length})
          </span>
        </button>
      </div>

      {/* Stats Cards — only show for scheduled tab */}
      {tab === 'scheduled' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'all', label: 'Total', icon: 'list', color: 'sky' },
            { key: 'overdue', label: 'Overdue', icon: 'warning', color: 'red' },
            { key: 'due-soon', label: 'Due Soon', icon: 'schedule', color: 'amber' },
            { key: 'upcoming', label: 'Upcoming', icon: 'event_available', color: 'emerald' },
          ].map((s) => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border transition-all text-left ${
                filter === s.key ? 'border-sky-300 dark:border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`material-symbols-outlined text-base text-${s.color}-500`}>{s.icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{s.label}</p>
              </div>
              <p className="text-2xl font-extrabold text-on-surface">{counts[s.key]}</p>
            </button>
          ))}
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin mb-2 block">hourglass_top</span>
            Loading...
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2 block">{tab === 'scheduled' ? 'event_busy' : 'check_circle'}</span>
            <p className="font-semibold">{tab === 'scheduled' ? 'No scheduled reminders' : 'All records have dates set!'}</p>
            {tab === 'scheduled' && <p className="text-xs mt-1">Switch to "No Date Set" tab to assign next service dates.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Vehicle</th>
                  <th className="px-6 py-3">Next Service</th>
                  <th className="px-6 py-3">Urgency</th>
                  {tab === 'scheduled' && <th className="px-6 py-3">Last Reminder</th>}
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {displayRecords.map((r) => {
                  const urgency = getUrgency(r.next_service_date);
                  const isEditing = editingDate === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-bold text-on-surface">{r.customer_name}</p>
                        {r.customer_phone && <p className="text-xs text-slate-500 dark:text-slate-400">{r.customer_phone}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-semibold text-on-surface">{r.vehicle_name}</p>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.license_plate}</span>
                      </td>
                      <td className="px-6 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
                              className="bg-surface-container-low border-none rounded-lg py-1.5 px-2.5 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold w-36" />
                            <button onClick={() => saveDate(r.id)} disabled={savingDate === r.id}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Save">
                              <span className="material-symbols-outlined text-lg">{savingDate === r.id ? 'hourglass_top' : 'check'}</span>
                            </button>
                            <button onClick={() => setEditingDate(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all" title="Cancel">
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEditDate(r)}
                            className="text-sm font-semibold text-on-surface hover:text-sky-600 transition-colors flex items-center gap-1 group">
                            {r.next_service_date || <span className="text-slate-400 italic">Click to set</span>}
                            <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-sky-500 transition-colors">edit_calendar</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-3">{urgencyBadge(urgency)}</td>
                      {tab === 'scheduled' && (
                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{r.last_reminder_sent || '—'}</td>
                      )}
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {r.next_service_date && (
                            <button
                              onClick={() => sendReminder(r.id)}
                              disabled={sending === r.id || !r.telegram_chat_id}
                              title={r.telegram_chat_id ? 'Send Telegram Reminder' : 'No Telegram Chat ID linked'}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                r.telegram_chat_id
                                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                              } disabled:opacity-50`}
                            >
                              <span className="material-symbols-outlined text-sm">{sending === r.id ? 'hourglass_top' : 'send'}</span>
                              {sending === r.id ? 'Sending...' : 'Remind'}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/record/${r.id}`)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-all"
                            title="View Record"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
