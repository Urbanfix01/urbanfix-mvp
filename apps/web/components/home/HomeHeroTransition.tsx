'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type HomeHeroTransitionProps = {
  hero: ReactNode;
  children: ReactNode;
};

const clampProgress = (value: number) => Math.min(Math.max(value, 0), 1);

export default function HomeHeroTransition({ hero, children }: HomeHeroTransitionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.setProperty('--home-hero-progress', '1');
      return;
    }

    let frameId = 0;

    const updateProgress = () => {
      frameId = 0;

      const rect = node.getBoundingClientRect();
      const travel = Math.max(window.innerHeight * 0.82, 420);
      const progress = clampProgress(-rect.top / travel);

      node.style.setProperty('--home-hero-progress', progress.toFixed(3));
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, []);

  return (
    <div ref={rootRef} className="home-hero-transition">
      <div className="home-hero-transition__hero">{hero}</div>
      <div className="home-hero-transition__content">{children}</div>
    </div>
  );
}
