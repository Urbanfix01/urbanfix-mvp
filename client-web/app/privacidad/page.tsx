'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
          <h1 className="text-3xl font-black text-slate-900">Politica de Privacidad</h1>
          <p className="text-sm text-slate-500">Ultima actualizacion: 26/12/2025</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            En UrbanFix respetamos tu privacidad. Esta politica describe como recopilamos y usamos la informacion
            cuando utilizas nuestros servicios.
          </p>
          <p>
            Datos que podemos solicitar: nombre, correo electronico, telefono, direccion del servicio y detalles
            necesarios para generar presupuestos. No vendemos ni compartimos tu informacion con terceros no
            autorizados.
          </p>
          <p>
            Usamos proveedores externos como Google y Supabase para autenticacion y almacenamiento seguro. Tus
            datos solo se utilizan para operar el servicio y mejorar la experiencia.
          </p>
          <p>
            Puedes solicitar la actualizacion o eliminacion de tus datos escribiendo a soporte.urbanfix@gmail.com.
          </p>
        </section>

        <section className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Contacto</p>
          <p>Email: soporte.urbanfix@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
