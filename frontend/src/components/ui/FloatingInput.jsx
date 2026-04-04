import { useState } from 'react';

export default function FloatingInput({ label, icon, type = 'text', value, onChange, required = false }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const isActive = focused || value.length > 0;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const handleKeyEvent = (e) => {
    if (isPassword) {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div>
      <div className="relative group">
        {/* Icon */}
        <span className={`absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl transition-colors duration-200 ${
          focused ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
        }`}>{icon}</span>

        {/* Input */}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={(e) => { setFocused(true); handleKeyEvent(e); }}
          onBlur={() => { setFocused(false); setCapsLock(false); }}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          required={required}
          className={`peer block w-full pl-12 ${isPassword ? 'pr-12' : 'pr-4'} pt-5 pb-2 bg-surface-container-low rounded-xl text-on-surface text-sm font-semibold transition-all duration-200 outline-none border-2 ${
            focused
              ? 'border-primary bg-white dark:bg-slate-800 ring-4 ring-primary/10'
              : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600'
          }`}
          placeholder=" "
        />

        {/* Password visibility toggle */}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}

        {/* Floating label */}
        <label className={`absolute left-12 transition-all duration-200 pointer-events-none font-bold ${
          isActive
            ? 'top-1.5 text-[10px] uppercase tracking-widest'
            : 'top-1/2 -translate-y-1/2 text-sm'
        } ${focused ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
          {label}
        </label>

        {/* Bottom highlight bar */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ${
          focused ? 'w-[calc(100%-2rem)]' : 'w-0'
        }`} />
      </div>

      {/* Caps Lock warning */}
      {isPassword && capsLock && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          <span className="material-symbols-outlined text-amber-500 text-[16px]">keyboard_capslock</span>
          <span className="text-[11px] font-semibold text-amber-600">Caps Lock is on</span>
        </div>
      )}
    </div>
  );
}
