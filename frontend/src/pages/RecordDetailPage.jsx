import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/ui/StatusBadge';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/records/${id}`);
        setRecord(data.record);
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back */}
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium text-sm group">
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
          Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="font-[Plus_Jakarta_Sans] text-3xl font-extrabold tracking-tight text-on-surface mb-2">
            Service Record #{record.id}
          </h2>
          <div className="flex items-center gap-3">
            <StatusBadge status={record.status} />
            {record.estimated_completion && (
              <span className="text-on-surface-variant text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                Est: {record.estimated_completion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Vehicle Info */}
          <div className="bg-white rounded-xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.1em] uppercase">Vehicle Identification</h3>
              <span className="material-symbols-outlined text-slate-300">directions_car</span>
            </div>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Make & Model</p>
                <p className="font-[Plus_Jakarta_Sans] font-bold text-lg text-on-surface">{record.vehicle_name}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">License Plate</p>
                <p className="font-mono font-bold text-lg text-on-surface bg-surface-container px-2 py-0.5 rounded inline-block">{record.license_plate}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Service Type</p>
                <p className="font-medium text-on-surface">{record.service_type}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Status</p>
                <StatusBadge status={record.status} />
              </div>
            </div>
            {record.image_filename && (
              <div className="mt-6">
                <img src={`/static/uploads/${record.image_filename}`} alt="Vehicle" className="max-w-xs rounded-lg shadow-sm" />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.1em] uppercase mb-6">Service Notes & Technical Log</h3>
            <div className="w-full min-h-[120px] bg-surface-container-low rounded-xl p-6 text-sm text-on-surface whitespace-pre-wrap">
              {record.notes || 'No notes recorded.'}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Metadata */}
          <div className="bg-slate-900 text-white rounded-xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <h3 className="text-[11px] font-bold text-sky-400 tracking-[0.1em] uppercase mb-8">Metadata</h3>
            <div className="space-y-6">
              {record.technician_name && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sky-400">engineering</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Assigned Tech</p>
                    <p className="font-semibold text-sm">{record.technician_name}</p>
                  </div>
                </div>
              )}
              {record.estimated_completion && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-400">timer</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Est. Completion</p>
                    <p className="font-semibold text-sm">{record.estimated_completion}</p>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-800 my-6" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Created</p>
                  <p className="text-xs font-medium text-slate-300">{record.created_at}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
                  <p className="text-xs font-medium text-slate-300">{record.updated_at}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {(record.customer_name || record.customer_phone) && (
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-[0.1em] uppercase mb-6">Customer Profile</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-[Plus_Jakarta_Sans] font-bold text-xl">
                  {record.customer_name ? record.customer_name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="font-[Plus_Jakarta_Sans] font-bold text-on-surface">{record.customer_name || 'N/A'}</p>
                </div>
              </div>
              {record.customer_phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">phone</span>
                  <span className="text-sm font-medium">{record.customer_phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
