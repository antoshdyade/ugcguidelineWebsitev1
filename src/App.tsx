import React, { useCallback, useEffect, useState } from 'react';
import { ThemeAccessibilityProvider } from './context/ThemeAccessibilityContext';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomePage } from './components/HomePage';
import { PageViewer } from './components/PageViewer';
import { DepartmentMicrosite } from './components/DepartmentMicrosite';
import { QuickLinksRepository } from './components/QuickLinksRepository';
import { GalleryView, ContactView } from './components/GalleryAndContact';
import { AdminDashboard } from './components/AdminDashboard';
import type {
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  Department,
  GalleryAlbum,
  HeroSlide,
  LeadershipProfile,
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

  return (
    <ThemeAccessibilityProvider
      defaultPrimary={data.settings.primaryColor}
      defaultSecondary={data.settings.secondaryColor}
    >
      <div className="min-h-screen flex flex-col">
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
