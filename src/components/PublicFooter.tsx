import React from 'react';
import { BarChart3, Globe2, Mail, MapPin, Phone, ShieldAlert } from 'lucide-react';
import type { HitCounterStats, SeoSettings, SiteSettings } from '../types/cms';

interface PublicFooterProps {
  settings: SiteSettings;
  hitCounter?: HitCounterStats;
  seo?: SeoSettings;
  onNavigate: (path: string) => void;
}

export function PublicFooter({ settings, hitCounter, seo, onNavigate }: PublicFooterProps) {
  const showCounter = seo?.showHitCounterInFooter !== false && Boolean(hitCounter);

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

      {showCounter && hitCounter && (
        <div className="border-t border-slate-800/80 bg-slate-900/60 py-3 px-4">
          <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-5 tabular-nums">
              <span className="inline-flex items-center gap-2 font-semibold text-amber-300">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Website Visit Counter:</span>
                <span className="font-mono text-sm font-bold text-white tracking-wider">
                  {Number(hitCounter.totalHits || 0).toLocaleString()}
                </span>
              </span>
              <span className="text-slate-400">
                Today: <strong className="text-slate-200 font-mono">{Number(hitCounter.todayHits || 0).toLocaleString()}</strong>
              </span>
              <span className="text-slate-400">
                Unique Visitors: <strong className="text-slate-200 font-mono">{Number(hitCounter.uniqueVisitors || 0).toLocaleString()}</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-amber-300">
                <Globe2 className="w-3.5 h-3.5" /> XML Sitemap
              </a>
              <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300">
                robots.txt
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-800/90 py-4 px-4 text-xs text-slate-400">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} {settings.institutionName}. Compliant with UGC Guidelines on Public Self-Disclosure (NEP 2020).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/facilities')}
              className="hover:text-white"
            >
              Campus Facilities
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/sports')}
              className="hover:text-white"
            >
              Sports &amp; Gymkhana
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/conferences')}
              className="hover:text-white"
            >
              Conferences &amp; Events
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/placements')}
              className="hover:text-white"
            >
              Training &amp; Placements
            </button>
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
              onClick={() => onNavigate('/grievance')}
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
