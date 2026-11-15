import React, { useEffect, useState } from 'react';
import { List, PenLine } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectInputProps {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: (nextVal: string) => void;
  options: (string | CustomSelectOption)[];
  placeholder?: string;
  customPlaceholder?: string;
  className?: string;
  required?: boolean;
}

export function CustomSelectInput({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  customPlaceholder = 'Enter custom value...',
  className = '',
  required = false,
}: CustomSelectInputProps) {
  const normalizedOptions: CustomSelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );
  const safeValue = value ?? '';
  const isKnownPreset = safeValue !== '' && normalizedOptions.some((o) => o.value === safeValue);
  const [customMode, setCustomMode] = useState<boolean>(safeValue !== '' && !isKnownPreset);

  useEffect(() => {
    if (safeValue !== '' && !normalizedOptions.some((o) => o.value === safeValue)) {
      setCustomMode(true);
    }
  }, [safeValue]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
          {label}
          {required && <span className="text-rose-600 ml-0.5">*</span>}
        </label>
      )}
      {!customMode ? (
        <div className="flex items-center gap-1.5">
          <select
            id={id}
            aria-label={ariaLabel || label || placeholder}
            value={isKnownPreset ? safeValue : ''}
            required={required}
            onChange={(e) => {
              const chosen = e.target.value;
              if (chosen === '__custom__') {
                setCustomMode(true);
                if (isKnownPreset) {
                  onChange('');
                }
              } else {
                onChange(chosen);
              }
            }}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
          >
            {!isKnownPreset && <option value="">{placeholder}</option>}
            {normalizedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="__custom__">+ Other / Add Custom Entry...</option>
          </select>
          <button
            type="button"
            title="Enter custom value"
            aria-label={`Enter custom ${label || ariaLabel || 'value'}`}
            onClick={() => setCustomMode(true)}
            className="shrink-0 p-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="text"
            aria-label={ariaLabel || label || customPlaceholder}
            value={safeValue}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customPlaceholder}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-amber-500 dark:border-amber-500/70 bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100"
          />
          <button
            type="button"
            title="Switch back to preset list"
            aria-label={`Switch back to preset ${label || ariaLabel || 'options'}`}
            onClick={() => {
              setCustomMode(false);
              if (!isKnownPreset && normalizedOptions.length > 0 && !safeValue) {
                onChange(normalizedOptions[0].value);
              }
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-stone-700 dark:text-slate-200"
          >
            <List className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>
      )}
    </div>
  );
}
