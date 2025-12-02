'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import { Printer, Check, Building2, Phone, Mail, MapPin, Calendar } from 'lucide-react'; // Usamos lucide-react si está disponible, sino iconos SVG manuales abajo

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
      // 1. Obtener cotización + perfil con JOIN explícito
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`*, profiles:user_id!fk_quotes_profiles (*)`) // Forzamos el uso de la FK correcta
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

  // --- ACCIONES ---
  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación formal de este presupuesto?')) return;
    
    // Usamos la función segura RPC para aprobar
    const { error } = await supabase.rpc('approve_quote', { quote_id: quote.id });

    if (!error) {
      alert('¡Excelente! Presupuesto aprobado correctamente.');
      setQuote({ ...quote, status: 'approved' });
    } else {
      console.error('Error RPC:', error);
      alert('Hubo un error al procesar la solicitud. Por favor intenta nuevamente.');
    }
  };

  // --- CÁLCULOS ---
  const calculateTotal = () => {
    if (!items.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.21; // IVA Fijo 21% ARG
    return { subtotal, tax, total: subtotal + tax };
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
      <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium text-sm uppercase tracking-widest animate-pulse">Cargando...</p>
    </div>
  );
  
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold bg-slate-100">Documento no disponible o enlace expirado.</div>;

  const { subtotal, tax, total } = calculateTotal();
  const isApproved = quote.status === 'approved';

  // --- COMPONENTES DE UI INTERNOS (Iconos SVG para no depender de librerías externas en este archivo) ---
  const Icons = {
    Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Building: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>,
    Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mt-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  };

  return (
    // FONDO GENERAL GRIS LIMPIO
    <div className="min-h-screen bg-slate-100 py-12 px-4 flex justify-center items-start print:bg-white print:p-0 font-sans antialiased">
      
      {/* --- HOJA PRINCIPAL ESTILO "PREMIUM PAPER" --- */}
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:max-w-none print:rounded-none ring-1 ring-slate-200/50 transition-all">
        
        {/* === HEADER CORPORATIVO === */}
        <div className="bg-[#0F172A] text-white p-12 print:bg-white print:text-black print:border-b-2 print:border-black relative overflow-hidden">
          {/* Elemento decorativo de fondo sutil */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/5 rounded-full blur-3xl print:hidden"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
            
            {/* --- IZQUIERDA: Marca del Profesional --- */}
            <div className="flex-1 space-y-6">
              {profile?.company_logo_url ? (
                <img src={profile.company_logo_url} alt="Logo" className="h-14 w-auto object-contain bg-white/95 p-2 rounded-xl shadow-sm" />
              ) : (
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                        <Icons.Building />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                    {profile?.business_name || 'URBANFIX PRO'}
                    </h1>
                </div>
              )}
              
              <div className="space-y-3 text-slate-300 print:text-black">
                <p className="font-bold text-lg text-white print:text-black tracking-tight">{profile?.full_name}</p>
                <div className="space-y-1.5 text-sm font-medium opacity-90">
                    <div className="flex items-center gap-3"><Icons.Phone /> <span>{profile?.phone || 'Teléfono no disponible'}</span></div>
                    {profile?.email && <div className="flex items-center gap-3"><Mail size={18} className="opacity-60"/> <span>{profile.email}</span></div>}
                </div>
              </div>
            </div>

            {/* --- DERECHA: Metadatos del Documento --- */}
            <div className="text-left md:text-right space-y-4">
              <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 print:text-black mb-1.5">Referencia</p>
                  <p className="font-mono text-2xl font-bold text-white print:text-black tracking-widest">#{quote.id.slice(0, 8).toUpperCase()}</p>
              </div>
              
              {/* Badge de Estado "Piloto" */}
              <div className={`inline-flex items-center pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border print:border-black
                ${isApproved 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                <span className={`flex items-center justify-center w-5 h-5 mr-2 rounded-full ${isApproved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black/60'}`}>
                    {isApproved ? <Icons.Check /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                </span>
                {isApproved ? 'Aprobado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        {/* === SECCIÓN DE INFORMACIÓN (Grid Limpio) === */}
        <div className="p-12 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Cliente */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Icons.MapPin /> Facturar a</p>
              <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{quote.client_name || 'Cliente Final'}</h2>
                  <p className="text-slate-600 text-base leading-relaxed max-w-md">{quote.client_address || 'Dirección no especificada en el documento.'}</p>
              </div>
            </div>

            {/* Fechas */}
            <div className="md:text-right space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 md:justify-end"><Icons.Calendar /> Detalles de Emisión</p>
              <div>
                  <p className="text-slate-900 font-bold text-xl">
                    {new Date(quote.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-medium text-slate-500 mt-1.5">Válido por 15 días hábiles</p>
              </div>
            </div>
          </div>
        </div>

        {/* === TABLA DE ÍTEMS (Alineación Perfecta) === */}
        <div className="p-12 bg-white min-h-[350px]">
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Descripción del Servicio / Material</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-1/6">Cant.</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-1/6">Unitario</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-1/6">Subtotal</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i} className="group hover:bg-slate-50/60 transition-colors">
                    <td className="py-6 px-6 pr-4 font-semibold text-slate-700 leading-snug">
                      {item.description}
                    </td>
                    <td className="py-6 px-6 text-center text-slate-600 font-mono font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-6 px-6 text-right text-slate-600 font-mono tabular-nums tracking-tight">
                      ${item.unit_price?.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-6 px-6 text-right font-bold text-slate-900 font-mono tabular-nums tracking-tight bg-slate-50/30 group-hover:bg-slate-100/50 transition-colors">
                      ${(item.quantity * item.unit_price)?.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* === TOTALES (Tarjeta Flotante) === */}
          <div className="mt-12 flex justify-end">
            <div className="w-full md:w-5/12 bg-slate-50 rounded-2xl p-8 space-y-4 border border-slate-200/60 shadow-sm print:bg-transparent print:p-0 print:border-0 print:shadow-none">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Subtotal Neto</span>
                <span className="font-mono tabular-nums">${subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>IVA (21%)</span>
                <span className="font-mono tabular-nums">+ ${tax.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="border-t-2 border-slate-200 my-4 border-dashed"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-slate-800 uppercase tracking-wide">TOTAL A PAGAR</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono tabular-nums">
                  ${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === FOOTER DE ACCIONES (Solo Pantalla) === */}
        <div className="bg-slate-50 px-12 py-10 border-t border-slate-200 print:hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
             
             {/* Términos Legales */}
             <div className="text-xs text-slate-500 max-w-md text-center lg:text-left leading-relaxed opacity-80">
               <strong className="text-slate-700 font-bold block mb-1">Términos y Condiciones</strong>
               Al hacer clic en "Aceptar Presupuesto", se formaliza un acuerdo de servicio vinculante basado en los detalles aquí descritos. Este documento tiene validez comercial.
             </div>

             {/* Botonera */}
             <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto font-bold">
                <button 
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-slate-300 rounded-xl text-slate-700 hover:border-slate-800 hover:text-slate-900 transition-all shadow-sm active:scale-[0.98]"
                >
                  <Icons.Printer />
                  <span>Descargar / Imprimir</span>
                </button>

                {!isApproved && (
                  <button 
                    onClick={handleAccept}
                    className="group flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                    <Icons.Check />
                    <span className="tracking-wide text-lg">ACEPTAR PRESUPUESTO</span>
                  </button>
                )}
             </div>
          </div>
        </div>

        {/* === FOOTER DE IMPRESIÓN (Marca de Agua) === */}
        <div className="hidden print:flex justify-between items-center p-8 text-center border-t border-slate-200 mt-8 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
            <p>Documento ID: {quote.id}</p>
            <p>Generado vía plataforma UrbanFix</p>
        </div>

      </div>
      {/* Fin de la Hoja */}
      
    </div>
  );
}