'use client';

import React from 'react';

export default function UrbanFixPage() {
  return (
    <div className="min-h-screen bg-[#0B1221] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

        <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
          <div className="space-y-4">
            <a
              href="https://urbanfixar.com"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              Volver al inicio
            </a>
            <h1 className="text-4xl font-black text-white sm:text-5xl">Que es UrbanFix</h1>
            <p className="text-base text-white/70 sm:text-lg">
              UrbanFix es una plataforma que ayuda a tecnicos, instaladores y equipos de mantenimiento a crear,
              enviar y gestionar presupuestos en minutos, con una experiencia clara para el cliente final.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Para tecnicos</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li>Presupuestos profesionales y listos para enviar.</li>
                <li>Actualizacion de precios y materiales en segundos.</li>
                <li>Seguimiento del estado: presentado, aprobado o pendiente.</li>
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

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-white/70">
            UrbanFix reduce el tiempo de armado de presupuestos y mejora la confianza del cliente. Si queres conocer
            mas, escribinos a soporte.urbanfix@gmail.com.
          </div>

          <div className="flex flex-wrap gap-3">
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
        </main>
      </div>
    </div>
  );
}
