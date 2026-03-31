import { useAuth } from '../../contexts/AuthContext';

export default function TopAppBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-50/80 backdrop-blur-md flex justify-between items-center h-16 px-8 transition-all">
      <div className="flex items-center gap-8">
        <nav className="flex gap-6 font-[Plus_Jakarta_Sans] font-semibold text-sm">
          <span className="text-sky-600 border-b-2 border-sky-600 pb-5 translate-y-[2px]">Overview</span>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">{user?.username || 'User'}</p>
            <p className="text-[10px] text-slate-500">Technician</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm uppercase">
            {user?.username?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
