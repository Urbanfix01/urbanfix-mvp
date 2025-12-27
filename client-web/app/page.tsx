'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [linkValue, setLinkValue] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [error, setError] = useState('');

  const parseQuoteId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('p');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      return parts[parts.length - 1] || '';
    } catch {
      if (trimmed.startsWith('/p/')) return trimmed.slice(3);
      if (trimmed.startsWith('p/')) return trimmed.slice(2);
      return trimmed;
    }
  };

  const handleAccess = () => {
    const candidate = linkValue || codeValue;
    if (!candidate.trim()) {
      setError('Ingresa el link o el codigo del presupuesto.');
      return;
    }
    setError('');
    if (candidate.trim().startsWith('http')) {
      window.location.href = candidate.trim();
      return;
    }
    const quoteId = parseQuoteId(candidate);
    if (!quoteId) {
      setError('No pudimos leer el link. Revisa el formato.');
      return;
    }
    router.push(`/p/${quoteId}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F39C12]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        <main className="relative mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid min-h-screen items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-7 text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
                  <p className="text-sm font-semibold text-white/80">Soluciones reales en obra</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                Plataforma de presupuestos
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-black leading-tight text-white md:text-6xl">
                  UrbanFix
                  <span className="block text-2xl font-semibold text-white/70 md:text-3xl">
                    Gestion clara para tecnicos en movimiento.
                  </span>
                </h1>
                <p className="text-base text-white/70 md:text-lg">
                  Esta es la pagina de acceso para clientes. Si recibiste un presupuesto, abrilo desde el link que te
                  envio tu tecnico.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <a
                  href="https://urbanfixar.com/privacidad"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Politica de Privacidad
                </a>
                <a
                  href="https://urbanfixar.com/urbanfix"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Que es UrbanFix
                </a>
                <a
                  href="https://urbanfixar.com/terminos"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  Terminos del Servicio
                </a>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-full bg-[#F39C12] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 opacity-90"
                >
                  Android
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 backdrop-blur opacity-90"
                >
                  iOS
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-left shadow-2xl backdrop-blur">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                    Acceso rapido
                    <span className="rounded-full bg-[#0EA5E9]/20 px-3 py-1 text-[10px] font-semibold text-[#7DD3FC]">
                      Clientes
                    </span>
                  </div>
                  <p className="text-sm text-white/80">
                    El presupuesto se abre desde un link personalizado. Si aun no lo recibiste, solicitale el enlace a
                    tu tecnico.
                  </p>
                  <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/70">
                    Tip: Guarda el link en favoritos para revisar el detalle y aceptar el trabajo cuando lo necesites.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
                    <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
                    <p className="text-sm font-semibold text-white/80">Acceso al presupuesto</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">Ingresa a tu presupuesto</h2>
                <p className="text-sm text-white/70">
                  Accede con el link que te envio tu tecnico o pega el codigo.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70"
              >
                Continuar con Google
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-white/50">
                <div className="h-px flex-1 bg-white/10" />
                o
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Link del presupuesto</label>
                <input
                  value={linkValue}
                  onChange={(event) => setLinkValue(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAccess()}
                  placeholder="https://urbanfixar.com/p/..."
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                />
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Codigo (opcional)</label>
                <input
                  value={codeValue}
                  onChange={(event) => setCodeValue(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAccess()}
                  placeholder="Ej: 8f7a2c..."
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                />
                {error && <p className="text-xs text-[#F39C12]">{error}</p>}
              </div>

              <button
                type="button"
                onClick={handleAccess}
                className="mt-5 w-full rounded-2xl bg-[#F39C12] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-[#F59E0B]"
              >
                Abrir presupuesto
              </button>
              <p className="mt-4 text-xs text-white/60">
                Si no tienes el link, pediselo a tu tecnico.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
