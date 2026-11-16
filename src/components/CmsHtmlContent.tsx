import React, { useEffect, useRef } from 'react';

interface CmsHtmlContentProps {
  html: string;
  className?: string;
  onNavigate?: (path: string) => void;
}

/**
 * Renders sanitized rich editorial CMS HTML (.cms-prose) and progressively enhances
 * embedded customizable `.cms-slider[data-block="custom-slider"]` carousels
 * (Prev/Next buttons, dot navigation, pause on hover, configurable autoplay)
 * plus smooth SPA internal routing for local links.
 */
export function CmsHtmlContent({ html, className = '', onNavigate }: CmsHtmlContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const cleanups: (() => void)[] = [];

    const sliders = Array.from(root.querySelectorAll('.cms-slider')) as HTMLElement[];
    sliders.forEach((sliderEl) => {
      const slides = Array.from(sliderEl.querySelectorAll('.cms-slide')) as HTMLElement[];
      if (slides.length === 0) return;

      const dots = Array.from(sliderEl.querySelectorAll('.cms-slider-dot')) as HTMLButtonElement[];
      const prevBtn = sliderEl.querySelector('.cms-slider-prev') as HTMLButtonElement | null;
      const nextBtn = sliderEl.querySelector('.cms-slider-next') as HTMLButtonElement | null;
      const autoplaySec = Number(sliderEl.getAttribute('data-autoplay') || '5');

      let currentIdx = Math.max(
        0,
        slides.findIndex((s) => s.classList.contains('is-active')),
      );
      let isHovered = false;

      const showSlide = (nextIdx: number) => {
        const normalized = ((nextIdx % slides.length) + slides.length) % slides.length;
        currentIdx = normalized;
        slides.forEach((sl, idx) => {
          sl.classList.toggle('is-active', idx === normalized);
        });
        dots.forEach((dot, idx) => {
          dot.classList.toggle('is-active', idx === normalized);
        });
      };

      showSlide(currentIdx);

      const handlePrev = (e: Event) => {
        e.preventDefault();
        showSlide(currentIdx - 1);
      };
      const handleNext = (e: Event) => {
        e.preventDefault();
        showSlide(currentIdx + 1);
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', handlePrev);
        cleanups.push(() => prevBtn.removeEventListener('click', handlePrev));
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', handleNext);
        cleanups.push(() => nextBtn.removeEventListener('click', handleNext));
      }

      dots.forEach((dot, idx) => {
        const onDotClick = (e: Event) => {
          e.preventDefault();
          const targetIdx = Number(dot.getAttribute('data-slide-to') ?? idx);
          showSlide(Number.isFinite(targetIdx) ? targetIdx : idx);
        };
        dot.addEventListener('click', onDotClick);
        cleanups.push(() => dot.removeEventListener('click', onDotClick));
      });

      const onMouseEnter = () => {
        isHovered = true;
      };
      const onMouseLeave = () => {
        isHovered = false;
      };
      sliderEl.addEventListener('mouseenter', onMouseEnter);
      sliderEl.addEventListener('mouseleave', onMouseLeave);
      cleanups.push(() => {
        sliderEl.removeEventListener('mouseenter', onMouseEnter);
        sliderEl.removeEventListener('mouseleave', onMouseLeave);
      });

      if (slides.length > 1 && Number.isFinite(autoplaySec) && autoplaySec > 0) {
        const timer = window.setInterval(() => {
          if (!isHovered) {
            showSlide(currentIdx + 1);
          }
        }, autoplaySec * 1000);
        cleanups.push(() => window.clearInterval(timer));
      }
    });

    const handleInternalClick = (e: MouseEvent) => {
      if (!onNavigate) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/uploads/') && !href.startsWith('/assets/')) {
        e.preventDefault();
        onNavigate(href);
      }
    };
    root.addEventListener('click', handleInternalClick);
    cleanups.push(() => root.removeEventListener('click', handleInternalClick));

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [html, onNavigate]);

  return (
    <div
      ref={containerRef}
      className={`cms-prose ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
