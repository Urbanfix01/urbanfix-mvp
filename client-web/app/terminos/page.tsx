'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
          <h1 className="text-3xl font-black text-slate-900">Terminos del Servicio</h1>
          <p className="text-sm text-slate-500">Ultima actualizacion: 26/12/2025</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-600">
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
  );
}
