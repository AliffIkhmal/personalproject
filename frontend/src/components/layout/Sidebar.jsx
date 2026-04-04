import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/customers', icon: 'people', label: 'Customers' },
  { to: '/audit-log', icon: 'history', label: 'Activity Log', adminOnly: true },
];

const settingsNav = [
  { to: '/profile', icon: 'account_circle', label: 'Update Profile' },
  { to: '/change-password', icon: 'lock_reset', label: 'Change Password' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const settingsActive = settingsNav.some((s) => location.pathname === s.to);
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 transition-all duration-200 ease-in-out ${
      isActive
        ? 'text-white bg-sky-600/10 border-r-4 border-sky-400'
        : 'text-slate-400 dark:text-slate-500 hover:text-slate-100 hover:bg-slate-800/50'
    }`;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r-0 bg-slate-900 shadow-2xl shadow-sky-950/20 flex flex-col justify-between py-6 z-50 font-headline antialiased tracking-tight">
      <div>
        <div className="px-6 mb-10">
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase">Vehicle Record Management System</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase font-bold">Precision Engineering</p>
          </div>
        </div>
        <nav className="space-y-1">
          {mainNav.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="space-y-1 pt-6 border-t border-slate-800/50">
        <div className="px-6 pb-4 flex items-center gap-3">
          {user?.profile_picture ? (
            <img src={`/static/uploads/${user.profile_picture}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-sky-400 text-lg">{isAdmin ? 'admin_panel_settings' : 'engineering'}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-200 truncate">{user?.display_name || user?.username}</p>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
            }`}>{user?.role || 'technician'}</span>
          </div>
        </div>
        {isAdmin && (
          <NavLink to="/register" className={linkClass}>
            <span className="material-symbols-outlined">person_add</span>
            <span className="text-sm font-semibold">Register Technician</span>
          </NavLink>
        )}
        {/* Settings Dropdown */}
        <div>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 ease-in-out ${
              settingsActive
                ? 'text-white bg-sky-600/10'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-100 hover:bg-slate-800/50'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-semibold flex-1 text-left">Settings</span>
            <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${settingsOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: settingsOpen ? `${settingsNav.length * 48}px` : '0px' }}
          >
            {settingsNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 pl-10 pr-6 py-2.5 transition-all duration-200 ease-in-out ${
                    isActive
                      ? 'text-white bg-sky-600/10 border-r-4 border-sky-400'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-[13px] font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-6 py-3 text-slate-400 dark:text-slate-500 hover:text-slate-100 hover:bg-slate-800/50 transition-all duration-200 ease-in-out"
        >
          <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          <span className="text-sm font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-3 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 ease-in-out"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
