'use client';
import React, { useState } from 'react';

const PDFExportButton = ({ quote, items, profile }: any) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pdf', {
        method: 'POST',
        body: JSON.stringify({ quote, items, profile }),
      });
      if (!res.ok) throw new Error('Error API');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presupuesto-${quote.id.slice(0,6)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Error descargando PDF');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={loading} className="p-4 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">
      {loading ? '...' : '🖨️ Descargar PDF'}
    </button>
  );
};

export default PDFExportButton;