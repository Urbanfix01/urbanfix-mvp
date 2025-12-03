'use client';

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { QuoteDocument } from './QuoteDocument';

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

      // 1. Generamos el documento "al vuelo" (On Demand)
      // Esto evita que React intente renderizarlo antes de tiempo
      const blob = await pdf(
        <QuoteDocument quote={quote} items={items} profile={profile} />
      ).toBlob();

      // 2. Creamos una URL temporal para el archivo
      const url = URL.createObjectURL(blob);

      // 3. Forzamos la descarga creando un link invisible
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presupuesto-${quote.id.slice(0, 6).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();

      // 4. Limpieza
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
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
        // Spinner de carga simple
        <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        // Icono de Impresora
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      )}
    </button>
  );
};

export default PDFExportButton;