import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, subtitle, size, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white dark:bg-slate-800 w-full ${size === 'xl' ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="indigo-pulse p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-headline font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
