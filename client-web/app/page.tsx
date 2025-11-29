import React from 'react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-blue-600 tracking-tight">UrbanFix</h1>
        <p className="text-2xl text-gray-600 font-light">
          Sistema de Gestión Profesional para Técnicos.
        </p>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md mx-auto">
          <p className="text-sm text-gray-500">
            👋 <strong>Hola!</strong> Esta es la plataforma web para clientes.
            <br/><br/>
            Si eres cliente, por favor <strong>abre el link que te envió tu técnico</strong> por WhatsApp para ver tu presupuesto.
          </p>
        </div>
      </div>
    </div>
  )
}
// Actualización de IVA forzada