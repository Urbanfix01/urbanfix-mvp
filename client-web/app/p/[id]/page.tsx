"use client"; 

import { useEffect, useState } from 'react';
// Importación corregida para llegar a tu archivo de conexión
import { supabase } from '../../../lib/supabase/supabase'; 
import { useParams } from 'next/navigation';

// --- TIPOS DE DATOS ---
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
  user_id: string; // ID del técnico (Clave para el Branding)
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
        // 1. BUSCAR EL PRESUPUESTO (Y sus ítems)
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select('*, quote_items(*)')
          .eq('id', id)
          .single();

        if (quoteError) throw quoteError;
        setQuote(quoteData);

        // 2. BUSCAR AL TÉCNICO (Para poner su Logo en el header)
        if (quoteData.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('business_name, full_name, company_logo_url, avatar_url')
            .eq('id', quoteData.user_id)
            .single();

          if (!profileError) {
            setTechnician(profileData);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError('No pudimos encontrar este presupuesto. Verifica el enlace.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // FUNCIÓN: El cliente acepta el presupuesto
  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación de este presupuesto?')) return;
    
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', id);

      if (error) throw error;
      
      // Actualizamos la UI localmente para dar feedback inmediato
      setQuote(prev => prev ? { ...prev, status: 'accepted' } : null);
      alert('¡Excelente! El presupuesto ha sido aprobado.');
    } catch (err) {
      alert('Hubo un error al intentar aceptar. Intenta nuevamente.');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500 font-medium">Cargando propuesta...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!quote) return null;

  const isAccepted = quote.status === 'accepted';

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
        
        {/* --- HEADER: BRANDING PERSONALIZADO --- */}
        <div className="bg-slate-900 text-white p-8 border-b-4 border-orange-500 relative overflow-hidden">
          {/* Fondo decorativo sutil */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg width="100" height="100" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
            <div>
              {/* LÓGICA DE LOGO: Si tiene logo, lo muestra. Si no, muestra el nombre. */}
              {technician?.company_logo_url ? (
                <img 
                  src={technician.company_logo_url} 
                  alt="Logo Empresa" 
                  className="h-16 object-contain mb-3 bg-white rounded-lg p-2 shadow-sm"
                />
              ) : (
                <h1 className="text-3xl font-bold uppercase tracking-wider mb-1">
                  {technician?.business_name || 'Servicio Técnico'}
                </h1>
              )}
              <p className="text-slate-400 text-sm flex items-center">
                <span className="mr-2">👤</span> Técnico responsable: {technician?.full_name}
              </p>
            </div>
            
            <div className="mt-6 md:mt-0 text-left md:text-right">
              <h2 className="text-xl font-bold text-orange-500 tracking-widest">PRESUPUESTO</h2>
              <p className="text-sm text-slate-400 font-mono">#{quote.id.slice(0, 8).toUpperCase()}</p>
              <div className={`mt-3 inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wide ${isAccepted ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}>
                {isAccepted ? '✓ APROBADO' : '⏳ PENDIENTE'}
              </div>
            </div>
          </div>
        </div>

        {/* --- INFORMACIÓN DEL CLIENTE --- */}
        <div className="p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Preparado Para</h3>
            <p className="text-xl font-bold text-gray-800">
              {quote.client_name || 'Estimado Cliente'}
            </p>
            {quote.client_address && (
              <p className="text-gray-600 flex items-center mt-1 text-sm">
                📍 {quote.client_address}
              </p>
            )}
          </div>
          <div className="text-left md:text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Fecha de Emisión</h3>
            <p className="text-gray-700 font-medium">
              {new Date(quote.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* --- TABLA DE ÍTEMS --- */}
        <div className="p-8 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b-2 border-gray-100 text-xs uppercase tracking-wider">
                <th className="pb-3 font-bold w-1/2">Descripción del Servicio / Material</th>
                <th className="pb-3 font-bold text-center">Cant.</th>
                <th className="pb-3 font-bold text-right">Precio Unit.</th>
                <th className="pb-3 font-bold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {quote.quote_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-4 pr-4 font-medium text-gray-800">{item.description}</td>
                  <td className="py-4 text-center">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-500">${item.unit_price.toLocaleString('es-AR')}</td>
                  <td className="py-4 text-right font-bold text-gray-900">
                    ${(item.unit_price * item.quantity).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- TOTALES --- */}
        <div className="bg-gray-50 p-8 flex flex-col items-end border-t border-gray-100">
          <div className="w-full max-w-xs">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Subtotal</span>
              <span className="font-medium text-gray-700">${quote.total_amount.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between items-center py-4 border-t border-gray-300 mt-2">
              <span className="text-xl font-bold text-gray-900">TOTAL</span>
              <span className="text-3xl font-extrabold text-orange-500">
                ${quote.total_amount.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* --- BOTONERA DE ACCIÓN --- */}
        {!isAccepted ? (
          <div className="p-10 bg-white text-center">
            <button 
              onClick={handleAccept}
              className="bg-black text-white text-lg font-bold py-4 px-12 rounded-full shadow-xl hover:bg-gray-800 hover:scale-105 transform transition-all duration-200"
            >
              ACEPTAR PRESUPUESTO
            </button>
            <p className="mt-6 text-xs text-gray-400 max-w-md mx-auto">
              Al hacer clic en "Aceptar", notificas automáticamente a {technician?.business_name || 'tu técnico'} para proceder con el trabajo.
            </p>
          </div>
        ) : (
          <div className="p-8 bg-green-50 text-center border-t border-green-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-green-800 font-bold text-xl">¡Presupuesto Aceptado!</h3>
            <p className="text-green-600 mt-2">Gracias por confiar en nosotros.</p>
          </div>
        )}

      </div>
      
      <div className="mt-12 text-center">
        <p className="text-gray-400 text-xs">
          Documento generado digitalmente por <span className="font-bold text-orange-500">UrbanFix</span>
        </p>
      </div>
    </div>
  );
}