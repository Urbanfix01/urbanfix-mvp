'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
// ✅ IMPORTACIÓN LIMPIA
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
  const [attachments, setAttachments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  
  // Estado para controlar errores de imagen
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    
    // 1. Carga Inicial
    fetchQuoteData(params.id as string);

    // 2. REALTIME
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

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('quote_attachments')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (attachmentsError) {
        console.error('Error cargando adjuntos:', attachmentsError);
      }

      setQuote(quoteData);
      setProfile(quoteData.profiles);
      setItems(itemsData || []);
      setAttachments(attachmentsData || []);
      setAddressInput(quoteData.client_address || '');
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES ---
  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación formal de este presupuesto?')) return;
    
    // Usamos RPC o Update directo según tus políticas RLS (aquí asumo RPC por tu código anterior)
    // Si no tienes RPC configurado para update publico, esto podría requerir ajustes en Supabase
    const { error } = await supabase.rpc('approve_quote', { quote_id: quote.id });

    if (!error) {
      setQuote({ ...quote, status: 'approved' }); // Optimistic update
    } else {
      console.error('Error RPC:', error);
      alert('No se pudo confirmar el presupuesto. Intenta nuevamente.');
    }
  };

  // --- UTILIDAD MAPA ---
  const getGoogleMapsLink = (address: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  };

  // --- CONFIRMAR direccion ---
  const handleConfirmAddress = async () => {
    const cleanAddress = addressInput.trim();
    if (!cleanAddress) {
      alert('Ingresa una direccion valida.');
      return;
    }
    try {
      setAddressSaving(true);
      const { error } = await supabase
        .from('quotes')
        .update({ client_address: cleanAddress })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote((prev: any) => (prev ? { ...prev, client_address: cleanAddress } : prev));
      alert('Direccion confirmada.');
    } catch (err) {
      console.error('Error confirmando direccion:', err);
      alert('No se pudo actualizar la direccion. Intenta nuevamente.');
    } finally {
      setAddressSaving(false);
    }
  };

  const getItemTypeBadge = (item: any) => {
    const raw = (item?.metadata?.type || item?.type || item?.metadata?.category || '').toString().toLowerCase();
    if (raw === 'material' || raw === 'consumable') {
      return { label: 'Material', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (raw === 'labor' || raw === 'mano_de_obra' || raw === 'mano de obra') {
      return { label: 'Mano de obra', className: 'bg-sky-100 text-sky-800 border-sky-200' };
    }
    return null;
  };

  const normalizeItemType = (item: any) => {
    const raw = (item?.metadata?.type || item?.type || item?.metadata?.category || '').toString().toLowerCase();
    if (raw === 'material' || raw === 'consumable') return 'material';
    if (raw === 'labor' || raw === 'mano_de_obra' || raw === 'mano de obra') return 'labor';
    return 'labor';
  };

  const getGroupTotal = (groupItems: any[]) =>
    groupItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  const isImageAttachment = (attachment: any) => {
    if (attachment?.file_type && attachment.file_type.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment?.file_url || '');
  };

  const groupedItems = useMemo(() => {
    const laborItems: any[] = [];
    const materialItems: any[] = [];
    items.forEach((item) => {
      const type = normalizeItemType(item);
      if (type === 'material') {
        materialItems.push(item);
      } else {
        laborItems.push(item);
      }
    });
    return [
      { key: 'labor', label: 'Mano de obra', items: laborItems },
      { key: 'material', label: 'Materiales', items: materialItems },
    ];
  }, [items]);

  // --- CÁLCULOS ---
  const normalizeTaxRate = (value: any) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  };

  const calculateTotal = () => {
    if (!items.length) return { subtotal: 0, tax: 0, total: 0, taxRate: 0, laborSubtotal: 0, materialSubtotal: 0 };
    const laborSubtotal = items
      .filter((item) => normalizeItemType(item) === 'labor')
      .reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const materialSubtotal = items
      .filter((item) => normalizeItemType(item) === 'material')
      .reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const subtotal = laborSubtotal + materialSubtotal;
    const taxRate = normalizeTaxRate(quote?.tax_rate);
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax, taxRate, laborSubtotal, materialSubtotal };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><p className="text-slate-400 animate-pulse">Cargando presupuesto...</p></div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500">Presupuesto no disponible.</div>;

  const { subtotal, tax, total, taxRate, laborSubtotal, materialSubtotal } = calculateTotal();
  const statusNormalized = (quote.status || '').toLowerCase();
  const isApproved = ['approved', 'aprobado', 'accepted'].includes(statusNormalized);
  const isPresented = ['presented', 'pending', 'pendiente', 'sent'].includes(statusNormalized);

  // --- ICONOS SVG ---
  const Icons = {
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    ExternalLink: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:py-10 md:py-12 flex justify-center items-start font-sans antialiased">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-200/50 transition-all">
        
        {/* HEADER (Técnico / Empresa) */}
        <div className="bg-[#0F172A] text-white p-6 sm:p-10 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-10 relative z-10">
            <div className="flex-1 space-y-5 sm:space-y-6">
              {/* LOGO EMPRESA */}
              {profile?.company_logo_url && !imageError ? (
                <img 
                  src={profile.company_logo_url} 
                  alt={profile?.business_name || "Logo"} 
                  onError={() => setImageError(true)}
                  className="h-14 sm:h-16 w-auto object-contain bg-white/95 p-2 rounded-xl shadow-sm" 
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                  {profile?.business_name || profile?.full_name || 'PRESUPUESTO'}
                </h1>
              )}

              <div className="space-y-3 text-slate-300">
                <p className="font-bold text-lg text-white tracking-tight">{profile?.business_name || profile?.full_name}</p>
                <div className="space-y-2 text-sm font-medium opacity-90">
                    <div className="flex items-center gap-3">
                        <Icons.Phone /> 
                        <span>{profile?.phone || 'Telefono no disponible'}</span>
                    </div>
                    {profile?.email && (
                        <div className="flex items-center gap-3">
                            <svg className="w-[18px] h-[18px] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            <span>{profile.email}</span>
                        </div>
                    )}
                    {profile?.company_address && (
                        <div className="flex items-center gap-3 text-slate-400">
                             <Icons.MapPin />
                             <span>{profile.company_address}</span>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right space-y-4">
              <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5">Referencia</p>
                  <p className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest">#{quote.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div
                className={
                  "inline-flex items-center pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border " +
                  (isApproved
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : isPresented
                      ? "bg-blue-500/10 text-blue-100 border-blue-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30")
                }
              >
                <span
                  className={
                    "flex items-center justify-center w-5 h-5 mr-2 rounded-full " +
                    (isApproved
                      ? "bg-emerald-500 text-white"
                      : isPresented
                        ? "bg-blue-500 text-white"
                        : "bg-amber-500 text-black/60")
                  }
                >
                  {isApproved ? <Icons.Check /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                </span>
                {isApproved ? 'Aprobado' : isPresented ? 'Presentado' : 'Pendiente'}
              </div>
            </div>
          </div>
        </div>

        {/* INFO CLIENTE & FECHA */}
        <div className="p-6 sm:p-10 md:p-12 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Icons.MapPin /> Facturar a</p>
              <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">{quote.client_name || 'Cliente Final'}</h2>
                  {/* direccion CLIENTE CLICKEABLE CON MAPA */}
                  <div className="space-y-2">
                    {quote.client_address ? (
                        <a 
                          href={getGoogleMapsLink(quote.client_address, quote.location_lat, quote.location_lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md hover:text-blue-600 hover:underline flex items-start gap-1 group transition-colors"
                        >
                           {quote.client_address}
                           <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Icons.ExternalLink /></span>
                        </a>
                    ) : (
                        <p className="text-slate-400 italic">direccion no especificada</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <input
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="Confirma o corrige la direccion"
                        className="w-full sm:max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      />
                      <button
                        onClick={handleConfirmAddress}
                        disabled={addressSaving || !addressInput.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                          addressSaving || !addressInput.trim()
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99]'
                        }`}
                      >
                        {addressSaving ? 'Guardando...' : 'Confirmar direccion'}
                      </button>
                    </div>
                  </div>
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

        {/* TABLA DE ÍTEMS */}
        <div className="p-6 sm:p-10 md:p-12 bg-white min-h-[350px]">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Detalle</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Items del presupuesto</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">{items.length} items</span>
          </div>
          <div className="hidden md:block">
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
                {groupedItems.map((group) =>
                  group.items.length > 0 ? (
                    <React.Fragment key={group.key}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={4} className="py-3 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                          <div className="flex items-center justify-between">
                            <span>{group.label}</span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {group.items.length} items · ${getGroupTotal(group.items).toLocaleString('es-AR')}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.items.map((item: any, index: number) => {
                        const typeBadge = getItemTypeBadge(item);
                        const rowKey = item.id || `${group.key}-${index}`;
                        return (
                          <tr key={rowKey} className="group hover:bg-slate-50/60 transition-colors">
                            <td className="py-6 px-6 font-semibold text-slate-700">
                              <div className="flex flex-col gap-2">
                                <span>{item.description}</span>
                                {typeBadge && (
                                  <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.className}`}>
                                    {typeBadge.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-6 text-center text-slate-600 font-mono">{item.quantity}</td>
                            <td className="py-6 px-6 text-right text-slate-600 font-mono tabular-nums">${item.unit_price?.toLocaleString('es-AR')}</td>
                            <td className="py-6 px-6 text-right font-bold text-slate-900 font-mono tabular-nums bg-slate-50/30">${(item.quantity * item.unit_price)?.toLocaleString('es-AR')}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-6">
            {groupedItems.map((group) =>
              group.items.length > 0 ? (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <span>{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {group.items.length} items · ${getGroupTotal(group.items).toLocaleString('es-AR')}
                    </span>
                  </div>
                  {group.items.map((item: any, index: number) => {
                    const typeBadge = getItemTypeBadge(item);
                    const rowKey = item.id || `${group.key}-${index}`;
                    return (
                      <div key={rowKey} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                          {typeBadge && (
                            <span className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Cant.</p>
                            <p className="mt-1 font-mono text-slate-700">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Unitario</p>
                            <p className="mt-1 font-mono text-slate-700">${item.unit_price?.toLocaleString('es-AR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Total</p>
                            <p className="mt-1 font-mono font-semibold text-slate-900">${(item.quantity * item.unit_price)?.toLocaleString('es-AR')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null
            )}
          </div>
          {attachments.length > 0 && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Adjuntos</p>
                  <h3 className="text-lg font-bold text-slate-900">Archivos del trabajo</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">{attachments.length} archivos</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.map((file: any) => (
                  <a
                    key={file.id || file.file_url}
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300"
                  >
                    <div className="aspect-video bg-slate-100">
                      {isImageAttachment(file) ? (
                        <img
                          src={file.file_url}
                          alt={file.file_name || 'Archivo adjunto'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                          Archivo adjunto
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {file.file_name || 'Archivo adjunto'}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 sm:mt-12 flex justify-end">
            <div className="w-full sm:w-7/12 md:w-5/12 bg-slate-50 rounded-2xl p-6 sm:p-8 space-y-4 border border-slate-200/60">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Mano de obra</span>
                <span className="font-mono">${laborSubtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Materiales</span>
                <span className="font-mono">${materialSubtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-600"><span>Subtotal</span><span className="font-mono">${subtotal.toLocaleString('es-AR')}</span></div>
              {tax > 0 && (
                 <div className="flex justify-between text-sm font-medium text-slate-600"><span>IVA ({(taxRate * 100).toFixed(0)}%)</span><span className="font-mono">+ ${tax.toLocaleString('es-AR')}</span></div>
              )}
              <div className="border-t-2 border-slate-200 my-4 border-dashed"></div>
              <div className="flex justify-between items-center"><span className="text-lg font-black text-slate-800">TOTAL</span><span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">${total.toLocaleString('es-AR')}</span></div>
            </div>
          </div>
        </div>

        {/* FOOTER & ACCIONES */}
        <div className="bg-slate-50 px-6 sm:px-10 md:px-12 py-8 sm:py-10 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-10">
              
             {/* Términos */}
             <div className="text-xs text-slate-500 max-w-md text-center lg:text-left leading-relaxed opacity-80">
               Al aceptar, confirmas la contratación del servicio con <strong>{profile?.business_name || profile?.full_name}</strong> bajo los términos acordados.
             </div>

             {/* BOTONES */}
             <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto font-bold justify-center">
                
                {/* 1. BOTÓN PDF (Tu componente existente) */}
                <PDFExportButton quote={quote} items={items} profile={profile} />

                {/* 2. BOTÓN ACEPTAR */}
                {!isApproved ? (
                  <button 
                    onClick={handleAccept}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 sm:px-10 py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg hover:shadow-emerald-500/40 transition-all active:scale-[0.98] w-full sm:w-auto"
                  >
                    <span className="tracking-wide text-base sm:text-lg">ACEPTAR PRESUPUESTO</span>
                  </button>
                ) : (
                  <div className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 sm:px-10 py-3.5 sm:py-4 bg-green-100 text-green-800 border border-green-200 rounded-xl cursor-default shadow-inner w-full sm:w-auto">
                    <div className="bg-green-600 rounded-full p-1 text-white">
                        <Icons.Check />
                    </div>
                    <span className="tracking-wide text-base sm:text-lg font-black">¡PRESUPUESTO APROBADO!</span>
                  </div>
                )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

