import React, { useCallback, useEffect, useState } from 'react';
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
import { AdminDashboard } from './components/AdminDashboard';
import type {
  AlumniData,
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  Conference,
  Department,
  GalleryAlbum,
  HeroSlide,
  LeadershipProfile,
  PlacementsData,
  SiteSettings,
  TelephoneEntry,
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
  settings: SiteSettings;
}

export default function App() {
  const [data, setData] = useState<PublicBootstrapData | null>(null);
  const [error, setError] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return `${window.location.pathname}${window.location.search}` || '/';
  });

  const loadBootstrap = useCallback(async () => {
    try {
      const resp = await fetch('/api/public/bootstrap');
      if (!resp.ok) throw new Error('Failed to load institutional data.');
      const json = (await resp.json()) as PublicBootstrapData;
      setData(json);
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

  const [pathname, searchStr = ''] = currentPath.split('?');
  const searchParams = new URLSearchParams(searchStr);

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
          onNavigate={navigate}
        />
      );
    }

    if (pathname.startsWith('/page/')) {
      const slug = pathname.replace('/page/', '').split('/')[0];
      return (
        <PageViewer
          slug={slug}
          categories={data.categories}
          pages={data.pages}
          leadership={data.leadership}
          events={data.events}
          conferences={data.conferences || []}
          researchSliderSlides={data.settings.researchSliderSlides || []}
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

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
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
          <PublicFooter settings={data.settings} onNavigate={navigate} />
        )}
      </div>
    </ThemeAccessibilityProvider>
  );
}
