import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import FloatingInput from '../components/ui/FloatingInput';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('technician');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerResult, setCustomerResult] = useState(null);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(username, password);
      if (data.success) {
        addToast(`Welcome back, ${data.user.username}!`, 'success');
        navigate('/dashboard');
      } else {
        addToast(data.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      addToast(err?.error || 'Invalid username or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLookup = async (e) => {
    e.preventDefault();
    if (!plate.trim()) {
      addToast('Please enter a license plate number.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/customer-lookup', { license_plate: plate });
      if (data.record) {
        setCustomerResult(data.record);
      } else {
        addToast(data.error || 'No records found.', 'warning');
        setCustomerResult(null);
      }
    } catch {
      addToast('No records found for that plate.', 'warning');
      setCustomerResult(null);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = { pending: 'Queued', in_progress: 'In Progress', completed: 'Completed' };
  const statusColor = {
    pending: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background blurs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(11,28,48,0.06)] overflow-hidden border border-outline-variant/10">
          {/* Brand Header */}
          <div className="pt-10 pb-8 px-8 flex flex-col items-center">
            <h1 className="font-[Plus_Jakarta_Sans] font-extrabold text-3xl tracking-tighter text-on-surface">ServiceTrack</h1>
            <p className="text-on-surface-variant text-sm uppercase tracking-[0.05em] mt-1 opacity-70">Precision Engineering</p>
          </div>

          {/* Tabs */}
          <div className="flex px-8 border-b border-outline-variant/20">
            <button
              onClick={() => { setActiveTab('technician'); setCustomerResult(null); }}
              className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'technician' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Technician Login
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`flex-1 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'customer' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Customer Lookup
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === 'technician' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <FloatingInput label="Username" icon="person" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <FloatingInput label="Password" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full indigo-pulse text-white py-4 rounded-xl font-[Plus_Jakarta_Sans] font-bold text-sm tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group mt-2 disabled:opacity-60"
                >
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                  {!loading && <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleCustomerLookup} className="space-y-5">
                  <FloatingInput label="License Plate Number" icon="directions_car" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} required />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-on-surface text-white py-4 rounded-xl font-[Plus_Jakarta_Sans] font-bold text-sm tracking-wide shadow-xl shadow-on-surface/10 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group disabled:opacity-60"
                  >
                    <span>{loading ? 'Checking...' : 'Check Status'}</span>
                    {!loading && <span className="material-symbols-outlined text-[18px]">search</span>}
                  </button>
                </form>

                {customerResult && (
                  <div className="mt-6 p-6 bg-surface-container-low rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-[Plus_Jakarta_Sans] font-bold text-lg">{customerResult.vehicle_name}</h3>
                        <code className="text-sm font-mono text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded">{customerResult.license_plate}</code>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor[customerResult.status] || ''}`}>
                        {statusLabel[customerResult.status] || customerResult.status}
                      </span>
                    </div>
                    <div className="text-sm text-on-surface-variant space-y-1">
                      <p><strong>Service:</strong> {customerResult.service_type}</p>
                      {customerResult.estimated_completion && <p><strong>Est. Completion:</strong> {customerResult.estimated_completion}</p>}
                      {customerResult.notes && <p><strong>Notes:</strong> {customerResult.notes}</p>}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
              <p className="text-[13px] text-on-surface-variant font-medium">
                Default credentials: <code className="bg-slate-100 px-1 rounded text-xs">admin / admin123</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">System Operational</span>
          </div>
        </div>
      </main>
    </div>
  );
}
