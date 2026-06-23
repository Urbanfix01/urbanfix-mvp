import { ArrowDown } from 'lucide-react';

export default function HomeAnimatedHero() {
  return (
    <section className="home-animation-hero" aria-label="UrbanFix App">
      <div className="home-animation-hero__copy">
        <h1 className="home-animation-hero__title">
          <span className="home-animation-hero__brand-row">
            <span className="home-animation-hero__brand-word">
              Urban<span>Fix</span>
            </span>
            <span className="home-animation-hero__tool-icons" aria-hidden="true">
              <span className="home-animation-hero__tool-icon home-animation-hero__tool-icon--trowel" />
              <span className="home-animation-hero__tool-icon home-animation-hero__tool-icon--brush" />
              <span className="home-animation-hero__tool-icon home-animation-hero__tool-icon--wrench" />
              <span className="home-animation-hero__tool-icon home-animation-hero__tool-icon--pipe" />
            </span>
          </span>
          <span className="home-animation-hero__app-row">
            <span>App</span>
            <svg
              className="home-animation-hero__network"
              viewBox="0 0 980 220"
              aria-hidden="true"
            >
              <path d="M18 106H210L286 58H520L636 112H954" />
              <path d="M18 154H286L362 112H586L684 160H918" />
              <path d="M118 54H330L426 112H748" />
              <path d="M128 196H450L548 148H872" />
              <circle cx="18" cy="106" r="7" />
              <circle cx="954" cy="112" r="9" />
              <circle cx="18" cy="154" r="7" />
              <circle cx="918" cy="160" r="9" />
              <circle cx="118" cy="54" r="7" />
              <circle cx="748" cy="112" r="8" />
              <circle cx="128" cy="196" r="7" />
              <circle cx="872" cy="148" r="8" />
            </svg>
          </span>
        </h1>
      </div>

      <div className="home-animation-hero__scroll" aria-hidden="true">
        <ArrowDown className="h-6 w-6 text-white/75" />
      </div>
    </section>
  );
}
