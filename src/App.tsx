import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeAccessibilityProvider } from './context/ThemeAccessibilityContext';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomePage } from './components/HomePage';
import { PageViewer } from './components/PageViewer';
import { DepartmentMicrosite } from './components/DepartmentMicrosite';
import { QuickLinksRepository } from './components/QuickLinksRepository';
import { GalleryView, ContactView } from './components/GalleryAndContact';
import { AlumniPortal } from './components/AlumniPortal';
import { ConferencePortal } from './components/ConferencePortal';
import { GrievancePortal, PlacementsPortal } from './components/EngineeringPortals';
import { SportsPortal } from './components/SportsPortal';
import { FacilitiesPortal } from './components/FacilitiesPortal';
import { TendersPortal } from './components/TendersPortal';
import { FeedbackPortal, type FeedbackSummaryStats } from './components/FeedbackPortal';
import { CreditsPage } from './components/CreditsPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DEFAULT_TENDER_PORTAL_CONFIG } from './lib/collegeFeaturesLogic';
import { DEFAULT_SEO_SETTINGS, resolveRouteSeo } from './lib/securityAndSeoLogic';
import type {
  AlumniData,
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  Conference,
  Department,
  FacilitiesData,
  FeedbackSectionConfig,
  GalleryAlbum,
  HeroSlide,
  HitCounterStats,
  LeadershipProfile,
  PlacementsData,
  ResearchPortfolioData,
  SeoSettings,
  SiteSettings,
  SportsData,
  TelephoneEntry,
  TendersData,
  TickerItem,
} from './types/cms';

interface PublicBootstrapData {
  categories: CmsCategory[];
  pages: CmsPage[];
  leadership: LeadershipProfile[];
  departments: Department[];
  sliders: HeroSlide[];
  ticker: TickerItem[];
  events: CampusEvent[];
  documents: CmsDocument[];
  gallery: GalleryAlbum[];
  telephoneDirectory: TelephoneEntry[];
  alumni?: AlumniData;
  conferences?: Conference[];
  placements?: PlacementsData;
  sports?: SportsData;
  facilities?: FacilitiesData;
  tenders?: TendersData;
  researchPortfolio?: ResearchPortfolioData;
  feedbackSections?: FeedbackSectionConfig[];
  feedbackSummary?: FeedbackSummaryStats;
  settings: SiteSettings;
  seo?: SeoSettings;
  hitCounter?: HitCounterStats;
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string) {
  if (!key) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function App() {
  const [data, setData] = useState<PublicBootstrapData | null>(null);
  const [liveHitCounter, setLiveHitCounter] = useState<HitCounterStats | undefined>(undefined);
  const [error, setError] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return `${window.location.pathname}${window.location.search}` || '/';
  });
  const lastTrackedPathRef = useRef<string>('');

  const loadBootstrap = useCallback(async () => {
    try {
      const resp = await fetch('/api/public/bootstrap');
      if (!resp.ok) throw new Error('Failed to load institutional data.');
      const json = (await resp.json()) as PublicBootstrapData;
      setData(json);
      if (json.hitCounter) {
        setLiveHitCounter(json.hitCounter);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(`${window.location.pathname}${window.location.search}` || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [pathname, searchStr = ''] = currentPath.split('?');
  const searchParams = new URLSearchParams(searchStr);
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  // Dynamic SEO Metadata, Canonical Link, OpenGraph, Twitter & JSON-LD Injection
  useEffect(() => {
    if (!data) return;
    const seo = data.seo || DEFAULT_SEO_SETTINGS;
    const meta = resolveRouteSeo(
      pathname,
      window.location.origin,
      data.settings,
      seo,
      data.categories,
      data.pages,
      data.departments,
      data.conferences || [],
    );
    document.title = meta.title;
    upsertMetaTag('name', 'description', meta.description);
    upsertMetaTag('name', 'keywords', meta.keywords);
    upsertMetaTag('name', 'robots', meta.robots);
    upsertMetaTag('name', 'google-site-verification', seo.googleVerificationCode || '');
    upsertMetaTag('name', 'msvalidate.01', seo.bingVerificationCode || '');
    upsertMetaTag('property', 'og:type', meta.ogType);
    upsertMetaTag('property', 'og:site_name', data.settings.institutionName);
    upsertMetaTag('property', 'og:title', meta.title);
    upsertMetaTag('property', 'og:description', meta.description);
    upsertMetaTag('property', 'og:url', meta.canonicalUrl);
    upsertMetaTag('property', 'og:image', meta.ogImageUrl);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', meta.title);
    upsertMetaTag('name', 'twitter:description', meta.description);
    upsertMetaTag('name', 'twitter:image', meta.ogImageUrl);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonicalUrl);

    const existingJsonLd = document.getElementById('svcoer-jsonld');
    if (meta.jsonLd) {
      const script = existingJsonLd || document.createElement('script');
      script.id = 'svcoer-jsonld';
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify(meta.jsonLd);
      if (!existingJsonLd) document.head.appendChild(script);
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }
  }, [data, pathname]);

  // Live Hit Counter & Geo Visitor Log Tracker on Public Navigation
  useEffect(() => {
    if (!data || isAdminRoute) return;
    const visitKey = pathname || '/';
    if (lastTrackedPathRef.current === visitKey) return;
    lastTrackedPathRef.current = visitKey;

    const controller = new AbortController();
    fetch('/api/public/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathname: visitKey,
        referrer: document.referrer || 'Direct',
      }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((counter) => {
        if (counter && typeof counter.totalHits === 'number') {
          setLiveHitCounter(counter as HitCounterStats);
        }
      })
      .catch(() => {
        // Non-blocking hit counter telemetry
      });

    return () => controller.abort();
  }, [data, isAdminRoute, pathname]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="font-display text-2xl font-bold">Unable to Load Portal</h1>
          <p className="text-sm text-stone-600">{error}</p>
          <button
            type="button"
            onClick={loadBootstrap}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-stone-500">
        Loading Shri Vithal College of Engineering &amp; Research Portal...
      </div>
    );
  }

  const renderMainContent = () => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return (
        <AdminDashboard
          onExitToPublic={() => navigate('/')}
          onPublicDataChanged={loadBootstrap}
        />
      );
    }

    if (pathname.startsWith('/category/')) {
      const catSlug = pathname.replace('/category/', '').split('/')[0];
      return (
        <PageViewer
          categorySlug={catSlug}
          categories={data.categories}
          pages={data.pages}
          leadership={data.leadership}
          events={data.events}
          conferences={data.conferences || []}
          researchSliderSlides={data.settings.researchSliderSlides || []}
          researchPortfolio={data.researchPortfolio}
          settings={data.settings}
          onNavigate={navigate}
        />
      );
    }

    if (pathname.startsWith('/page/') || pathname.startsWith('/research/')) {
      const rawSlug = pathname.startsWith('/research/')
        ? pathname.replace('/research/', '').split('/')[0]
        : pathname.replace('/page/', '').split('/')[0];
      const slugAliases: Record<string, string> = {
        'incubation-center': 'incubation-cell',
        'incubation-centre': 'incubation-cell',
        'startups-iic-cell': 'incubation-cell',
        'start-ups-and-iic-cell': 'incubation-cell',
        'central-research-facilities': 'central-facilities',
        'central-research-and-computing-facilities': 'central-facilities',
        'research-facilities': 'central-facilities',
      };
      const normalized = rawSlug.toLowerCase().replace(/&/g, '-and-').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      const slug = slugAliases[normalized] || rawSlug;
      return (
        <PageViewer
          slug={slug}
          categories={data.categories}
          pages={data.pages}
          leadership={data.leadership}
          events={data.events}
          conferences={data.conferences || []}
          researchSliderSlides={data.settings.researchSliderSlides || []}
          researchPortfolio={data.researchPortfolio}
          settings={data.settings}
          onNavigate={navigate}
        />
      );
    }

    if (pathname.startsWith('/department/')) {
      const parts = pathname.replace('/department/', '').split('/');
      const deptSlug = parts[0] || 'computer-science';
      const subSlug = parts[1] || 'about';
      return (
        <DepartmentMicrosite
          departments={data.departments}
          deptSlug={deptSlug}
          subSlug={subSlug}
          settings={data.settings}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/conferences' || pathname.startsWith('/conference/')) {
      const confSlug = pathname.startsWith('/conference/')
        ? pathname.replace('/conference/', '').split('/')[0]
        : undefined;
      return (
        <ConferencePortal
          slug={confSlug}
          conferences={data.conferences || []}
          settings={data.settings}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/placements') {
      return (
        <PlacementsPortal
          placements={
            data.placements || {
              summaryNote: 'Training & Placement Cell supports structured campus recruitment and internships.',
              coordinatorName: 'Training & Placement Officer',
              coordinatorEmail: data.settings.email,
              coordinatorPhone: data.settings.phone,
              stats: [],
              stories: [],
            }
          }
          settings={data.settings}
        />
      );
    }

    if (pathname === '/grievance') {
      return <GrievancePortal settings={data.settings} />;
    }

    if (pathname === '/feedback') {
      return (
        <FeedbackPortal
          sections={data.feedbackSections || []}
          summary={data.feedbackSummary}
          settings={data.settings}
        />
      );
    }

    if (pathname === '/sports') {
      return (
        <SportsPortal
          sports={
            data.sports || {
              config: {
                heroBadge: 'Student Life · Gymkhana & Sports',
                heroTitle: 'Sports, Athletics & Physical Education',
                heroSubtitle: 'Campus Sports Complex, Intercollegiate Tournaments & University Medalists',
                directorName: 'Director of Physical Education',
                directorTitle: 'Sports & Gymkhana Incharge',
                directorEmail: 'sports@coe.sveri.ac.in',
                directorPhone: data.settings.phone,
                gymkhanaTimings: '06:00 AM – 08:30 AM & 04:00 PM – 07:30 PM',
                annualFlagshipName: 'Krida Mahotsav',
                customFields: [],
              },
              facilities: [],
              events: [],
              achievements: [],
              gallery: [],
              notices: [],
            }
          }
          settings={data.settings}
          initialTab={searchParams.get('tab') || undefined}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/facilities') {
      return (
        <FacilitiesPortal
          facilities={
            data.facilities || {
              config: {
                heroBadge: 'Campus Infrastructure & Amenities',
                heroTitle: 'Institutional Campus Facilities',
                heroSubtitle: 'Infrastructural, IT Computing & Student Support Amenities',
                customFieldPresets: ['Area / Capacity', 'Equipment Count', 'Operating Hours'],
              },
              items: [],
            }
          }
          settings={data.settings}
          initialCategory={searchParams.get('cat') || undefined}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/tenders') {
      return (
        <TendersPortal
          tenders={
            data.tenders || {
              config: DEFAULT_TENDER_PORTAL_CONFIG,
              items: [],
            }
          }
          settings={data.settings}
          initialRef={searchParams.get('ref') || undefined}
          initialCategory={searchParams.get('cat') || undefined}
          onNavigate={navigate}
        />
      );
    }

    if (pathname === '/quick-links') {
      return (
        <QuickLinksRepository
          documents={data.documents}
          initialQuery={searchParams.get('q') || ''}
        />
      );
    }

    if (pathname === '/gallery') {
      return <GalleryView albums={data.gallery} />;
    }

    if (pathname === '/contact') {
      return (
        <ContactView
          settings={data.settings}
          directory={data.telephoneDirectory}
        />
      );
    }

    if (pathname === '/credits' || pathname === '/developer' || pathname === '/developers') {
      return <CreditsPage settings={data.settings} onNavigate={navigate} />;
    }

    if (pathname === '/alumni' || pathname.startsWith('/alumni/')) {
      const sub = pathname.replace('/alumni', '').replace(/^\//, '');
      const initialTab =
        sub === 'register' || sub === 'jobs' || sub === 'events' || sub === 'discussions' || sub === 'login'
          ? sub
          : 'directory';
      return (
        <AlumniPortal
          alumni={
            data.alumni || {
              settings: {
                heroTitle: `${data.settings.shortCode} Alumni Association`,
                heroSubtitle: 'Connect with graduates, mentors, and recruiters.',
                associationRegNo: 'MH/SOL/ALU',
                coordinatorName: 'Alumni Cell',
                coordinatorEmail: data.settings.email,
                allowSelfRegistration: true,
                allowPublicJobPosting: true,
                enableDiscussions: true,
                requireDiscussionApproval: false,
              },
              profiles: [],
              jobs: [],
              events: [],
              discussionTopics: [],
              discussions: [],
            }
          }
          departments={data.departments}
          settings={data.settings}
          initialTab={initialTab}
          onAlumniDataChanged={loadBootstrap}
        />
      );
    }

    return (
      <HomePage
        settings={data.settings}
        sliders={data.sliders}
        ticker={data.ticker}
        categories={data.categories}
        pages={data.pages}
        departments={data.departments}
        events={data.events}
        documents={data.documents}
        leadership={data.leadership}
        onNavigate={navigate}
      />
    );
  };

  const cardRadiusClass =
    data.settings.cardRadius === 'sharp'
      ? 'theme-radius-sharp'
      : data.settings.cardRadius === 'soft'
        ? 'theme-radius-soft'
        : 'theme-radius-rounded';

  return (
    <ThemeAccessibilityProvider
      defaultPrimary={data.settings.primaryColor}
      defaultSecondary={data.settings.secondaryColor}
    >
      <div
        className={`min-h-screen flex flex-col ${cardRadiusClass}`}
        style={
          {
            '--font-display': data.settings.fontHeading || "'Playfair Display', Georgia, serif",
            '--font-sans': data.settings.fontBody || "'Plus Jakarta Sans', system-ui, sans-serif",
            fontFamily: data.settings.fontBody || "'Plus Jakarta Sans', system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        {data.settings.customCss && (
          <style dangerouslySetInnerHTML={{ __html: data.settings.customCss }} />
        )}
        {!isAdminRoute && (
          <PublicHeader
            settings={data.settings}
            categories={data.categories}
            pages={data.pages}
            departments={data.departments}
            currentPath={pathname}
            onNavigate={navigate}
          />
        )}
        <div id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {renderMainContent()}
        </div>
        {!isAdminRoute && (
          <PublicFooter
            settings={data.settings}
            hitCounter={liveHitCounter || data.hitCounter}
            seo={data.seo}
            onNavigate={navigate}
          />
        )}
      </div>
    </ThemeAccessibilityProvider>
  );
}
