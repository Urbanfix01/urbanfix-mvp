'use client';

import { useEffect } from 'react';

export default function HomeScrollReveal() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.home-about-section'));
    if (!sections.length) return;

    document.documentElement.classList.add('home-scroll-effects-ready');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sections.forEach((section) => {
        section.classList.add('is-visible');
        section.classList.add('is-active');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            section.classList.add('is-visible');
            section.classList.add('is-active');
            return;
          }

          section.classList.remove('is-active');
        });
      },
      {
        root: null,
        rootMargin: '-8% 0px -20% 0px',
        threshold: 0.22,
      },
    );

    sections.forEach((section, index) => {
      section.style.setProperty('--home-section-index', String(index));
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('home-scroll-effects-ready');
    };
  }, []);

  return null;
}
