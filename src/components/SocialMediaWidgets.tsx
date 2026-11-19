import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import type { SiteSettings } from '../types/cms';
import {
  buildSocialShareUrls,
  getActiveSocialLinks,
  normalizeSocialSharingConfig,
} from '../lib/collegeFeaturesLogic';

export function SocialPlatformSvg({ platform, className = 'w-4 h-4' }: { platform: string; className?: string }) {
  const key = platform.toLowerCase();
  if (key === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5H16.5V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v1.9H7.2v3h2.6V21h3.7z" />
      </svg>
    );
  }
  if (key === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M6.9 8.5a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zM5.2 19.5V10h3.4v9.5H5.2zm5.5 0V10h3.2v1.3h.1c.5-.9 1.6-1.6 3.2-1.6 3.4 0 4 2.2 4 5.1v4.7h-3.4v-4.2c0-1-.1-2.3-1.4-2.3-1.5 0-1.7 1.1-1.7 2.2v4.3h-3.4z" />
      </svg>
    );
  }
  if (key === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (key === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8zM10 15.1V8.9l5.2 3.1-5.2 3.1z" />
      </svg>
    );
  }
  if (key === 'twitter' || key === 'x') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M18.2 3H21l-6.1 7 7.2 9.5h-5.6l-4.4-5.7-5 5.7H4.3l6.5-7.4L3.9 3h5.8l4 5.3L18.2 3zm-1 14.8h1.5L8.7 4.6H7l10.2 13.2z" />
      </svg>
    );
  }
  if (key === 'whatsapp') {
    return <MessageCircle className={className} aria-hidden="true" />;
  }
  if (key === 'telegram') {
    return <Send className={className} aria-hidden="true" />;
  }
  if (key === 'github') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
      </svg>
    );
  }
  return <ExternalLink className={className} aria-hidden="true" />;
}

interface SocialIconLinksProps {
  settings: SiteSettings;
  variant: 'header' | 'footer' | 'contact';
}

export function SocialIconLinks({ settings, variant }: SocialIconLinksProps) {
  const sharing = normalizeSocialSharingConfig(settings.socialSharing);
  const links = getActiveSocialLinks(settings);
  if (links.length === 0) return null;
  if (variant === 'header' && !sharing.showIconsInHeader) return null;
  if (variant === 'footer' && !sharing.showIconsInFooter) return null;

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-1" aria-label="Institutional social media links">
        {links.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.handle ? `${item.label} (${item.handle})` : item.label}
            aria-label={item.label}
            className="inline-flex items-center justify-center w-7 h-7 rounded border border-white/25 hover:bg-white/15 text-white transition-colors"
          >
            <SocialPlatformSvg platform={item.platform} className="w-3.5 h-3.5" />
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'contact') {
    return (
      <div className="pt-4 mt-4 border-t border-stone-200 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2.5">
          Official Social Media Channels
        </p>
        <div className="flex flex-wrap items-center gap-2" aria-label="Official institutional social media profiles">
          {links.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.handle ? `${item.label} (${item.handle})` : item.label}
              aria-label={item.label}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-100 hover:border-amber-500 text-xs font-semibold transition-colors"
            >
              <SocialPlatformSvg platform={item.platform} className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>{item.label}</span>
              {item.handle && <span className="text-[11px] font-normal text-stone-500 dark:text-slate-400">{item.handle}</span>}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 mt-4 border-t border-slate-800/80">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
        Connect With Us
      </p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Footer social media links">
        {links.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.handle ? `${item.label} (${item.handle})` : item.label}
            aria-label={item.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[38px] rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-400 hover:text-amber-300 text-xs font-medium transition-colors"
          >
            <SocialPlatformSvg platform={item.platform} className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

interface SocialShareBarProps {
  title: string;
  summary?: string;
  url?: string;
  settings?: SiteSettings;
  location: 'page' | 'research' | 'conference' | 'portal';
  isShareable?: boolean;
  compact?: boolean;
  className?: string;
}

export function SocialShareBar({
  title,
  summary,
  url,
  settings,
  location,
  isShareable = true,
  compact = false,
  className = '',
}: SocialShareBarProps) {
  const [copied, setCopied] = useState(false);
  const cfg = normalizeSocialSharingConfig(settings?.socialSharing);

  if (!cfg.enabled || !isShareable) return null;
  if (location === 'page' && !cfg.showOnPages) return null;
  if (location === 'research' && !cfg.showOnResearch) return null;
  if (location === 'conference' && !cfg.showOnConferences) return null;
  if (location === 'portal' && !cfg.showOnPortals) return null;

  const resolvedUrl =
    url || (typeof window !== 'undefined' ? window.location.href : 'https://coe.sveri.ac.in/');
  const urls = buildSocialShareUrls({
    url: resolvedUrl,
    title,
    summary,
    hashtags: cfg.defaultHashtags,
    via: cfg.twitterHandle,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: summary || title, url: resolvedUrl });
      } catch {
        // User dismissed share sheet
      }
    }
  };

  const canNative =
    cfg.platforms.nativeShare &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  const btnSize = compact ? 'w-8 h-8 rounded-full' : 'w-9 h-9 rounded-full';
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const iconButtons = (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'} relative`}
      role="group"
      aria-label={`Share ${title}`}
    >
      {cfg.platforms.whatsapp && (
        <a
          href={urls.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
          className={`inline-flex items-center justify-center ${btnSize} border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors`}
        >
          <SocialPlatformSvg platform="whatsapp" className={iconSize} />
        </a>
      )}
      {cfg.platforms.linkedin && (
        <a
          href={urls.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on LinkedIn"
          aria-label="Share on LinkedIn"
          className={`inline-flex items-center justify-center ${btnSize} border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-700 hover:text-white hover:border-sky-700 transition-colors`}
        >
          <SocialPlatformSvg platform="linkedin" className={iconSize} />
        </a>
      )}
      {cfg.platforms.twitter && (
        <a
          href={urls.twitter}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on X (Twitter)"
          aria-label="Share on X (Twitter)"
          className={`inline-flex items-center justify-center ${btnSize} border border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-slate-100 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors`}
        >
          <SocialPlatformSvg platform="twitter" className={iconSize} />
        </a>
      )}
      {cfg.platforms.facebook && (
        <a
          href={urls.facebook}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on Facebook"
          aria-label="Share on Facebook"
          className={`inline-flex items-center justify-center ${btnSize} border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors`}
        >
          <SocialPlatformSvg platform="facebook" className={iconSize} />
        </a>
      )}
      {cfg.platforms.telegram && (
        <a
          href={urls.telegram}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on Telegram"
          aria-label="Share on Telegram"
          className={`inline-flex items-center justify-center ${btnSize} border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-colors`}
        >
          <SocialPlatformSvg platform="telegram" className={iconSize} />
        </a>
      )}
      {cfg.platforms.email && (
        <a
          href={urls.email}
          title="Share via Email"
          aria-label="Share via Email"
          className={`inline-flex items-center justify-center ${btnSize} border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-slate-800 hover:text-white transition-colors`}
        >
          <Mail className={iconSize} aria-hidden="true" />
        </a>
      )}
      {cfg.platforms.copyLink && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Link copied to clipboard' : 'Copy link to clipboard'}
          aria-label={copied ? 'Link copied to clipboard' : 'Copy link to clipboard'}
          className={`inline-flex items-center justify-center ${btnSize} border ${
            copied
              ? 'border-emerald-500 bg-emerald-600 text-white'
              : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-slate-800 hover:text-white'
          } transition-colors`}
        >
          {copied ? <Check className={iconSize} aria-hidden="true" /> : <Copy className={iconSize} aria-hidden="true" />}
        </button>
      )}
      {canNative && (
        <button
          type="button"
          onClick={handleNativeShare}
          title="Share using device share sheet"
          aria-label="Share using device share sheet"
          className={`inline-flex items-center justify-center ${btnSize} bg-slate-900 dark:bg-slate-700 text-white hover:bg-amber-600 transition-colors`}
        >
          <Share2 className={iconSize} aria-hidden="true" />
        </button>
      )}
      {copied && (
        <span
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700"
        >
          Link copied to clipboard
        </span>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={`pt-2.5 mt-2.5 border-t border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-2 ${className}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
          Share
        </span>
        {iconButtons}
      </div>
    );
  }

  return (
    <div className={`mt-6 pt-5 border-t border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-slate-200">
        <Share2 className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
        <span>{cfg.shareHeading || 'Share this update'}</span>
      </div>
      {iconButtons}
    </div>
  );
}
