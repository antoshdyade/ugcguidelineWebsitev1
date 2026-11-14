import React from 'react';
import { Mail, MapPin, Phone, ShieldAlert } from 'lucide-react';
import type { SiteSettings } from '../types/cms';

interface PublicFooterProps {
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

export function PublicFooter({ settings, onNavigate }: PublicFooterProps) {
  return (
    <footer className="mt-16 border-t border-stone-200 dark:border-slate-800 bg-slate-950 text-slate-300">
      <div className="max-w-[1380px] mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h2 className="font-display text-lg font-bold text-white mb-3">
            {settings.institutionName}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            {settings.affiliation}
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </li>
            <li className="flex items-center gap-2 tabular-nums">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings.phone}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings.email}</span>
            </li>
            <li className="flex items-center gap-2 tabular-nums">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Anti-Ragging Helpline: {settings.antiRaggingHelpline}</span>
            </li>
          </ul>
        </div>

        {settings.footerColumns.map((col, colIdx) => (
          <div key={`${col.title}-${colIdx}`}>
            <h3 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-slate-800">
              {col.title}
            </h3>
            <ul className="space-y-2 text-sm">
              {col.links.map((lk, idx) => (
                <li key={`${lk.label}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate(lk.url)}
                    className="text-slate-300 hover:text-amber-300 text-left transition-colors"
                  >
                    {lk.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800/90 py-4 px-4 text-xs text-slate-400">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} {settings.institutionName}. Compliant with UGC Guidelines on Public Self-Disclosure (NEP 2020).
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/alumni')}
              className="hover:text-white"
            >
              Alumni Network
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/page/rti-disclosure')}
              className="hover:text-white"
            >
              RTI Cell
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/page/sgrc')}
              className="hover:text-white"
            >
              Grievance Redressal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="hover:text-white"
            >
              Staff CMS Login
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
