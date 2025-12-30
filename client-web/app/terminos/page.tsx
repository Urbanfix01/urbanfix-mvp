'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="relative overflow-hidden px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F97316]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <div className="space-y-3">
            <a
              href="https://www.urbanfixar.com"
              className="text-xs uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              Volver al inicio
            </a>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
                <img src="/icon.png" alt="UrbanFix logo" className="h-9 w-9" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
                <p className="text-sm font-semibold text-white/80">Terminos del Servicio</p>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Terminos del Servicio</h1>
            <p className="text-sm text-white/60">Ultima actualizacion: 26/12/2025</p>
          </div>

          <section className="space-y-4 text-sm leading-relaxed text-white/70">
            <p>
              Al usar UrbanFix aceptas estos terminos. El servicio permite crear y compartir presupuestos de trabajos
              y gestionar solicitudes con clientes.
            </p>
            <p>
              El contenido generado (presupuestos, precios, descripciones) es responsabilidad del usuario. UrbanFix
              no garantiza la exactitud de la informacion ingresada por terceros.
            </p>
            <p>
              Podemos actualizar estos terminos para mejorar el servicio. Si continuas usando la plataforma luego de
              cambios, se entiende que aceptas la version vigente.
            </p>
            <p>
              Para consultas o reclamos podes escribir a soporte.urbanfix@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
