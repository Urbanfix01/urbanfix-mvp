'use client';

import React from 'react';
// Importamos la librería AQUÍ, no en la página
import { PDFDownloadLink } from '@react-pdf/renderer';
import { QuoteDocument } from './QuoteDocument';

interface Props {
  quote: any;
  items: any[];
  profile: any;
}

const PDFExportButton = ({ quote, items, profile }: Props) => {
  return (
    <div className="h-14 w-14">
      <PDFDownloadLink
        document={<QuoteDocument quote={quote} items={items} profile={profile} />}
        fileName={`Presupuesto-${quote.id.slice(0, 6).toUpperCase()}.pdf`}
        className="flex items-center justify-center w-full h-full bg-white border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm active:scale-95"
      >
        {/* @ts-ignore */}
        {({ loading }) =>
          loading ? (
            <span className="text-xs font-bold">...</span>
          ) : (
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
          )
        }
      </PDFDownloadLink>
    </div>
  );
};

export default PDFExportButton;