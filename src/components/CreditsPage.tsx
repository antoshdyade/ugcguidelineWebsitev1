import React from 'react';
import { ArrowLeft, Code2, ExternalLink, Globe, Layers, Mail, ShieldCheck, Users } from 'lucide-react';
import { normalizeCreditsPageConfig } from '../lib/collegeFeaturesLogic';
import type { SiteSettings } from '../types/cms';
import { CmsHtmlContent } from './CmsHtmlContent';
import { SocialPlatformSvg, SocialShareBar } from './SocialMediaWidgets';

interface CreditsPageProps {
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

function getInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'DW';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function CreditsPage({ settings, onNavigate }: CreditsPageProps) {
  const credits = normalizeCreditsPageConfig(settings.creditsPage);
  const activeContributors = [...credits.contributors]
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  const shortBrand = (settings.shortCode || settings.institutionName || 'Campus').trim();

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-10 space-y-10">
      {/* Top Breadcrumb & Return */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {shortBrand} Home</span>
        </button>
        <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
          <span>{credits.organizationCredit}</span>
          {credits.projectVersion && <span> · {credits.projectVersion}</span>}
          {credits.releaseYear && <span> · {credits.releaseYear}</span>}
        </div>
      </div>

      {/* Institutional Header Block */}
      <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div
          className="px-6 py-9 sm:px-10 text-white"
          style={{
            background: `linear-gradient(135deg, var(--primary-color) 0%, #0f172a 100%)`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300 mb-2">
            {credits.eyebrow}
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white max-w-3xl leading-tight">
            {credits.pageTitle}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
            {credits.pageSubtitle}
          </p>
          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-white/65">Institution</span>
              <span className="font-semibold text-white">{settings.institutionName}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-white/65">Engineering &amp; Maintainer Cell</span>
              <span className="font-semibold text-white">{credits.organizationCredit}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-white/65">Release &amp; Compliance</span>
              <span className="font-semibold text-white tabular-nums">
                {credits.projectVersion} · {credits.releaseYear}
              </span>
            </div>
          </div>
        </div>

        {/* Share & License Strip */}
        <div className="px-6 py-3.5 sm:px-10 bg-stone-50 dark:bg-slate-950/60 border-t border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>{credits.licenseNote}</span>
          </div>
          <SocialShareBar
            title={credits.pageTitle}
            summary={credits.pageSubtitle}
            settings={settings}
            location="page"
            isShareable={credits.isShareable}
            compact
          />
        </div>
      </section>

      {/* Creators, Developers & Contributors Directory */}
      {credits.showContributorsSection && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Users className="w-4 h-4" />
                <span>Creators &amp; Core Contributors</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mt-1">
                Development, Academic &amp; Editorial Contributors
              </h2>
            </div>
            <span className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
              {activeContributors.length} Active Contributor{activeContributors.length === 1 ? '' : 's'}
            </span>
          </div>

          {activeContributors.length === 0 ? (
            <div className="p-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-sm text-stone-500 dark:text-slate-400">
              Contributor profiles are managed from Admin Settings &rarr; Creators &amp; Dev Page.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeContributors.map((member) => (
                <article
                  key={member.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-stone-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3.5">
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-14 h-14 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0 bg-stone-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg shrink-0"
                          style={{ backgroundColor: 'var(--primary-color)' }}
                          aria-hidden="true"
                        >
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          {member.category || 'Contributor'}
                        </p>
                        <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                          {member.name}
                        </h3>
                        <p className="text-xs font-medium text-stone-700 dark:text-slate-300 mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    {member.affiliation && (
                      <p className="text-xs text-stone-500 dark:text-slate-400 border-t border-stone-100 dark:border-slate-800 pt-2.5">
                        {member.affiliation}
                      </p>
                    )}

                    {member.bio && (
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-relaxed">
                        {member.bio}
                      </p>
                    )}

                    {member.contributions && (
                      <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                          Key Areas
                        </span>
                        <p className="text-xs font-medium text-stone-800 dark:text-slate-200 mt-0.5">
                          {member.contributions}
                        </p>
                      </div>
                    )}
                  </div>

                  {(member.email || member.githubUrl || member.linkedinUrl || member.websiteUrl) && (
                    <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          aria-label={`Email ${member.name}`}
                          title={member.email}
                          className="inline-flex items-center justify-center w-8 h-8 rounded border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.githubUrl && (
                        <a
                          href={member.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} GitHub`}
                          title="GitHub"
                          className="inline-flex items-center justify-center w-8 h-8 rounded border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        >
                          <SocialPlatformSvg platform="github" className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.linkedinUrl && (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} LinkedIn`}
                          title="LinkedIn"
                          className="inline-flex items-center justify-center w-8 h-8 rounded border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        >
                          <SocialPlatformSvg platform="linkedin" className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.websiteUrl && (
                        <a
                          href={member.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} Website`}
                          title="Website"
                          className="inline-flex items-center justify-center w-8 h-8 rounded border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Platform Architecture & Technology Stack */}
      {credits.showTechStackSection && credits.techStack.length > 0 && (
        <section className="space-y-4">
          <div className="border-b border-stone-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Layers className="w-4 h-4" />
              <span>Technical Architecture</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mt-1">
              Portal Stack &amp; Infrastructure Modules
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credits.techStack.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>{item.name}</span>
                  </h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Acknowledgements & Governance Note */}
      {credits.acknowledgementsHtml && credits.acknowledgementsHtml.trim() !== '' && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-3">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Acknowledgements &amp; Institutional Attribution
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              <span>Contact Campus Web Cell</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <CmsHtmlContent html={credits.acknowledgementsHtml} onNavigate={onNavigate} />
        </section>
      )}
    </main>
  );
}
