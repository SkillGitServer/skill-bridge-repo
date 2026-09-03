import React from 'react';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', label: 'USA (+1)' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)' },
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  { code: '+91', flag: '🌐', label: 'Other (+91)' }
];

export default function PhoneInput({
  value = '',
  onChange,
  countryCode = '+91',
  onCountryCodeChange,
  placeholder = '10-digit mobile number',
  disabled = false,
  required = false,
  id,
  name = 'mobile',
  className = '',
  label,
  error
}) {
  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    // Strip non-digit characters and limit strictly to max 10 digits
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    if (typeof onChange === 'function') {
      onChange(digitsOnly);
    }
  };

  const digitsCount = (value || '').replace(/\D/g, '').length;

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="block text-xs font-bold text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className={`text-[10px] font-mono font-bold ${digitsCount === 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {digitsCount}/10
          </span>
        </div>
      )}

      <div className="relative flex items-stretch w-full rounded-xl overflow-hidden border border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-xs transition-all bg-white dark:bg-slate-900">
        {/* Country Code Prefix Box */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 px-3 py-2 shrink-0">
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange && onCountryCodeChange(e.target.value)}
            disabled={disabled}
            aria-label="Country Code"
            className="bg-transparent text-xs font-black text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer pr-1"
          >
            {COUNTRY_CODES.map((c, idx) => (
              <option key={`${c.code}-${idx}`} value={c.code} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
                {c.flag} {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* 10-Digit Phone Input Field */}
        <input
          type="tel"
          id={id}
          name={name}
          value={value}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={10}
          pattern="[0-9]{10}"
          inputMode="numeric"
          className="w-full px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
        />

        {/* Verified 10-digit Checkmark Indicator */}
        {digitsCount === 10 && (
          <div className="flex items-center pr-3 shrink-0 text-emerald-500 animate-in fade-in zoom-in duration-150">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11px] font-bold text-red-500">{error}</p>
      )}
    </div>
  );
}
