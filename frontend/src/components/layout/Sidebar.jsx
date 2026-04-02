import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const mainNav = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/customers', icon: 'people', label: 'Customers' },
  { to: '/audit-log', icon: 'history', label: 'Activity Log' },
];

const footerNav = [
  { to: '/register', icon: 'person_add', label: 'Register Technician' },
  { to: '/change-password', icon: 'lock_reset', label: 'Change Password' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 transition-all duration-200 ease-in-out ${
      isActive
        ? 'text-white bg-sky-600/10 border-r-4 border-sky-400'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
    }`;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r-0 bg-slate-900 shadow-2xl shadow-sky-950/20 flex flex-col justify-between py-6 z-50 font-[Plus_Jakarta_Sans] antialiased tracking-tight">
      <div>
        <div className="px-6 mb-10">
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase">Vehicle Record Management System</h1>
            <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold">Precision Engineering</p>
          </div>
        </div>
        <nav className="space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="space-y-1 pt-6 border-t border-slate-800/50">
        {footerNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-semibold">{item.label}</span>
          </NavLink>
        ))}
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
