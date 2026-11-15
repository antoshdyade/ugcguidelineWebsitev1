import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';
import type { Conference, SiteSettings } from '../types/cms';
import { CONFERENCE_MODE_PRESETS } from '../lib/collegeFeaturesLogic';
import { formatBytes, sortByOrder } from '../lib/cmsLogic';
import { getUploadSizeLimitBytes, getUploadSizeLimitMb } from '../lib/imageCrop';
import { CaptchaWidget } from './CaptchaWidget';
import { CustomSelectInput } from './CustomSelectInput';

interface ConferencePortalProps {
  slug?: string;
  conferences: Conference[];
  settings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export function ConferencePortal({ slug, conferences, settings, onNavigate }: ConferencePortalProps) {
  const ordered = sortByOrder(conferences.filter((c) => c.isPublished));
  const selectedConf = slug ? ordered.find((c) => c.slug === slug) : undefined;

  const [scopeFilter, setScopeFilter] = useState<string>('All');
  const [activeSection, setActiveSection] = useState<'overview' | 'submit' | 'register'>('overview');

  // Paper submission form
  const [paperTitle, setPaperTitle] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [coAuthors, setCoAuthors] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [manuscriptUrl, setManuscriptUrl] = useState('');
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [paperCaptchaId, setPaperCaptchaId] = useState('');
  const [paperCaptchaAnswer, setPaperCaptchaAnswer] = useState('');
  const [paperCaptchaRefresh, setPaperCaptchaRefresh] = useState(0);
  const [paperStatus, setPaperStatus] = useState<{ ok: boolean; msg: string; code?: string } | null>(null);
  const [submittingPaper, setSubmittingPaper] = useState(false);

  // Delegate registration form
  const [attendeeName, setAttendeeName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAffiliation, setRegAffiliation] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [feeCategory, setFeeCategory] = useState('');
  const [participationMode, setParticipationMode] = useState('Hybrid (On-Campus + Online)');
  const [paperTrackingCode, setPaperTrackingCode] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [regCaptchaId, setRegCaptchaId] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');
  const [regCaptchaRefresh, setRegCaptchaRefresh] = useState(0);
  const [regStatus, setRegStatus] = useState<{ ok: boolean; msg: string; code?: string } | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  useEffect(() => {
    setActiveSection('overview');
    setPaperStatus(null);
    setRegStatus(null);
    if (selectedConf) {
      setTrackTitle(selectedConf.tracks[0]?.title || '');
      setFeeCategory(selectedConf.feeTiers[0]?.categoryLabel || 'Academician / Faculty Member');
      setParticipationMode(selectedConf.mode || 'Hybrid (On-Campus + Online)');
    }
  }, [selectedConf?.id]);

  const maxDocMb = getUploadSizeLimitMb(settings, 'document');
  const maxDocBytes = getUploadSizeLimitBytes(settings, 'document');

  const handleManuscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxDocBytes) {
      setPaperStatus({ ok: false, msg: `Manuscript exceeds limit of ${maxDocMb} MB.` });
      return;
    }
    setUploadingPaper(true);
    setPaperStatus(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read manuscript file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/public/conferences/upload-manuscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setManuscriptUrl(data.url);
      setPaperStatus({ ok: true, msg: `Uploaded manuscript (${formatBytes(data.sizeBytes)}).` });
    } catch (err) {
      setPaperStatus({ ok: false, msg: (err as Error).message });
    } finally {
      setUploadingPaper(false);
    }
  };

  const handlePaperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConf) return;
    setSubmittingPaper(true);
    setPaperStatus(null);
    try {
      const res = await fetch('/api/public/conferences/submit-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conferenceId: selectedConf.id,
          paperTitle,
          trackTitle,
          authorName,
          authorEmail,
          authorPhone,
          affiliation,
          coAuthors,
          abstractText,
          manuscriptUrl,
          captchaId: paperCaptchaId,
          captchaAnswer: paperCaptchaAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Paper submission failed.');
      setPaperStatus({ ok: true, msg: data.message, code: data.trackingCode });
      setPaperTitle('');
      setCoAuthors('');
      setAbstractText('');
      setManuscriptUrl('');
      setPaperCaptchaAnswer('');
      setPaperCaptchaRefresh((v) => v + 1);
    } catch (err) {
      setPaperStatus({ ok: false, msg: (err as Error).message });
      setPaperCaptchaRefresh((v) => v + 1);
    } finally {
      setSubmittingPaper(false);
    }
  };

  const handleDelegateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConf) return;
    setSubmittingReg(true);
    setRegStatus(null);
    try {
      const res = await fetch('/api/public/conferences/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conferenceId: selectedConf.id,
          attendeeName,
          email: regEmail,
          phone: regPhone,
          affiliation: regAffiliation,
          designation: regDesignation,
          feeCategory,
          participationMode,
          paperTrackingCode,
          paymentRef,
          captchaId: regCaptchaId,
          captchaAnswer: regCaptchaAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      setRegStatus({ ok: true, msg: data.message, code: data.regCode });
      setAttendeeName('');
      setRegEmail('');
      setRegPhone('');
      setRegAffiliation('');
      setRegDesignation('');
      setPaperTrackingCode('');
      setPaymentRef('');
      setRegCaptchaAnswer('');
      setRegCaptchaRefresh((v) => v + 1);
    } catch (err) {
      setRegStatus({ ok: false, msg: (err as Error).message });
      setRegCaptchaRefresh((v) => v + 1);
    } finally {
      setSubmittingReg(false);
    }
  };

  // Directory View (/conferences)
  if (!slug || !selectedConf) {
    const scopes = ['All', ...Array.from(new Set(ordered.map((c) => c.scope)))];
    const visible = scopeFilter === 'All' ? ordered : ordered.filter((c) => c.scope === scopeFilter);

    return (
      <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
        <div
          className="rounded-2xl p-6 sm:p-8 text-white shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #163C6B 65%, var(--secondary-color) 100%)',
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1">
            Research, Symposia &amp; Academic Hosting
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2">
            International &amp; National Conferences
          </h1>
          <p className="text-sm text-white/90 max-w-3xl leading-relaxed">
            Dedicated conference microsites featuring Call for Papers (CFP), Technical Tracks, Keynote Speakers, Organizing Committees, Schedules, Fee Tiers, Online Manuscript Submission &amp; Delegate Registration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scopes.map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScopeFilter(sc)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                scopeFilter === sc
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
              }`}
              style={scopeFilter === sc ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {sc}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visible.map((conf) => (
            <article
              key={conf.id}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="h-48 overflow-hidden relative bg-slate-900">
                <img
                  src={conf.bannerUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg'}
                  alt={conf.title}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-4 flex flex-col justify-end">
                  <div className="flex flex-wrap gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
                      {conf.scope}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-semibold">
                      {conf.mode}
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-snug">
                    {conf.shortName}: {conf.title}
                  </h2>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2 text-xs text-stone-600 dark:text-slate-300">
                  <p className="font-medium text-stone-800 dark:text-slate-100">{conf.theme}</p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-stone-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      {conf.startDate} to {conf.endDate}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {conf.venue}
                    </span>
                  </div>
                  {conf.indexingPartners.length > 0 && (
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Indexing / Proceedings: {conf.indexingPartners.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/conference/${conf.slug}`)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Open Dedicated Conference Website &rarr;
                  </button>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 ml-auto">
                    {conf.tracks.length} Tracks · {conf.people.length} Speakers/Chairs
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
            No published conferences match the selected filter yet.
          </div>
        )}
      </div>
    );
  }

  // Dedicated Conference Microsite (/conference/:slug)
  const keynotes = sortByOrder(selectedConf.people.filter((p) => p.kind === 'keynote'));
  const committee = sortByOrder(selectedConf.people.filter((p) => p.kind === 'committee'));
  const trackOptions = selectedConf.tracks.map((t) => t.title);
  const feeOptions = selectedConf.feeTiers.map((f) => f.categoryLabel);

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('/conferences')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Institutional Conferences
        </button>
        <div className="flex flex-wrap gap-2">
          {selectedConf.brochureUrl && (
            <a
              href={selectedConf.brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Brochure
            </a>
          )}
          {selectedConf.templateUrl && (
            <a
              href={selectedConf.templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" /> Paper Format Template
            </a>
          )}
        </div>
      </div>

      {/* Dedicated Hero Header */}
      <header className="rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-slate-950 text-white relative">
        <img
          src={selectedConf.bannerUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg'}
          alt={selectedConf.title}
          className="w-full h-64 sm:h-72 object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-900/70 p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 uppercase tracking-wider">
              {selectedConf.scope}
            </span>
            <span className="px-2.5 py-1 rounded bg-white/15 text-white">{selectedConf.shortName}</span>
            <span className="px-2.5 py-1 rounded bg-emerald-600/80 text-white">{selectedConf.mode}</span>
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight max-w-4xl">
              {selectedConf.title}
            </h1>
            <p className="text-sm text-amber-200 font-medium mt-2">{selectedConf.theme}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                {selectedConf.startDate} to {selectedConf.endDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                {selectedConf.venue}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-amber-400" />
                Hosted by: {selectedConf.organizingDepartment}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'overview' ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Program, Tracks &amp; Committee
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('submit')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'submit' ? 'bg-amber-500 text-slate-950' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Submit Paper / Abstract
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('register')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'register' ? 'bg-emerald-500 text-slate-950' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Delegate Registration
            </button>
          </div>
        </div>
      </header>

      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Overview & CFP */}
            <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                About {selectedConf.shortName} &amp; Call for Papers
              </h2>
              <div
                className="cms-prose text-stone-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: selectedConf.overviewHtml }}
              />
              {selectedConf.cfpHtml && (
                <div className="p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                    Call for Original Research Papers
                  </p>
                  <div
                    className="cms-prose text-sm text-stone-700 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: selectedConf.cfpHtml }}
                  />
                </div>
              )}
              {selectedConf.indexingPartners.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedConf.indexingPartners.map((partner, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                    >
                      <Sparkles className="w-3 h-3" /> {partner}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Technical Tracks */}
            {selectedConf.tracks.length > 0 && (
              <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                  Conference Tracks &amp; Topics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedConf.tracks.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-1"
                    >
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">{tr.title}</h3>
                      {tr.chair && (
                        <p className="text-[11px] font-semibold" style={{ color: 'var(--secondary-color)' }}>
                          Track Chair: {tr.chair}
                        </p>
                      )}
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{tr.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Keynote Speakers & Organizing Committee with 1:1 Photographs & Contact Particulars */}
            {(keynotes.length > 0 || committee.length > 0) && (
              <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
                {keynotes.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                      Keynote Speakers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {keynotes.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-start gap-3.5"
                        >
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-20 h-20 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 space-y-0.5 text-xs">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">
                              {p.role}
                            </span>
                            <h3 className="text-sm font-bold text-stone-900 dark:text-white">{p.name}</h3>
                            <p className="text-stone-600 dark:text-slate-300 font-medium">{p.designation}</p>
                            <p className="text-stone-500 dark:text-slate-400">{p.affiliation}</p>
                            {p.bio && <p className="text-stone-600 dark:text-slate-300 pt-1">{p.bio}</p>}
                            {(p.email || p.phone) && (
                              <div className="pt-1 flex flex-wrap gap-2.5 text-[11px] text-stone-500">
                                {p.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                                {p.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {committee.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-slate-800">
                    <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                      Organizing Committee &amp; Chairs (Profiles with Photographs)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {committee.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-start gap-3.5"
                        >
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-20 h-20 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 space-y-0.5 text-xs">
                            <span className="inline-block px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                              {p.role}
                            </span>
                            <h3 className="text-sm font-bold text-stone-900 dark:text-white">{p.name}</h3>
                            <p className="text-stone-600 dark:text-slate-300 font-medium">{p.designation}</p>
                            <p className="text-stone-500 dark:text-slate-400">{p.affiliation}</p>
                            {p.bio && <p className="text-stone-600 dark:text-slate-300 pt-1">{p.bio}</p>}
                            {(p.email || p.phone) && (
                              <div className="pt-1 flex flex-wrap gap-2.5 text-[11px] text-stone-500">
                                {p.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                                {p.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Program Schedule */}
            {selectedConf.schedule.length > 0 && (
              <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                  Technical Program Schedule
                </h2>
                <div className="overflow-x-auto">
                  <table className="cms-table cms-table-navy w-full text-xs">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time Slot</th>
                        <th>Track</th>
                        <th>Session / Keynote</th>
                        <th>Speaker / Chair</th>
                        <th>Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConf.schedule.map((item) => (
                        <tr key={item.id}>
                          <td className="font-semibold">{item.dayLabel}</td>
                          <td className="tabular-nums">{item.timeSlot}</td>
                          <td>{item.trackTitle}</td>
                          <td className="font-medium">{item.sessionTitle}</td>
                          <td>{item.speakerOrChair}</td>
                          <td>{item.venue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* Right Rail: Important Dates, Fee Tiers & Quick Actions */}
          <aside className="lg:col-span-4 space-y-5">
            {selectedConf.importantDates.length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                  Important Dates
                </h3>
                <ul className="space-y-2.5 text-xs">
                  {selectedConf.importantDates.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-2 pb-2 border-b border-stone-100 dark:border-slate-800 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-stone-800 dark:text-slate-100">{d.label}</p>
                        {d.statusNote && <p className="text-[11px] text-amber-700 dark:text-amber-400">{d.statusNote}</p>}
                      </div>
                      <span className="font-mono font-bold text-stone-900 dark:text-white shrink-0">{d.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedConf.feeTiers.length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                  Registration Fees
                </h3>
                <div className="space-y-2.5">
                  {selectedConf.feeTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-bold text-stone-900 dark:text-white">{tier.categoryLabel}</p>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          {tier.inrAmount} {tier.usdAmount ? `/ ${tier.usdAmount}` : ''}
                        </p>
                      </div>
                      {tier.includesNote && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">{tier.includesNote}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveSection('submit')}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Submit Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('register')}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white"
                  >
                    Register Now
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 text-xs">
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                Conference Secretariat Contact
              </h3>
              <p className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-amber-600" /> {selectedConf.contactEmail}
              </p>
              <p className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-amber-600" /> {selectedConf.contactPhone}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Paper / Abstract Submission Form */}
      {activeSection === 'submit' && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-600" />
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Online Paper / Abstract Submission — {selectedConf.shortName}
            </h2>
          </div>

          {paperStatus && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                paperStatus.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              <p className="font-semibold">{paperStatus.msg}</p>
              {paperStatus.code && (
                <p className="mt-1 font-mono font-bold">Save this Tracking Code: {paperStatus.code}</p>
              )}
            </div>
          )}

          <form onSubmit={handlePaperSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Full Paper / Manuscript Title *</label>
                <input
                  type="text"
                  required
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="Enter research paper title"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <CustomSelectInput
                  label="Technical Track"
                  required
                  value={trackTitle}
                  onChange={setTrackTitle}
                  options={trackOptions.length > 0 ? trackOptions : ['General Engineering Track']}
                  customPlaceholder="Enter custom technical track..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Corresponding Author Name *</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Author Email *</label>
                <input
                  type="email"
                  required
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Mobile / Phone</label>
                <input
                  type="text"
                  value={authorPhone}
                  onChange={(e) => setAuthorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Institution / Organization Affiliation *</label>
                <input
                  type="text"
                  required
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Co-Authors (comma-separated, optional)</label>
                <input
                  type="text"
                  value={coAuthors}
                  onChange={(e) => setCoAuthors(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Structured Abstract * (min 25 chars)</label>
                <textarea
                  rows={4}
                  required
                  value={abstractText}
                  onChange={(e) => setAbstractText(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2 p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    Upload Manuscript PDF / DOCX (Max {maxDocMb} MB)
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPaper ? 'Uploading...' : 'Choose File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf"
                      onChange={handleManuscriptUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
                {manuscriptUrl && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    Attached: {manuscriptUrl}
                  </p>
                )}
              </div>
            </div>

            <CaptchaWidget
              captchaId={paperCaptchaId}
              captchaAnswer={paperCaptchaAnswer}
              onCaptchaIdChange={setPaperCaptchaId}
              onCaptchaAnswerChange={setPaperCaptchaAnswer}
              refreshSignal={paperCaptchaRefresh}
              label="Manuscript Submission CAPTCHA Verification"
            />

            <button
              type="submit"
              disabled={submittingPaper}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {submittingPaper ? 'Submitting Paper...' : 'Submit Paper for Peer Review'}
            </button>
          </form>
        </section>
      )}

      {/* Delegate Registration Form */}
      {activeSection === 'register' && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Online Delegate Registration — {selectedConf.shortName}
            </h2>
          </div>

          {regStatus && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                regStatus.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{regStatus.msg}</span>
              </div>
              {regStatus.code && <p className="mt-1 font-mono font-bold">Delegate ID: {regStatus.code}</p>}
            </div>
          )}

          <form onSubmit={handleDelegateRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Delegate Full Name *</label>
                <input
                  type="text"
                  required
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Institution / Company *</label>
                <input
                  type="text"
                  required
                  value={regAffiliation}
                  onChange={(e) => setRegAffiliation(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Designation / Scholar Role</label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="e.g. Assistant Professor / Ph.D. Scholar"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <CustomSelectInput
                label="Fee Tier Category"
                required
                value={feeCategory}
                onChange={setFeeCategory}
                options={feeOptions.length > 0 ? feeOptions : ['Student / Scholar', 'Academician', 'Industry Delegate']}
                customPlaceholder="Enter custom delegate category..."
              />
              <CustomSelectInput
                label="Participation Mode"
                value={participationMode}
                onChange={setParticipationMode}
                options={[...CONFERENCE_MODE_PRESETS]}
                customPlaceholder="Enter custom attendance mode..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Accepted Paper ID (if presenting)</label>
                <input
                  type="text"
                  value={paperTrackingCode}
                  onChange={(e) => setPaperTrackingCode(e.target.value)}
                  placeholder="e.g. CONF-2026-0001"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Transaction / UTR Reference (optional)</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="UPI / NEFT / DD Reference"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <CaptchaWidget
              captchaId={regCaptchaId}
              captchaAnswer={regCaptchaAnswer}
              onCaptchaIdChange={setRegCaptchaId}
              onCaptchaAnswerChange={setRegCaptchaAnswer}
              refreshSignal={regCaptchaRefresh}
              label="Delegate Registration CAPTCHA"
            />

            <button
              type="submit"
              disabled={submittingReg}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {submittingReg ? 'Confirming Registration...' : 'Complete Conference Registration'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
