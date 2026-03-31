import { useState } from 'react';

export default function FloatingInput({ label, icon, type = 'text', value, onChange, required = false }) {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="relative group">
      {/* Icon */}
      <span className={`absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl transition-colors duration-200 ${
        focused ? 'text-primary' : 'text-slate-400'
      }`}>{icon}</span>

      {/* Input */}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={`peer block w-full pl-12 pr-4 pt-5 pb-2 bg-surface-container-low rounded-xl text-on-surface text-sm font-semibold transition-all duration-200 outline-none border-2 ${
          focused
            ? 'border-primary bg-white ring-4 ring-primary/10'
            : 'border-transparent hover:border-slate-200'
        }`}
        placeholder=" "
      />

      {/* Floating label */}
      <label className={`absolute left-12 transition-all duration-200 pointer-events-none font-bold ${
        isActive
          ? 'top-1.5 text-[10px] uppercase tracking-widest'
          : 'top-1/2 -translate-y-1/2 text-sm'
      } ${focused ? 'text-primary' : 'text-slate-400'}`}>
        {label}
      </label>

      {/* Bottom highlight bar */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ${
        focused ? 'w-[calc(100%-2rem)]' : 'w-0'
      }`} />
    </div>
  );
}
