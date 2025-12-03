'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import PDFExportButton from '../../../components/pdf/PDFExportButton'; // Importación normal

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
    if (!params.id) return;
    
    fetchQuoteData(params.id as string);

    const channel = supabase
      .channel('realtime-quote')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `id=eq.${params.id}` },
        (payload) => setQuote((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  const fetchQuoteData = async (quoteId: string) => {
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`*, profiles:user_id (*)`)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

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

  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación formal de este presupuesto?')) return;
    const { error } = await supabase.rpc('approve_quote', { quote_id: quote.id });
    if (!error) setQuote({ ...quote, status: 'approved' });
    else alert('Hubo un error al procesar la solicitud.');
  };

  const calculateTotal = () => {
    if (!items.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.21; 
    return { subtotal, tax, total: subtotal + tax };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><p className="text-slate-400 animate-pulse">Cargando...</p></div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500">Presupuesto no disponible.</div>;

  const { subtotal, tax, total } = calculateTotal();
  const isApproved = ['approved', 'accepted', 'aprobado'].includes(quote.status?.toLowerCase());

  // Iconos SVG inline para no depender de librerías externas en este snippet
  const Icons = {
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 flex justify-center items-start font-sans antialiased">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-200/50 transition-all">
        {/* HEADER */}
        <div className="bg-[#0F172A] text-white p-12 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
            <div className="flex-1 space-y-6">
              {profile?.company_logo_url ? (
                <img src={profile.company_logo_url} alt="Logo" className="h-14 w-auto object-contain bg-white/95 p-2 rounded-xl shadow-sm" />
              ) : (
                <h1 className="text-2xl font-black uppercase tracking-wider text-white">{profile?.business_name || 'PRESUPUESTO'}</h1>
              )}
              <div className="space-y-3 text-slate-300">
                <p className="font-bold text-lg text-white tracking-tight">{profile?.full_name}</p>
                <p className="text-sm">{profile?.phone}</p>
              </div>
            </div>
            <div className="text-left md:text-right space-y-4">
              <p className="font-mono text-2xl font-bold text-white tracking-widest">#{quote.id.slice(0, 8).toUpperCase()}</p>
              <div className={`inline-flex items-center pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${isApproved ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                <span className={`flex items-center justify-center w-5 h-5 mr-2 rounded-full ${isApproved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black/60'}`}>{isApproved ? <Icons.Check /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}</span>
                {isApproved ? 'Aprobado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        {/* INFO & TABLA (Simplificado para brevedad, mantén tu diseño) */}
        <div className="p-12 bg-white min-h-[350px]">
            <h2 className="text-xl font-bold mb-4">Detalle del Trabajo</h2>
            <table className="w-full text-left border-collapse">
                <thead><tr className="border-b"><th className="py-2">Descripción</th><th className="py-2 text-right">Total</th></tr></thead>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100"><td className="py-4">{item.description}</td><td className="py-4 text-right font-mono">${(item.quantity * item.unit_price).toLocaleString()}</td></tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-8 text-right text-2xl font-black">${total.toLocaleString()}</div>
        </div>

        {/* FOOTER & ACCIONES */}
        <div className="bg-slate-50 px-12 py-10 border-t border-slate-200">
          <div className="flex items-center justify-end gap-4">
             
             {/* 1. BOTÓN PDF (Limpio, sin lógica compleja) */}
             <PDFExportButton quote={quote} items={items} profile={profile} />

             {/* 2. BOTÓN ACEPTAR */}
             {!isApproved && (
               <button onClick={handleAccept} className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all">
                 ACEPTAR PRESUPUESTO
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}