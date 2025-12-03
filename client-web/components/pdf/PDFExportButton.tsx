'use client';

import React, { useState } from 'react';

interface Props {
  quote: any;
  items: any[];
  profile: any;
}

const PDFExportButton = ({ quote, items, profile }: Props) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);

      // 1. Pedimos el PDF al servidor (API Route)
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, items, profile }), // Enviamos los datos que ya tenemos
      });

      if (!response.ok) throw new Error('Fallo en el servidor');

      // 2. Convertimos la respuesta en un archivo descargable (Blob)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // 3. Truco del enlace invisible para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presupuesto-${quote.id.slice(0, 6).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // 4. Limpieza
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error descarga:', error);
      alert('No se pudo generar el documento. Intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="h-14 w-14 flex items-center justify-center bg-white border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Descargar PDF"
    >
      {isGenerating ? (
        <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      )}
    </button>
  );
};

export default PDFExportButton;