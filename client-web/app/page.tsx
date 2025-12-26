import React from 'react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-6 py-16">
      <div className="text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-bold text-blue-600 tracking-tight">UrbanFix</h1>
        <p className="text-lg sm:text-2xl text-gray-600 font-light">
          Sistema de Gestion Profesional para Tecnicos.
        </p>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md mx-auto">
          <p className="text-sm text-gray-500">
            Hola. Esta es la plataforma web para clientes.
            <br /><br />
            Si eres cliente, abre el link que te envio tu tecnico por WhatsApp para ver tu presupuesto.
          </p>
        </div>
      </div>

      <footer className="text-xs text-gray-500 flex items-center gap-4">
        <a href="https://urbanfixar.com/privacidad" className="hover:text-gray-700 underline underline-offset-4">
          Politica de Privacidad
        </a>
        <a href="https://urbanfixar.com/terminos" className="hover:text-gray-700 underline underline-offset-4">
          Terminos del Servicio
        </a>
      </footer>
    </div>
  );
}
