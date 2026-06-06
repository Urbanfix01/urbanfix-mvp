'use client';

type UrbanFixBrandLoaderProps = {
  label?: string;
};

export default function UrbanFixBrandLoader({ label = 'Cargando UrbanFix' }: UrbanFixBrandLoaderProps) {
  return (
    <div className="ufx-brand-loader" role="status" aria-label={label}>
      <div className="ufx-brand-loader-mark" aria-hidden="true">
        <img src="/icon-48.png" alt="" />
      </div>
      <div className="ufx-brand-loader-word" aria-hidden="true">
        <div className="ufx-brand-loader-word-base">
          <span>URBAN</span>
          <span className="ufx-brand-loader-fix">FIX</span>
        </div>
        <div className="ufx-brand-loader-word-fill">
          <span>URBAN</span>
          <span className="ufx-brand-loader-fix">FIX</span>
        </div>
      </div>
      <div className="ufx-brand-loader-track" aria-hidden="true">
        <span />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
