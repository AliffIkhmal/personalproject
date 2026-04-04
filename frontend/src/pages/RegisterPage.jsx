import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import FloatingInput from '../components/ui/FloatingInput';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('technician');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.length < 3) { addToast('Username must be at least 3 characters.', 'error'); return; }
    if (password.length < 6) { addToast('Password must be at least 6 characters.', 'error'); return; }
    if (password !== confirm) { addToast('Passwords do not match.', 'error'); return; }

    setLoading(true);
    try {
      const data = await api.post('/register', { username, password, confirm_password: confirm, role });
      if (data.success) {
        addToast('Account created!', 'success');
        navigate('/dashboard');
      } else {
        addToast(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      addToast(err.error || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex-grow flex items-center justify-center p-8 bg-surface min-h-[calc(100vh-4rem)]">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Register Technician</h2>
          <p className="text-on-surface-variant mt-2 font-medium">Add a new specialist to the ServiceTrack network.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm dark:shadow-slate-950/20 ring-1 ring-outline-variant/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FloatingInput label="Username" icon="person" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <FloatingInput label="Password" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <FloatingInput label="Confirm Password" icon="shield" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Role</label>
              <div className="flex gap-4">
                {[{ value: 'technician', label: 'Technician', icon: 'engineering' }, { value: 'admin', label: 'Admin', icon: 'admin_panel_settings' }].map((r) => (
                  <label key={r.value} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    role === r.value ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-500/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-sky-100 dark:hover:border-sky-500/20 hover:bg-white dark:hover:bg-slate-700'
                  }`}>
                    <input type="radio" name="role" className="hidden" checked={role === r.value} onChange={() => setRole(r.value)} />
                    <span className={`material-symbols-outlined ${role === r.value ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>{r.icon}</span>
                    <span className={`text-xs font-bold ${role === r.value ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl indigo-pulse text-white font-headline font-bold text-sm tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60">
                <span>{loading ? 'Creating...' : 'Create Account'}</span>
                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
