import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import FloatingInput from '../components/ui/FloatingInput';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { addToast('New password must be at least 6 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { addToast('New passwords do not match.', 'error'); return; }

    setLoading(true);
    try {
      const data = await api.post('/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (data.success) {
        addToast('Password changed successfully!', 'success');
        navigate('/dashboard');
      } else {
        addToast(data.error || 'Failed to change password.', 'error');
      }
    } catch (err) {
      addToast(err.error || 'Failed to change password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(11,28,48,0.06)] overflow-hidden relative border border-outline-variant/10">
          <div className="h-1.5 w-full indigo-pulse" />
          <div className="p-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">lock_open</span>
                </div>
                <h2 className="text-2xl font-[Plus_Jakarta_Sans] font-bold tracking-tight text-on-surface">Security Settings</h2>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Update your account credentials to maintain workspace security.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FloatingInput label="Current Password" icon="key" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />

              <div className="py-2"><div className="h-px bg-surface-container" /></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput label="New Password" icon="lock" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <FloatingInput label="Confirm New Password" icon="verified_user" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <button type="submit" disabled={loading}
                  className="flex-1 indigo-pulse text-white font-[Plus_Jakarta_Sans] font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => navigate('/dashboard')}
                  className="px-8 py-4 bg-surface-container-high text-on-surface-variant font-[Plus_Jakarta_Sans] font-bold rounded-xl hover:bg-surface-dim transition-colors active:scale-[0.98]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
