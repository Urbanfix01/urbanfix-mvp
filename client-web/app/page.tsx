import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B1221] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

        <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 text-center md:flex-row md:items-center md:text-left">
          <div className="max-w-xl space-y-6">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
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
            <div className="flex flex-col gap-3 sm:flex-row">
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 rounded-full bg-[#F59E0B] px-5 py-2 text-sm font-semibold text-white opacity-80"
              >
                <span className="text-lg">🤖</span>
                Android
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
              </button>
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 opacity-80"
              >
                <span className="text-lg">🍎</span>
                iOS
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-6 text-left shadow-2xl backdrop-blur">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                Acceso rapido
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-semibold text-emerald-200">
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
        </main>
      </div>
    </div>
  );
}
