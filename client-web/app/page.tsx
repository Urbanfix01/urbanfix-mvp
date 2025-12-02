'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

// Configuración de Supabase (Lee las variables de entorno)
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
      // 1. Obtener Cotización + Perfil del Técnico
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`*, profiles:user_id (*)`)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // 2. Obtener Ítems
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (itemsError) throw itemsError;

      setQuote(quoteData);
      setProfile(quoteData.profiles);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error:', error);
      // Opcional: Mostrar error en UI
    } finally {
      setLoading(false);
    }
  };

  // 🖨️ FUNCIÓN DE IMPRESIÓN
  const handlePrint = () => {
    window.print();
  };

  // ✅ FUNCIÓN DE ACEPTAR
  const handleAccept = async () => {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'approved' })
      .eq('id', quote.id);

    if (!error) {
      alert('¡Presupuesto aceptado! El técnico será notificado.');
      setQuote({ ...quote, status: 'approved' });
    }
  };

  // 🧮 CÁLCULOS
  const calculateTotal = () => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * 0.21; // IVA 21%
    return { subtotal, tax: taxAmount, total: subtotal + taxAmount };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando presupuesto...</div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center">Presupuesto no encontrado.</div>;

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center print:bg-white print:p-0">
      
      {/* CONTENEDOR TIPO HOJA A4 */}
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:max-w-none print:rounded-none">
        
        {/* --- HEADER (CARD OSCURA) --- */}
        <div className="bg-[#172B4D] text-white p-8 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex justify-between items-start">
            <div>
              {/* LOGO O NOMBRE */}
              {profile?.company_logo_url ? (
                <img 
                  src={profile.company_logo_url} 
                  alt="Logo" 
                  className="h-16 w-auto object-contain mb-3 bg-white rounded p-1"
                />
              ) : (
                <h1 className="text-3xl font-bold uppercase text-orange-500 mb-2">
                  {profile?.business_name || 'PRESUPUESTO'}
                </h1>
              )}
              
              <div className="text-slate-300 text-sm space-y-1 print:text-black">
                 <p className="font-bold text-white print:text-black">{profile?.full_name}</p>
                 <p>{profile?.phone}</p>
                 <p>{profile?.email}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400 print:text-black mb-1">Presupuesto</p>
              <p className="font-mono text-xl mb-4">#{quote.id.slice(0, 8).toUpperCase()}</p>
              
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold print:border print:border-black
                ${quote.status === 'approved' ? 'bg-green-500 text-white print:text-black' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500 print:text-black'}`}>
                {quote.status === 'approved' ? 'APROBADO' : 'PENDIENTE'}
              </div>
            </div>
          </div>
        </div>

        {/* --- DATOS CLIENTE & FECHA --- */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">CLIENTE</p>
            <h2 className="text-xl font-bold text-gray-800">{quote.client_name || 'Cliente Final'}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              📍 {quote.client_address || 'Sin dirección'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">EMISIÓN</p>
            <p className="text-gray-700 font-medium">
              {new Date(quote.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* --- TABLA --- */}
        <div className="p-8 bg-white min-h-[300px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                <th className="py-3">Descripción</th>
                <th className="py-3 text-center">Cant.</th>
                <th className="py-3 text-right">Unitario</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 text-gray-700">
                  <td className="py-4 font-medium">{item.title}</td>
                  <td className="py-4 text-center text-gray-500">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-500">${item.unit_price?.toLocaleString()}</td>
                  <td className="py-4 text-right font-bold text-gray-900">${(item.quantity * item.unit_price)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALES */}
          <div className="mt-12 flex justify-end">
             <div className="w-48 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>IVA (21%)</span>
                  <span>+ ${tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-orange-500 pt-4 border-t border-gray-100">
                  <span>TOTAL</span>
                  <span>${total.toLocaleString()}</span>
                </div>
             </div>
          </div>
        </div>

        {/* --- BOTONES DE ACCIÓN (Se ocultan al imprimir) --- */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 print:hidden flex flex-col items-center gap-4">
          
          {/* GRUPO DE BOTONES */}
          <div className="flex gap-4 w-full justify-center">
            
            {/* BOTÓN 1: IMPRIMIR PDF */}
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-100 transition-colors shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Descargar PDF
            </button>

            {/* BOTÓN 2: ACEPTAR (Solo si no está aprobado) */}
            {quote.status !== 'approved' && (
              <button 
                onClick={handleAccept}
                className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg"
              >
                ACEPTAR PRESUPUESTO
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center max-w-md">
            Al aceptar, notificas automáticamente al técnico para proceder con el trabajo.
            <br/>Documento generado por <strong>UrbanFix</strong>.
          </p>
        </div>

        {/* Footer solo para impresión */}
        <div className="hidden print:block p-8 text-center text-xs text-gray-400">
           Documento generado digitalmente por UrbanFix | {profile?.business_name}
        </div>

      </div>
    </div>
  );
}