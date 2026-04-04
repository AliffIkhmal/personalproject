import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import FloatingInput from '../components/ui/FloatingInput';

export default function ProfilePage() {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [recordsCount, setRecordsCount] = useState(0);
  const { addToast } = useToast();
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/user/profile').then((data) => {
      setDisplayName(data.display_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setCreatedAt(data.created_at || '');
      setRecordsCount(data.records_count || 0);
    }).catch(() => {});
  }, []);

  const handleUploadPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await api.upload('/user/profile-picture', fd);
      if (data.success) {
        updateUser({ profile_picture: data.profile_picture });
        addToast('Profile picture updated!', 'success');
      }
    } catch (err) {
      addToast(err.error || 'Failed to upload picture.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemovePicture = async () => {
    setUploading(true);
    try {
      await api.delete('/user/profile-picture');
      updateUser({ profile_picture: null });
      addToast('Profile picture removed.', 'success');
    } catch (err) {
      addToast(err.error || 'Failed to remove picture.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.put('/user/profile', {
        display_name: displayName,
        email,
        phone,
      });
      if (data.success) {
        updateUser({
          display_name: data.display_name,
          email: data.email,
          phone: data.phone,
        });
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.error || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-[0_20px_40px_rgba(11,28,48,0.06)] overflow-hidden relative border border-outline-variant/10">
          <div className="h-1.5 w-full indigo-pulse" />
          <div className="p-10">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded bg-primary-container/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                </div>
                <h2 className="text-2xl font-headline font-bold tracking-tight text-on-surface">Update Profile</h2>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Manage your profile picture and account details.</p>
            </div>

            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                {user?.profile_picture ? (
                  <img src={`/static/uploads/${user.profile_picture}`} alt="" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-surface-container" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center ring-4 ring-surface-container">
                    <span className="material-symbols-outlined text-4xl text-sky-600 dark:text-sky-400">person</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:cursor-wait"
                >
                  <span className="material-symbols-outlined text-white text-2xl drop-shadow">{uploading ? 'hourglass_top' : 'photo_camera'}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPicture} />
              </div>
              <div className="space-y-2">
                <p className="font-headline font-bold text-lg text-on-surface">{user?.display_name || user?.username}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                  user?.role === 'admin' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                }`}>{user?.role || 'technician'}</span>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {user?.profile_picture && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={uploading}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-outline-variant/15 mb-8" />

            {/* Editable Profile Fields */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <FloatingInput
                label="Display Name"
                icon="badge"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <FloatingInput
                label="Email Address"
                icon="mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FloatingInput
                label="Phone Number"
                icon="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-headline font-bold text-sm tracking-wide bg-sky-500 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>

            {/* Account Stats */}
            <div className="border-t border-outline-variant/15 mt-8 pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4">Account Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base text-sky-500">calendar_month</span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Member Since</p>
                  </div>
                  <p className="text-sm font-bold text-on-surface">{createdAt ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-base text-sky-500">build</span>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Records Handled</p>
                  </div>
                  <p className="text-sm font-bold text-on-surface">{recordsCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
