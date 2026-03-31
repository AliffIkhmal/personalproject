import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import FloatingInput from '../components/ui/FloatingInput';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
      const data = await api.post('/register', { username, password, confirm_password: confirm });
      if (data.success) {
        addToast('Technician account created!', 'success');
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
          <h2 className="text-3xl font-[Plus_Jakarta_Sans] font-extrabold text-on-surface tracking-tight">Register Technician</h2>
          <p className="text-on-surface-variant mt-2 font-medium">Add a new specialist to the ServiceTrack network.</p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm ring-1 ring-outline-variant/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FloatingInput label="Username" icon="person" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <FloatingInput label="Password" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <FloatingInput label="Confirm Password" icon="shield" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl indigo-pulse text-white font-[Plus_Jakarta_Sans] font-bold text-sm tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60">
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
