'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
// ✅ IMPORTACIÓN LIMPIA: Solo importamos el botón que hace fetch a la API
import PDFExportButton from '../../../components/pdf/PDFExportButton';

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
  
  // Estado para controlar errores de imagen en la vista web
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    
    // 1. Carga Inicial
    fetchQuoteData(params.id as string);

    // 2. REALTIME: Escuchar cambios en vivo (Si aprueban desde el móvil, se actualiza aquí)
    const channel = supabase
      .channel('realtime-quote')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Cambio detectado:', payload);
          setQuote((prev: any) => ({ ...prev, ...payload.new }));
        }
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

  // --- ACCIONES ---
  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación formal de este presupuesto?')) return;
    
    const { error } = await supabase.rpc('approve_quote', { quote_id: quote.id });

    if (!error) {
      setQuote({ ...quote, status: 'approved' }); // Optimistic update
    } else {
      console.error('Error RPC:', error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };

  // --- CÁLCULOS ---
  const calculateTotal = () => {
    if (!items.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.21; 
    return { subtotal, tax, total: subtotal + tax };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><p className="text-slate-400 animate-pulse">Cargando...</p></div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500">Presupuesto no disponible.</div>;

  const { subtotal, tax, total } = calculateTotal();
  
  // Normalización de estado (igual que en Mobile)
  const isApproved = ['approved', 'accepted', 'aprobado'].includes(quote.status?.toLowerCase());

  // --- ICONOS SVG ---
  const Icons = {
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mt-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 flex justify-center items-start font-sans antialiased">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-200/50 transition-all">
        
        {/* HEADER */}
        <div className="bg-[#0F172A] text-white p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
            <div className="flex-1 space-y-6">
              {profile?.company_logo_url && !imageError ? (
                <img 
                  src={profile.company_logo_url} 
                  alt={profile?.business_name || "Logo"} 
                  onError={() => setImageError(true)}
                  className="h-14 w-auto object-contain bg-white/95 p-2 rounded-xl shadow-sm" 
                />
              ) : (
                <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                  {profile?.business_name || 'PRESUPUESTO'}
                </h1>
              )}
              <div className="space-y-3 text-slate-300">
                <p className="font-bold text-lg text-white tracking-tight">{profile?.full_name}</p>
                <div className="space-y-1.5 text-sm font-medium opacity-90">
                    <div className="flex items-center gap-3"><Icons.Phone /> <span>{profile?.phone || 'Teléfono no disponible'}</span></div>
                    {profile?.email && <p className="pl-8">{profile.email}</p>}
                </div>
              </div>
            </div>
            <div className="text-left md:text-right space-y-4">
              <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5">Referencia</p>
                  <p className="font-mono text-2xl font-bold text-white tracking-widest">#{quote.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className={`inline-flex items-center pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${isApproved ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                <span className={`flex items-center justify-center w-5 h-5 mr-2 rounded-full ${isApproved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black/60'}`}>{isApproved ? <Icons.Check /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}</span>
                {isApproved ? 'Aprobado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        {/* INFO */}
        <div className="p-12 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Icons.MapPin /> Facturar a</p>
              <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{quote.client_name || 'Cliente Final'}</h2>
                  <p className="text-slate-600 text-base leading-relaxed max-w-md">{quote.client_address || 'Dirección no especificada.'}</p>
              </div>
            </div>
            <div className="md:text-right space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 md:justify-end"><Icons.Calendar /> Emisión</p>
              <div>
                  <p className="text-slate-900 font-bold text-xl">{new Date(quote.created_at).toLocaleDateString('es-AR')}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1.5">Válido por 15 días</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="p-12 bg-white min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Descripción</th>
                <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-1/6">Cant.</th>
                <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-1/6">Unitario</th>
                <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-1/6">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {items.map((item, i) => (
                <tr key={i} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="py-6 px-6 font-semibold text-slate-700">{item.description}</td>
                  <td className="py-6 px-6 text-center text-slate-600 font-mono">{item.quantity}</td>
                  <td className="py-6 px-6 text-right text-slate-600 font-mono tabular-nums">${item.unit_price?.toLocaleString('es-AR')}</td>
                  <td className="py-6 px-6 text-right font-bold text-slate-900 font-mono tabular-nums bg-slate-50/30">${(item.quantity * item.unit_price)?.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-12 flex justify-end">
            <div className="w-full md:w-5/12 bg-slate-50 rounded-2xl p-8 space-y-4 border border-slate-200/60">
              <div className="flex justify-between text-sm font-medium text-slate-600"><span>Subtotal</span><span className="font-mono">${subtotal.toLocaleString('es-AR')}</span></div>
              <div className="flex justify-between text-sm font-medium text-slate-600"><span>IVA (21%)</span><span className="font-mono">+ ${tax.toLocaleString('es-AR')}</span></div>
              <div className="border-t-2 border-slate-200 my-4 border-dashed"></div>
              <div className="flex justify-between items-center"><span className="text-lg font-black text-slate-800">TOTAL</span><span className="text-3xl font-black text-slate-900 font-mono">${total.toLocaleString('es-AR')}</span></div>
            </div>
          </div>
        </div>

        {/* FOOTER & ACCIONES */}
        <div className="bg-slate-50 px-12 py-10 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
             
             {/* Términos */}
             <div className="text-xs text-slate-500 max-w-md text-center lg:text-left leading-relaxed opacity-80">
               Al aceptar, confirmas la contratación del servicio con <strong>{profile?.business_name}</strong> bajo los términos acordados.
             </div>

             {/* BOTONES */}
             <div className="flex items-center gap-4 w-full lg:w-auto font-bold justify-center">
                
                {/* 1. BOTÓN PDF (Usando API Backend) */}
                <PDFExportButton quote={quote} items={items} profile={profile} />

                {/* 2. BOTÓN ACEPTAR */}
                {!isApproved ? (
                  <button 
                    onClick={handleAccept}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg hover:shadow-emerald-500/40 transition-all active:scale-[0.98] w-full sm:w-auto"
                  >
                    <span className="tracking-wide text-lg">ACEPTAR PRESUPUESTO</span>
                  </button>
                ) : (
                  <div className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-green-100 text-green-800 border border-green-200 rounded-xl cursor-default shadow-inner w-full sm:w-auto">
                    <div className="bg-green-600 rounded-full p-1 text-white">
                        <Icons.Check />
                    </div>
                    <span className="tracking-wide text-lg font-black">¡PRESUPUESTO APROBADO!</span>
                  </div>
                )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}