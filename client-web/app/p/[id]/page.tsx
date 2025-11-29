"use client"; 

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/supabase'; 
import { useParams } from 'next/navigation';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  client_name?: string;
  client_address?: string;
  user_id: string;
  quote_items: QuoteItem[];
}

interface TechnicianProfile {
  business_name: string;
  full_name: string;
  company_logo_url?: string;
  avatar_url?: string;
}

export default function BudgetPage() {
  const params = useParams();
  const id = params?.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [technician, setTechnician] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select('*, quote_items(*)')
          .eq('id', id)
          .single();

        if (quoteError) throw quoteError;
        setQuote(quoteData);

        if (quoteData.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('business_name, full_name, company_logo_url, avatar_url')
            .eq('id', quoteData.user_id)
            .single();

          if (!profileError) setTechnician(profileData);
        }
      } catch (err: any) {
        console.error(err);
        setError('Presupuesto no disponible.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación de este presupuesto?')) return;
    try {
      const { error } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', id);
      if (error) throw error;
      setQuote(prev => prev ? { ...prev, status: 'accepted' } : null);
    } catch (err) {
      alert('Error al actualizar.');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 font-medium tracking-wide">Cargando...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!quote) return null;

  const isAccepted = quote.status === 'accepted';

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5">
        
        {/* --- HEADER PREMIUM --- */}
        <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div>
              {/* TÍTULO NARANJA (Reemplaza al Logo roto) */}
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-orange-500 uppercase leading-none">
                {technician?.business_name || 'URBANFIX'}
              </h1>
              
              <div className="flex items-center mt-3 text-slate-400 text-sm font-medium">
                <span className="bg-slate-800 p-1.5 rounded-md mr-2">
                  👤
                </span>
                {technician?.full_name}
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 md:text-right">
              <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mb-1">Presupuesto</p>
              <p className="text-white font-mono text-sm opacity-80">#{quote.id.slice(0, 8).toUpperCase()}</p>
              
              <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${isAccepted ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${isAccepted ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                {isAccepted ? 'APROBADO' : 'PENDIENTE'}
              </div>
            </div>
          </div>
        </div>

        {/* --- INFO CLIENTE --- */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</h3>
            <p className="text-lg font-bold text-gray-900">
              {quote.client_name || 'Estimado Cliente'}
            </p>
            {quote.client_address && (
              <p className="text-gray-500 text-sm mt-1 flex items-center">
                📍 {quote.client_address}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Emisión</h3>
            <p className="text-gray-700 font-medium">
              {new Date(quote.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* --- TABLA LIMPIA --- */}
        <div className="p-6 sm:p-8">
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Descripción</th>
                  <th className="py-3 px-4 font-semibold text-center w-16">Cant.</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm divide-y divide-gray-100">
                {quote.quote_items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 font-medium text-gray-800">{item.description}</td>
                    <td className="py-4 px-4 text-center text-gray-500">{item.quantity}</td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900">
                      ${(item.unit_price * item.quantity).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- TOTALES --- */}
        <div className="px-8 pb-8 flex flex-col items-end">
          <div className="w-full max-w-xs pt-4 border-t border-dashed border-gray-200">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-gray-500 mb-1">Total a Pagar</span>
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                ${quote.total_amount.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* --- ACCIONES --- */}
        {/* Aquí la magia: Si está aprobado, mostramos un banner verde elegante. Si no, el botón negro. */}
        <div className="bg-gray-50 p-8 border-t border-gray-100 text-center">
          {!isAccepted ? (
            <>
              <button 
                onClick={handleAccept}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white text-lg font-bold py-4 px-12 rounded-xl shadow-xl shadow-orange-500/10 transform transition-all duration-200 active:scale-95"
              >
                ACEPTAR PRESUPUESTO
              </button>
              <p className="mt-4 text-xs text-gray-400 mx-auto max-w-sm">
                Al aceptar, se notificará inmediatamente a {technician?.full_name} para coordinar el trabajo.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-green-700 font-bold text-xl">Confirmado</h3>
              <p className="text-green-600/80 text-sm mt-1">Este trabajo ya está en marcha.</p>
            </div>
          )}
        </div>

      </div>
      
      {/* Footer Branding Sutil */}
      <div className="mt-12 mb-6 flex justify-center items-center opacity-60 grayscale hover:grayscale-0 transition-all">
        <span className="text-xs text-gray-400 mr-2">Powered by</span>
        <span className="text-sm font-black text-orange-500 tracking-wide">URBANFIX</span>
      </div>
    </div>
  );
}