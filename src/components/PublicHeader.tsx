import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Contrast,
  Eye,
  Globe,
  Menu,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  Type,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { THEME_PALETTES } from '../lib/cmsLogic';
import { useThemeAccessibility, type SupportedLang } from '../context/ThemeAccessibilityContext';
import type { CmsCategory, CmsPage, Department, SearchResultItem, SiteSettings } from '../types/cms';

interface PublicHeaderProps {
  settings: SiteSettings;
  categories: CmsCategory[];
  pages: CmsPage[];
  departments: Department[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function PublicHeader({
  settings,
  categories,
  pages,
  departments,
  currentPath,
  onNavigate,
}: PublicHeaderProps) {
  const {
    paletteId,
    primaryColor,
    secondaryColor,
    darkMode,
    highContrast,
    dyslexiaFont,
    highlightLinks,
    isSpeaking,
    language,
    t,
    setPalette,
    setCustomColors,
    adjustFontScale,
    toggleDarkMode,
    toggleHighContrast,
    toggleDyslexiaFont,
    toggleHighlightLinks,
    toggleSpeech,
    setLanguage,
  } = useThemeAccessibility();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (resp.ok) {
          const data = await resp.json();
          setSearchResults(data.results || []);
          setSearchOpen(true);
        }
      } catch {
        // Ignore transient search fetch error
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const getCategoryPages = (slug: string) =>
    pages.filter((p) => p.categorySlug === slug).sort((a, b) => a.sortOrder - b.sortOrder);

  const navGroups = [
    { key: 'about-hei', label: t('about'), pages: getCategoryPages('about-hei') },
    { key: 'administration', label: t('administration'), pages: getCategoryPages('administration') },
    {
      key: 'academics',
      label: t('academics'),
      pages: getCategoryPages('academics'),
      departments,
    },
    { key: 'admissions-fee', label: t('admissions'), pages: getCategoryPages('admissions-fee') },
    { key: 'research', label: t('research'), pages: getCategoryPages('research') },
    { key: 'student-life', label: t('studentLife'), pages: getCategoryPages('student-life') },
    {
      key: 'info-alumni',
      label: t('infoAlumni'),
      pages: [...getCategoryPages('alumni'), ...getCategoryPages('information-corner')],
    },
  ];

  return (
    <header className="relative z-40 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-600 focus:text-white focus:rounded"
      >
        {t('skipToContent')}
      </a>

      {/* Accessibility, Theme Switcher & Language Utility Ribbon */}
      <div
        className="text-white text-xs py-1.5 px-4 border-b border-white/15"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="hidden sm:inline font-medium text-white/90 whitespace-nowrap">
              DTE: {settings.dteCode} · AICTE: {settings.aicteCode}
            </span>
            <span className="hidden md:inline text-white/40">|</span>
            {settings.topBarLinks.slice(0, 3).map((link) => (
              <button
                key={link.url}
                type="button"
                onClick={() => onNavigate(link.url)}
                className="text-white/90 hover:text-amber-300 underline-offset-4 hover:underline whitespace-nowrap shrink-0 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Font Sizing */}
            <div className="flex items-center border border-white/25 rounded overflow-hidden" role="group" aria-label="Font size controls">
              <button
                type="button"
                onClick={() => adjustFontScale(-0.08)}
                aria-label="Decrease font size"
                className="px-2 py-1 hover:bg-white/15 font-medium"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => adjustFontScale('reset')}
                aria-label="Reset font size"
                className="px-2 py-1 hover:bg-white/15 border-x border-white/20 font-medium"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => adjustFontScale(0.08)}
                aria-label="Increase font size"
                className="px-2 py-1 hover:bg-white/15 font-medium"
              >
                A+
              </button>
            </div>

            {/* High Contrast */}
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title="High Contrast Mode"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs whitespace-nowrap ${
                highContrast ? 'bg-amber-400 text-black border-amber-300 font-semibold' : 'border-white/25 hover:bg-white/15'
              }`}
            >
              <Contrast className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Contrast</span>
            </button>

            {/* Dark / Light Mode */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-pressed={darkMode}
              aria-label="Toggle dark mode"
              title="Dark / Light Mode"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/25 hover:bg-white/15"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Dyslexia Font */}
            <button
              type="button"
              onClick={toggleDyslexiaFont}
              aria-pressed={dyslexiaFont}
              title="Dyslexia-Friendly Font"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border whitespace-nowrap ${
                dyslexiaFont ? 'bg-white text-slate-900 border-white font-semibold' : 'border-white/25 hover:bg-white/15'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Dyslexia Font</span>
            </button>

            {/* Link Highlighter */}
            <button
              type="button"
              onClick={toggleHighlightLinks}
              aria-pressed={highlightLinks}
              title="Highlight Links & Headings"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border whitespace-nowrap ${
                highlightLinks ? 'bg-white text-slate-900 border-white font-semibold' : 'border-white/25 hover:bg-white/15'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Highlight</span>
            </button>

            {/* Text-to-Speech Screen Reader */}
            <button
              type="button"
              onClick={() => toggleSpeech()}
              aria-pressed={isSpeaking}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border whitespace-nowrap ${
                isSpeaking ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold' : 'border-white/25 hover:bg-white/15'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? t('stopListening') : t('listenPage')}</span>
            </button>

            {/* Theme Palette & Hex Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen((v) => !v)}
                aria-expanded={themeMenuOpen}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/25 hover:bg-white/15 whitespace-nowrap"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Theme</span>
              </button>
              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 shadow-xl border border-stone-200 dark:border-slate-700 p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-slate-200">
                      Institutional Palette
                    </span>
                    <button
                      type="button"
                      onClick={() => setThemeMenuOpen(false)}
                      aria-label="Close theme menu"
                      className="p-0.5 text-stone-500 hover:text-stone-900 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {THEME_PALETTES.map((pal) => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setPalette(pal.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                          paletteId === pal.id
                            ? 'border-stone-900 dark:border-white bg-stone-100 dark:bg-slate-800 font-semibold'
                            : 'border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{pal.name}</span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.primary }} />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.secondary }} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-stone-200 dark:border-slate-700 pt-2.5 flex items-center justify-between gap-2">
                    <label className="text-xs flex items-center gap-1.5">
                      <span>Primary</span>
                      <input
                        type="color"
                        aria-label="Custom primary color"
                        value={primaryColor}
                        onChange={(e) => setCustomColors(e.target.value, secondaryColor)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                    <label className="text-xs flex items-center gap-1.5">
                      <span>Accent</span>
                      <input
                        type="color"
                        aria-label="Custom secondary color"
                        value={secondaryColor}
                        onChange={(e) => setCustomColors(primaryColor, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Language Translator */}
            <label className="inline-flex items-center gap-1 border border-white/25 rounded px-2 py-0.5 bg-white/10">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <select
                aria-label="Language selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLang)}
                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="en" className="text-slate-900">English</option>
                <option value="hi" className="text-slate-900">हिन्दी</option>
                <option value="mr" className="text-slate-900">मराठी</option>
                <option value="kn" className="text-slate-900">ಕನ್ನಡ</option>
                <option value="ta" className="text-slate-900">தமிழ்</option>
              </select>
            </label>

            {/* Admin Portal Button */}
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white text-slate-900 font-semibold hover:bg-amber-100 whitespace-nowrap shrink-0 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CMS Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Crest, Name & Global AJAX Search Bar */}
      <div className="max-w-[1380px] mx-auto px-4 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3.5 text-left group"
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0 font-display font-bold text-xl tracking-tight shadow-sm"
            style={{ backgroundColor: 'var(--primary-color)' }}
            aria-hidden="true"
          >
            SV
          </div>
          <div>
            <p className="text-xs font-medium text-stone-600 dark:text-slate-400">
              Shri Vithal Education &amp; Research Trust&apos;s
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-white leading-tight group-hover:underline">
              {settings.institutionName}
            </h1>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {settings.affiliation}
            </p>
          </div>
        </button>

        {/* Global Live Search + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div ref={searchBoxRef} className="relative flex-1 lg:w-96">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                placeholder={t('searchPlaceholder')}
                aria-label="Global search across pages, faculty, notices, and documents"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                  <span>Search results for &ldquo;{searchQuery}&rdquo;</span>
                  <span className="tabular-nums">{searchResults.length} found</span>
                </div>
                {searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-stone-500 dark:text-slate-400">
                    No matching UGC pages, faculty, notices, or documents found.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                    {searchResults.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onNavigate(item.url);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="text-sm font-semibold text-stone-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                            {item.subtitle} · {item.meta}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2 rounded-lg border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Institutional Navigation Mega-Menu */}
      <nav
        aria-label="Primary Institutional Navigation"
        className="border-t border-stone-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-900/90"
      >
        <div className="max-w-[1380px] mx-auto px-4">
          {/* Desktop Single-Row Nav */}
          <ul className="hidden lg:flex items-center gap-1 py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onNavigate('/');
                }}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap shrink-0 rounded transition-colors ${
                  currentPath === '/'
                    ? 'text-white'
                    : 'text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800'
                }`}
                style={currentPath === '/' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {t('home')}
              </button>
            </li>

            {navGroups.map((group) => {
              const isOpen = openDropdown === group.key;
              return (
                <li
                  key={group.key}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(group.key)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenDropdown(isOpen ? null : group.key)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-sm font-medium text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800 rounded whitespace-nowrap shrink-0 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full pt-1 w-80 z-50">
                      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl p-2">
                        <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 border-b border-stone-100 dark:border-slate-800 mb-1">
                          {group.label} · UGC Disclosure
                        </div>
                        <ul className="space-y-0.5 max-h-80 overflow-y-auto">
                          {group.pages.map((pg) => (
                            <li key={pg.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDropdown(null);
                                  onNavigate(`/page/${pg.slug}`);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-sm rounded text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                {pg.title}
                              </button>
                            </li>
                          ))}
                          {group.departments && (
                            <>
                              <li className="pt-2 pb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 border-t border-stone-100 dark:border-slate-800 mt-1">
                                Department Microsites
                              </li>
                              {group.departments.map((dept) => (
                                <li key={dept.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      onNavigate(`/department/${dept.slug}`);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-sm rounded font-medium text-stone-800 dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    {dept.name} ({dept.code})
                                  </button>
                                </li>
                              ))}
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}

            <li>
              <button
                type="button"
                onClick={() => onNavigate('/quick-links')}
                className={`px-2.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 rounded transition-colors ${
                  currentPath.startsWith('/quick-links')
                    ? 'text-white'
                    : 'text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800'
                }`}
                style={currentPath.startsWith('/quick-links') ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {t('quickLinks')}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/gallery')}
                className={`px-2.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 rounded transition-colors ${
                  currentPath === '/gallery'
                    ? 'text-white'
                    : 'text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800'
                }`}
                style={currentPath === '/gallery' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {t('gallery')}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className={`px-2.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 rounded transition-colors ${
                  currentPath === '/contact'
                    ? 'text-white'
                    : 'text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:bg-slate-800'
                }`}
                style={currentPath === '/contact' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {t('contact')}
              </button>
            </li>
          </ul>

          {/* Mobile Drawer Nav */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-3 space-y-2 border-t border-stone-200 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/');
                  }}
                  className="px-3 py-2 text-left text-sm font-medium rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
                >
                  {t('home')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/quick-links');
                  }}
                  className="px-3 py-2 text-left text-sm font-medium rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
                >
                  {t('quickLinks')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/gallery');
                  }}
                  className="px-3 py-2 text-left text-sm font-medium rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
                >
                  {t('gallery')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/contact');
                  }}
                  className="px-3 py-2 text-left text-sm font-medium rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
                >
                  {t('contact')}
                </button>
              </div>
              {categories.map((cat) => (
                <details key={cat.id} className="bg-white dark:bg-slate-800 rounded border border-stone-200 dark:border-slate-700 px-3 py-2">
                  <summary className="text-sm font-semibold cursor-pointer">
                    {cat.name} ({cat.ugcCode})
                  </summary>
                  <div className="mt-2 space-y-1 pl-2">
                    {getCategoryPages(cat.slug).map((pg) => (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNavigate(`/page/${pg.slug}`);
                        }}
                        className="block w-full text-left py-1 text-xs text-stone-600 dark:text-slate-300"
                      >
                        {pg.title}
                      </button>
                    ))}
                    {cat.slug === 'academics' &&
                      departments.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onNavigate(`/department/${d.slug}`);
                          }}
                          className="block w-full text-left py-1 text-xs font-semibold text-amber-700 dark:text-amber-400"
                        >
                          Dept: {d.name}
                        </button>
                      ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
