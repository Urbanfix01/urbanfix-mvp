'use client';

import React from 'react';

export default function UrbanFixPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F39C12]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        <main className="relative mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid items-start gap-10 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <a
                href="https://urbanfixar.com"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
              >
                Volver al inicio
              </a>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-9 w-9" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
                  <p className="text-sm font-semibold text-white/80">Gestion de presupuestos en obra</p>
                </div>
              </div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">Que es UrbanFix</h1>
              <p className="text-base text-white/70 sm:text-lg">
                UrbanFix es una plataforma que ayuda a tecnicos, instaladores y equipos de mantenimiento a crear,
                enviar y gestionar presupuestos en minutos, con una experiencia clara para el cliente final.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-full bg-[#F39C12] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-500/30 opacity-90"
                >
                  <span className="text-base">🤖</span>
                  Android
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white/80 opacity-90"
                >
                  <span className="text-base">🍎</span>
                  iOS
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
                </button>
                <a
                  href="https://urbanfixar.com/privacidad"
                  className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Politica de Privacidad
                </a>
                <a
                  href="https://urbanfixar.com/terminos"
                  className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Terminos del Servicio
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                Resumen
                <span className="rounded-full bg-[#0EA5E9]/20 px-3 py-1 text-[10px] font-semibold text-[#7DD3FC]">
                  Beneficios
                </span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>Presupuestos profesionales listos para compartir.</li>
                <li>Actualizacion de precios y materiales en segundos.</li>
                <li>Confirmacion rapida desde el celular del cliente.</li>
                <li>Historial completo para volver a cotizar.</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Para tecnicos</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>Presupuestos profesionales y listos para enviar.</li>
                <li>Seguimiento del estado: presentado, aprobado o pendiente.</li>
                <li>Items y materiales organizados por categoria.</li>
                <li>Historial para volver a cotizar sin empezar de cero.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Para clientes</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>Presupuesto claro, con detalle de items y totales.</li>
                <li>Confirmacion rapida desde el celular.</li>
                <li>Acceso a la informacion de la obra y del tecnico.</li>
                <li>Documentacion y respaldo del acuerdo.</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-white/70">
            UrbanFix reduce el tiempo de armado de presupuestos y mejora la confianza del cliente. Si queres conocer
            mas, escribinos a soporte.urbanfix@gmail.com.
          </div>
        </main>
      </div>
    </div>
  );
}
