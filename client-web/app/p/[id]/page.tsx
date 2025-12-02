'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

// --- CONFIGURACIÓN SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QuotePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (params.id) fetchQuoteData(params.id as string);
  }, [params.id]);

  const fetchQuoteData = async (quoteId: string) => {
    try {
      // 1. Obtener cotización + perfil
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`*, profiles:user_id (*)`)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // 2. Obtener ítems
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) throw itemsError;

      setQuote(quoteData);
      setProfile(quoteData.profiles);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE BOTONES ---
  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación de este presupuesto?')) return;
    
    // Usamos la función segura RPC
    const { error } = await supabase.rpc('approve_quote', { quote_id: quote.id });

    if (!error) {
      alert('¡Excelente! Presupuesto aprobado.');
      setQuote({ ...quote, status: 'approved' });
    } else {
      console.error(error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };

  // --- CÁLCULOS ---
  const calculateTotal = () => {
    if (!items.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.21; // IVA Fijo 21%
    return { subtotal, tax, total: subtotal + tax };
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-medium text-sm animate-pulse">Generando documento...</p>
    </div>
  );
  
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">Documento no disponible.</div>;

  const { subtotal, tax, total } = calculateTotal();
  const isApproved = quote.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center items-start print:bg-white print:p-0">
      
      {/* --- HOJA A4 (Contenedor Principal) --- */}
      <div className="w-full max-w-3xl bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none print:max-w-none print:rounded-none transition-all duration-500 ease-out">
        
        {/* HEADER: Identidad Visual Fuerte */}
        <div className="bg-[#0F172A] text-white p-10 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            
            {/* IZQUIERDA: Marca del Técnico */}
            <div className="flex-1">
              {profile?.company_logo_url ? (
                <div className="bg-white p-2 rounded-lg inline-block mb-4 shadow-sm">
                   <img src={profile.company_logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                </div>
              ) : (
                <h1 className="text-2xl font-bold uppercase tracking-wider text-orange-500 mb-2">
                  {profile?.business_name || 'PRESUPUESTO'}
                </h1>
              )}
              
              <div className="space-y-1 text-slate-300 text-sm print:text-black">
                <p className="font-semibold text-white text-base print:text-black">{profile?.full_name}</p>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  <span>{profile?.phone || 'Sin teléfono'}</span>
                </div>
                {profile?.email && (
                   <div className="flex items-center gap-2">
                     <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                     <span>{profile.email}</span>
                   </div>
                )}
              </div>
            </div>

            {/* DERECHA: Datos del Documento */}
            <div className="text-left md:text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-black mb-1">Referencia</p>
              <p className="font-mono text-xl text-white print:text-black mb-4 tracking-wide">#{quote.id.slice(0, 8).toUpperCase()}</p>
              
              {/* BADGE DE ESTADO PRO */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border print:border-black
                ${isApproved 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:text-black print:bg-transparent' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20 print:text-black print:bg-transparent'}`}>
                <span className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'} print:hidden`}></span>
                {isApproved ? 'Aprobado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        {/* --- INFO CLIENTE (Grid System) --- */}
        <div className="p-10 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturar a</p>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{quote.client_name || 'Cliente Final'}</h2>
              <div className="flex items-start gap-2 text-slate-500 text-sm mt-2">
                <svg className="w-4 h-4 mt-0.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <p className="max-w-xs leading-relaxed">{quote.client_address || 'Dirección no especificada'}</p>
              </div>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha de Emisión</p>
              <p className="text-slate-800 font-semibold text-lg">
                {new Date(quote.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Válido por 15 días</p>
            </div>
          </div>
        </div>

        {/* --- TABLA DE COSTOS --- */}
        <div className="p-10 bg-white min-h-[300px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/2">Descripción</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-1/6">Cant.</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-1/6">Precio Unit.</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-1/6">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 group hover:bg-slate-50 transition-colors">
                    <td className="py-5 pr-4 font-medium text-slate-700">
                      {item.description}
                    </td>
                    <td className="py-5 text-center text-slate-500 font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-5 text-right text-slate-500 font-mono tabular-nums">
                      ${item.unit_price?.toLocaleString('es-AR')}
                    </td>
                    <td className="py-5 text-right font-bold text-slate-800 font-mono tabular-nums">
                      ${(item.quantity * item.unit_price)?.toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALES */}
          <div className="mt-10 flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3 bg-slate-50 rounded-xl p-6 space-y-3 print:bg-transparent print:p-0">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>IVA (21%)</span>
                <span className="font-mono">+ ${tax.toLocaleString('es-AR')}</span>
              </div>
              <div className="border-t border-slate-200 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-700">TOTAL</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  ${total.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTIONS FOOTER (Solo Pantalla) --- */}
        <div className="bg-slate-50 px-10 py-8 border-t border-slate-200 print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="text-xs text-slate-400 max-w-sm text-center md:text-left leading-relaxed">
               Al aceptar este presupuesto, aceptas los términos y condiciones de servicio provistos por <strong>{profile?.business_name}</strong>.
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={handlePrint}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-400 transition-all shadow-sm active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  PDF
                </button>

                {!isApproved && (
                  <button 
                    onClick={handleAccept}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    ACEPTAR PRESUPUESTO
                  </button>
                )}
             </div>
          </div>
        </div>

        {/* --- FOOTER IMPRESIÓN --- */}
        <div className="hidden print:block p-8 text-center border-t border-slate-100 mt-8">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                Documento generado digitalmente por UrbanFix
            </p>
        </div>

      </div>
    </div>
  );
}