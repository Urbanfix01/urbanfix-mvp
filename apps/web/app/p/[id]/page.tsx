'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase/supabase';
import { useParams } from 'next/navigation';
import { Manrope } from 'next/font/google';
// ✅ IMPORTACIÓN LIMPIA
import PDFExportButton from '../../../components/pdf/PDFExportButton';

// --- CONFIGURACIÓN SUPABASE ---

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function QuotePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({});
  const [revisionMode, setRevisionMode] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({
    rating: 5,
    comment: '',
    isPublic: true,
  });
  const [feedbackSaved, setFeedbackSaved] = useState<null | {
    id: string;
    rating: number;
    comment: string;
    isPublic: boolean;
  }>(null);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_items',
          filter: `quote_id=eq.${params.id}`
        },
        () => {
          fetchQuoteData(params.id as string);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_attachments',
          filter: `quote_id=eq.${params.id}`
        },
        () => {
          fetchQuoteData(params.id as string);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  useEffect(() => {
    setSelectedItemIds((prev) => {
      const next = new Set<string>();
      items.forEach((item) => {
        const id = item?.id?.toString();
        if (id && prev.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
    setRevisionNotes((prev) => {
      const next: Record<string, string> = {};
      items.forEach((item) => {
        const id = item?.id?.toString();
        if (id && prev[id]) {
          next[id] = prev[id];
        }
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    const status = String(quote?.status || '').trim().toLowerCase();
    const isClosed = ['completed', 'completado', 'finalizado', 'finalizados', 'paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);
    if (isClosed) {
      setRevisionMode(false);
    }
  }, [quote?.status]);

  useEffect(() => {
    const loadFeedback = async () => {
      const requestId = String(quote?.client_request_id || '').trim();
      const status = String(quote?.status || '').trim().toLowerCase();
      const isClosed = ['completed', 'completado', 'finalizado', 'finalizados', 'paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(status);

      if (!requestId || !isClosed) {
        setFeedbackSaved(null);
        setFeedbackNotice('');
        setFeedbackError('');
        return;
      }

      setFeedbackLoading(true);
      setFeedbackError('');
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setFeedbackSaved(null);
          setFeedbackNotice('Inicia sesion como cliente para calificar este trabajo.');
          return;
        }

        setFeedbackNotice('');

        const { data, error } = await supabase
          .from('client_request_feedback')
          .select('id, rating, comment, is_public')
          .eq('client_request_id', requestId)
          .eq('client_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const normalized = {
            id: String(data.id),
            rating: Math.min(5, Math.max(1, Number(data.rating || 5))),
            comment: String(data.comment || ''),
            isPublic: Boolean(data.is_public),
          };
          setFeedbackSaved(normalized);
          setFeedbackDraft({
            rating: normalized.rating,
            comment: normalized.comment,
            isPublic: normalized.isPublic,
          });
        } else {
          setFeedbackSaved(null);
          setFeedbackDraft({ rating: 5, comment: '', isPublic: true });
        }
      } catch (error: any) {
        console.error('Error cargando feedback:', error);
        setFeedbackError(error?.message || 'No pudimos cargar tu calificacion.');
      } finally {
        setFeedbackLoading(false);
      }
    };

    void loadFeedback();
  }, [quote?.client_request_id, quote?.status]);

  const fetchQuoteBundle = async (quoteId: string) => {
    const attempt = async (params: Record<string, string>) => {
      const { data, error } = await supabase.rpc('get_public_quote_bundle', params);
      if (error) throw error;
      return data as any;
    };
    let bundle: any;
    try {
      bundle = await attempt({ p_quote_id: quoteId });
    } catch (error) {
      bundle = await attempt({ quote_id: quoteId });
    }
    setQuote(bundle?.quote || null);
    setProfile(bundle?.profile || null);
    setItems(Array.isArray(bundle?.items) ? bundle.items : []);
    setAttachments(Array.isArray(bundle?.attachments) ? bundle.attachments : []);
    setAddressInput(bundle?.quote?.client_address || '');
  };

  const fetchQuoteData = async (quoteId: string) => {
    try {
      await fetchQuoteBundle(quoteId);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES ---
  const handleAccept = async () => {
    if (!confirm('¿Confirmas la aceptación formal de este presupuesto?')) return;
    if (accepting) return;
    try {
      setAccepting(true);
      const { data, error } = await supabase.rpc('approve_quote', { quote_id: quote.id });
      if (error) throw error;
      if (data && data.id) {
        setQuote(data);
      } else {
        await fetchQuoteData(quote.id);
      }
    } catch (err: any) {
      console.error('Error RPC:', err);
      alert(err?.message || 'No se pudo confirmar el presupuesto. Intenta nuevamente.');
    } finally {
      setAccepting(false);
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

  const handleRequestRevision = async () => {
    if (!quote?.id) return;
    if (selectedItems.length === 0) {
      alert('Selecciona los items que deseas revisar.');
      return;
    }
    const missingNote = selectedItems.find((item) => !getItemNote(item).trim());
    if (missingNote) {
      alert('Agrega una breve descripcion para cada item seleccionado.');
      return;
    }
    if (!confirm('¿Enviar solicitud de revision al tecnico?')) return;
    try {
      setRequestingRevision(true);
      const itemsPayload = selectedItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: Number(item.quantity) * Number(item.unit_price),
        type: normalizeItemType(item),
        note: getItemNote(item).trim(),
      }));
      const { error } = await supabase.rpc('request_quote_revision', {
        quote_id: quote.id,
        items: itemsPayload,
      });
      if (error) throw error;
      setSelectedItemIds(new Set());
      setRevisionNotes({});
      setRevisionMode(false);
      alert('Solicitud enviada.');
    } catch (err) {
      console.error('Error solicitando revision:', err);
      alert((err as any)?.message || 'No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleToggleRevisionMode = () => {
    if (revisionMode) {
      setRevisionMode(false);
      setSelectedItemIds(new Set());
      setRevisionNotes({});
      return;
    }
    setRevisionMode(true);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('items-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleFeedback = async () => {
    const requestId = String(quote?.client_request_id || '').trim();
    if (!requestId) {
      alert('Este trabajo todavia no esta vinculado a una solicitud del cliente.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Inicia sesion como cliente para dejar tu calificacion.');
      return;
    }

    setFeedbackOpen((current) => !current);
    setFeedbackError('');
    setFeedbackNotice('');

    if (typeof window !== 'undefined') {
      const el = document.getElementById('feedback-panel');
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  };

  const handleSubmitFeedback = async () => {
    const requestId = String(quote?.client_request_id || '').trim();
    const comment = feedbackDraft.comment.trim();
    if (!requestId) {
      alert('Este trabajo no tiene una solicitud vinculada para guardar la calificacion.');
      return;
    }
    if (feedbackDraft.rating < 1 || feedbackDraft.rating > 5) {
      alert('Selecciona una calificacion entre 1 y 5 estrellas.');
      return;
    }
    if (comment.length < 6) {
      alert('Escribe un comentario breve sobre el trabajo realizado.');
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setFeedbackError('');

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || '';
      if (!token) {
        throw new Error('Inicia sesion como cliente para guardar tu calificacion.');
      }

      const response = await fetch(`/api/client/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'submit_feedback',
          rating: feedbackDraft.rating,
          comment,
          isPublic: feedbackDraft.isPublic,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || 'No pudimos guardar tu calificacion.'));
      }

      const saved = {
        id: feedbackSaved?.id || `feedback-${requestId}`,
        rating: feedbackDraft.rating,
        comment,
        isPublic: feedbackDraft.isPublic,
      };
      setFeedbackSaved(saved);
      setFeedbackDraft(saved);
      setFeedbackOpen(false);
      setFeedbackNotice('Tu calificacion quedo guardada para este trabajo.');
    } catch (error: any) {
      console.error('Error guardando feedback:', error);
      setFeedbackError(error?.message || 'No pudimos guardar tu calificacion.');
    } finally {
      setFeedbackSubmitting(false);
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

  const getItemId = (item: any) => (item?.id ? item.id.toString() : '');

  const isItemSelected = (item: any) => {
    const id = getItemId(item);
    return id ? selectedItemIds.has(id) : false;
  };

  const toggleItemSelection = (item: any) => {
    const id = getItemId(item);
    if (!id) return;
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getItemNote = (item: any) => {
    const id = getItemId(item);
    return id ? revisionNotes[id] || '' : '';
  };

  const setItemNote = (item: any, value: string) => {
    const id = getItemId(item);
    if (!id) return;
    setRevisionNotes((prev) => ({ ...prev, [id]: value }));
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

  const selectedItems = useMemo(
    () => items.filter((item) => isItemSelected(item)),
    [items, selectedItemIds]
  );

  // --- CÁLCULOS ---
  const normalizeTaxRate = (value: any) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  };

  const calculateTotal = () => {
    if (!items.length)
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        taxRate: 0,
        laborSubtotal: 0,
        materialSubtotal: 0,
        discountPercent: 0,
        discountAmount: 0,
      };
    const laborSubtotal = items
      .filter((item) => normalizeItemType(item) === 'labor')
      .reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const materialSubtotal = items
      .filter((item) => normalizeItemType(item) === 'material')
      .reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const subtotal = laborSubtotal + materialSubtotal;
    const taxRate = normalizeTaxRate(quote?.tax_rate);
    const rawDiscount = quote?.discount_percent;
    const parsedDiscount =
      typeof rawDiscount === 'number' ? rawDiscount : Number(rawDiscount);
    const hasDiscountPercent =
      rawDiscount !== null &&
      rawDiscount !== undefined &&
      rawDiscount !== '' &&
      Number.isFinite(parsedDiscount);
    let discountPercent = 0;
    let discountAmount = 0;
    let discountedSubtotal = subtotal;

    if (hasDiscountPercent) {
      discountPercent = Math.min(100, Math.max(0, parsedDiscount));
      discountAmount = subtotal * (discountPercent / 100);
      discountedSubtotal = subtotal - discountAmount;
    } else {
      const rawTotal = Number(quote?.total_amount);
      if (Number.isFinite(rawTotal) && rawTotal > 0) {
        const divisor = 1 + taxRate;
        const subtotalFromTotal = divisor > 0 ? rawTotal / divisor : rawTotal;
        const inferredDiscount = Math.max(0, subtotal - subtotalFromTotal);
        if (subtotal > 0 && inferredDiscount > 0) {
          discountAmount = inferredDiscount;
          discountPercent = Math.min(100, (inferredDiscount / subtotal) * 100);
          discountedSubtotal = subtotalFromTotal;
        }
      }
    }

    const tax = discountedSubtotal * taxRate;
    return {
      subtotal,
      tax,
      total: discountedSubtotal + tax,
      taxRate,
      laborSubtotal,
      materialSubtotal,
      discountPercent,
      discountAmount,
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><p className="text-slate-400 animate-pulse">Cargando presupuesto...</p></div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center text-red-500">Presupuesto no disponible.</div>;

  const { subtotal, tax, total, taxRate, laborSubtotal, materialSubtotal, discountPercent, discountAmount } =
    calculateTotal();
  const statusNormalized = (quote.status || '').toLowerCase();
  const isApproved = ['approved', 'aprobado', 'accepted'].includes(statusNormalized);
  const isPresented = ['presented', 'pending', 'pendiente', 'sent'].includes(statusNormalized);
  const isCompleted = ['completed', 'completado', 'finalizado', 'finalizados'].includes(statusNormalized);
  const isPaid = ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(statusNormalized);
  const isRejected = ['rejected', 'rechazado'].includes(statusNormalized);
  const isClosedForEditing = isCompleted || isPaid;
  const createdAt = quote?.created_at ? new Date(quote.created_at) : null;
  const validityDays = 15;
  const expiresAt = createdAt
    ? new Date(createdAt.getTime() + validityDays * 24 * 60 * 60 * 1000)
    : null;
  const isAccepted = isApproved || isCompleted || isPaid;
  const canRequestRevision = !isClosedForEditing;
  const canCollectFeedback = Boolean(isClosedForEditing && quote?.client_request_id);
  const isExpired = Boolean(expiresAt && Date.now() > expiresAt.getTime() && !isAccepted && !isRejected);
  const statusLabel = isExpired
    ? 'Presupuesto desestimado'
    : isRejected
      ? 'Rechazado'
      : isPaid
        ? 'Cobrado'
        : isCompleted
          ? 'Finalizado'
          : isApproved
            ? 'Aprobado'
            : isPresented
              ? 'Presentado'
              : 'Pendiente';
  const statusPillClass =
    isExpired || isRejected
      ? 'bg-rose-500/15 text-rose-200 border-rose-500/30'
      : isAccepted
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : isPresented
          ? 'bg-blue-500/10 text-blue-100 border-blue-500/30'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  const statusIconClass =
    isExpired || isRejected
      ? 'bg-rose-500 text-white'
      : isAccepted
        ? 'bg-emerald-500 text-white'
        : isPresented
          ? 'bg-blue-500 text-white'
          : 'bg-amber-500 text-black/60';
  const roadmapSteps = [
    { key: 'draft', label: 'Computo' },
    { key: 'sent', label: 'Enviado' },
    { key: 'approved', label: 'Aprobado' },
    { key: 'completed', label: 'Finalizado' },
    { key: 'paid', label: 'Cobrado' },
  ];
  const roadmapIndex = (() => {
    if (isPaid) return 4;
    if (isCompleted) return 3;
    if (isApproved) return 2;
    if (isPresented) return 1;
    return 0;
  })();
  const businessLabel = profile?.business_name || profile?.full_name || 'UrbanFix';
  const technicianLabel = profile?.full_name || profile?.business_name || 'Tecnico UrbanFix';
  const quoteReference = `#${String(quote?.id || '').slice(0, 8).toUpperCase()}`;
  const createdLabel = createdAt
    ? createdAt.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Fecha no disponible';
  const expiresLabel = expiresAt
    ? expiresAt.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin vencimiento';
  const clientLabel = quote?.client_name || 'Cliente final';
  const serviceAddress = quote?.client_address || 'Direccion a confirmar';
  const formatCurrency = (value: number) => `$${value.toLocaleString('es-AR')}`;
  const actionTitle = isRejected
    ? 'Este presupuesto fue rechazado'
    : isExpired
      ? 'La propuesta vencio'
      : canCollectFeedback
        ? 'Trabajo listo para cerrar'
        : isAccepted
          ? 'Presupuesto ya aprobado'
          : revisionMode
            ? 'Modo revision activo'
            : 'Listo para tomar una decision';
  const actionDescription = isRejected
    ? 'El cliente decidio no avanzar con esta propuesta. El detalle permanece disponible como respaldo.'
    : isExpired
      ? 'La validez del presupuesto termino. Si quieren continuar, el tecnico debe emitir una nueva version.'
      : canCollectFeedback
        ? 'Cuando el trabajo queda finalizado o cobrado, la edicion se bloquea y el cliente puede dejar una calificacion con estrellas.'
        : isAccepted
          ? 'La contratacion ya fue confirmada. Si hace falta ajustar un item puntual, todavia se puede pedir revision.'
          : revisionMode
            ? 'Marca solo los items que quieras revisar y agrega una nota breve para enviarle una correccion al tecnico.'
            : 'Revisa el detalle, descarga el PDF si queres archivarlo y elegi entre aprobar la propuesta o pedir una revision.';

  // --- ICONOS SVG ---
  const Icons = {
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Star: ({ filled = false }: { filled?: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    ExternalLink: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
    Receipt: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2-3 2V3z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>,
    User: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>,
    Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z"/></svg>
  };

  return (
    <div
      className={`${manrope.className} min-h-screen bg-[#f4efe7] px-3 py-3 pb-24 sm:px-5 sm:py-8 sm:pb-10 md:px-6 md:py-10 antialiased`}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(194,120,46,0.12),_transparent_28%)]" />
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 transition-all">
        
        {/* HEADER (Técnico / Empresa) */}
        <div className="relative overflow-hidden border-b border-white/10 bg-[#081223] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.18),_transparent_24%)]" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="relative grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.25fr)_340px] lg:px-10 lg:py-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
                  Presupuesto UrbanFix
                </span>
                <div
                  className={
                    "inline-flex items-center pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border " +
                    statusPillClass
                  }
                >
                  <span className={"flex items-center justify-center w-5 h-5 mr-2 rounded-full " + statusIconClass}>
                    {isAccepted ? <Icons.Check /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                  </span>
                  {statusLabel}
                </div>
              </div>

              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-white/95 p-3 shadow-2xl shadow-slate-950/25">
                  {(profile?.company_logo_url || profile?.avatar_url) && !imageError ? (
                    <img
                      src={profile?.company_logo_url || profile?.avatar_url}
                      alt={profile?.business_name || 'Logo'}
                      onError={() => setImageError(true)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-slate-900 text-3xl font-black uppercase text-white">
                      {businessLabel.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">Emitido por</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                      {businessLabel}
                    </h1>
                    <p className="mt-2 text-base text-slate-300">{technicianLabel}</p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 text-sm text-slate-200">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      <Icons.Phone />
                      <span>{profile?.phone || 'Telefono no disponible'}</span>
                    </div>
                    {profile?.email ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                        <Icons.Mail />
                        <span>{profile.email}</span>
                      </div>
                    ) : null}
                    {profile?.company_address ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-slate-300">
                        <Icons.MapPin />
                        <span>{profile.company_address}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">Cliente</p>
                  <p className="mt-3 text-lg font-bold text-white">{clientLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Presupuesto listo para compartir y aprobar desde este link.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">Servicio</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white">{serviceAddress}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">La ubicacion puede confirmarse antes de aceptar si hace falta corregirla.</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">Alcance</p>
                  <p className="mt-3 text-lg font-bold text-white">{items.length} items</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {attachments.length} adjuntos disponibles y descarga PDF lista para archivo comercial.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/10 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">Referencia</p>
              <p className="mt-3 font-mono text-3xl font-black tracking-[0.2em] text-white">{quoteReference}</p>

              <div className="mt-5 rounded-[26px] bg-white px-5 py-5 text-slate-900 shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Total final</p>
                <p className="mt-3 font-mono text-4xl font-black tracking-tight">{formatCurrency(total)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {discountAmount > 0
                    ? `Incluye un descuento del ${discountPercent.toFixed(0)}% aplicado sobre el subtotal.`
                    : 'Importe final listo para aprobar o revisar con el tecnico.'}
                </p>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-white/65">
                    <Icons.Calendar />
                    Emision
                  </span>
                  <span className="font-semibold text-white">{createdLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-white/65">
                    <Icons.Shield />
                    Vigencia
                  </span>
                  <span className="font-semibold text-white">{expiresLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-white/65">
                    <Icons.Receipt />
                    Composicion
                  </span>
                  <span className="font-semibold text-white">
                    {formatCurrency(laborSubtotal)} + {formatCurrency(materialSubtotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INFO CLIENTE & FECHA */}
        <div className="border-b border-slate-200 bg-[#f7f5ef] px-5 py-5 sm:px-8 sm:py-8 md:px-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Resumen ejecutivo</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{items.length} items</p>
            </div>
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Mano de obra</p>
                <p className="mt-1 font-mono font-semibold text-slate-900">
                  ${laborSubtotal.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Materiales</p>
                <p className="mt-1 font-mono font-semibold text-slate-900">
                  ${materialSubtotal.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Subtotal</p>
                <p className="mt-1 font-mono font-semibold text-slate-900">
                  ${subtotal.toLocaleString('es-AR')}
                </p>
              </div>
              {discountAmount > 0 && (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-rose-400">
                    Descuento ({discountPercent.toFixed(0)}%)
                  </p>
                  <p className="mt-1 font-mono font-semibold text-rose-700">
                    - ${discountAmount.toLocaleString('es-AR')}
                  </p>
                </div>
              )}
              {tax > 0 && (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    IVA ({(taxRate * 100).toFixed(0)}%)
                  </p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">+ ${tax.toLocaleString('es-AR')}</p>
                </div>
              )}
              <div className="rounded-[22px] bg-slate-900 px-4 py-3 text-white">
                <p className="text-[10px] uppercase tracking-wider text-white/70">Total</p>
                <p className="mt-1 font-mono text-base font-bold">${total.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm shadow-slate-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Roadmap</p>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  isRejected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isRejected ? 'Rechazado' : roadmapSteps[roadmapIndex]?.label || 'Borrador'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {roadmapSteps.map((step, index) => {
                const isActive = index === roadmapIndex;
                const isDone = index < roadmapIndex || (isCompleted && index === roadmapSteps.length - 1);
                return (
                  <div
                    key={step.key}
                    className={`rounded-[22px] border px-4 py-4 text-sm font-semibold uppercase tracking-wide ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isActive
                          ? 'border-slate-300 bg-slate-100 text-slate-700'
                          : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#faf8f3] px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">{actionTitle}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{actionDescription}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6 space-y-3 shadow-sm shadow-slate-900/5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.24em] flex items-center gap-2"><Icons.MapPin /> Lugar del trabajo</p>
              <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">{quote.client_name || 'Cliente Final'}</h2>
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
                    {!isClosedForEditing ? (
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                          value={addressInput}
                          onChange={(e) => setAddressInput(e.target.value)}
                          placeholder="Confirma o corrige la direccion"
                          className="w-full sm:max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
                        />
                        <button
                          onClick={handleConfirmAddress}
                          disabled={addressSaving || !addressInput.trim()}
                          className={`w-full sm:w-auto px-4 py-3 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                            addressSaving || !addressInput.trim()
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
                          }`}
                        >
                          {addressSaving ? 'Guardando...' : 'Confirmar direccion'}
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                        La direccion queda bloqueada porque el trabajo ya esta finalizado o cobrado.
                      </p>
                    )}
                  </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6 text-left space-y-4 shadow-sm shadow-slate-900/5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 md:justify-end"><Icons.Calendar /> Emisión</p>
              <div>
                  <p className="text-slate-900 font-bold text-xl">{new Date(quote.created_at).toLocaleDateString('es-AR')}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1.5">Válido por 15 días</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE ÍTEMS */}
        <div id="items-section" className="bg-white px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 min-h-[350px]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Detalle tecnico</p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Items del presupuesto</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs font-semibold text-slate-500">
              <span>{items.length} items</span>
              {revisionMode && <span>{selectedItemIds.size} seleccionados</span>}
              {revisionMode && (
                <button
                  type="button"
                  onClick={handleRequestRevision}
                  disabled={selectedItemIds.size === 0 || requestingRevision}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                    selectedItemIds.size === 0 || requestingRevision
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {requestingRevision ? 'Enviando...' : 'Enviar revision'}
                </button>
              )}
            </div>
          </div>
          {revisionMode && (
            <p className="mb-4 text-xs text-slate-500">
              Selecciona los items que deseas revisar y escribe una breve descripcion para cada uno.
            </p>
          )}
          <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {revisionMode && (
                    <th className="py-5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[7%] text-center">Revisar</th>
                  )}
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[43%]">Descripción</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[16%]">Cant.</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[17%]">Unitario</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[17%]">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {groupedItems.map((group) =>
                  group.items.length > 0 ? (
                    <React.Fragment key={group.key}>
                      <tr className="bg-slate-50/80">
                        <td colSpan={revisionMode ? 5 : 4} className="py-3 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
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
                            {revisionMode && (
                              <td className="py-6 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isItemSelected(item)}
                                  onChange={() => toggleItemSelection(item)}
                                  disabled={!getItemId(item)}
                                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                  aria-label="Seleccionar item para revision"
                                />
                              </td>
                            )}
                            <td className="py-6 px-6 font-semibold text-slate-700">
                              <div className="flex flex-col gap-2">
                                <span>{item.description}</span>
                                {typeBadge && (
                                  <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.className}`}>
                                    {typeBadge.label}
                                  </span>
                                )}
                                {revisionMode && isItemSelected(item) && (
                                  <textarea
                                    value={getItemNote(item)}
                                    onChange={(event) => setItemNote(item, event.target.value)}
                                    placeholder="Describe la revision de este item..."
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                  />
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
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <span>{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {group.items.length} items · ${getGroupTotal(group.items).toLocaleString('es-AR')}
                    </span>
                  </div>
                  {group.items.map((item: any, index: number) => {
                    const typeBadge = getItemTypeBadge(item);
                    const rowKey = item.id || `${group.key}-${index}`;
                    return (
                      <div key={rowKey} className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-2">
                            <p className="text-base font-semibold text-slate-800">{item.description}</p>
                            {typeBadge && (
                              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.className}`}>
                                {typeBadge.label}
                              </span>
                            )}
                          </div>
                          {revisionMode && (
                            <button
                              type="button"
                              onClick={() => toggleItemSelection(item)}
                              disabled={!getItemId(item)}
                              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                                isItemSelected(item)
                                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              } ${!getItemId(item) ? 'cursor-not-allowed opacity-60' : 'hover:border-slate-300'}`}
                            >
                              {isItemSelected(item) ? 'Seleccionado' : 'Revisar'}
                            </button>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Cant.</p>
                            <p className="mt-1 font-mono text-slate-700">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Unitario</p>
                            <p className="mt-1 font-mono text-slate-700">
                              ${item.unit_price?.toLocaleString('es-AR')}
                            </p>
                          </div>
                          <div className="col-span-2 flex items-center justify-between rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">Total</p>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              ${(item.quantity * item.unit_price)?.toLocaleString('es-AR')}
                            </p>
                          </div>
                        </div>
                        {revisionMode && isItemSelected(item) && (
                          <textarea
                            value={getItemNote(item)}
                            onChange={(event) => setItemNote(item, event.target.value)}
                            placeholder="Describe la revision de este item..."
                            rows={2}
                            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        )}
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
          <div className="mt-8 rounded-[24px] border border-slate-200 bg-[#faf8f3] px-5 py-4 text-sm leading-7 text-slate-600">
            El detalle tecnico queda separado del resumen economico para que la lectura sea mas clara: arriba se entiende la propuesta, aca abajo se valida cada item.
          </div>
        </div>

        {/* FOOTER & ACCIONES */}
        <div className="border-t border-slate-200 bg-[#efe7da] px-5 py-6 sm:px-8 sm:py-8 md:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              
             {/* Términos */}
             <div className="rounded-[28px] bg-[#10203a] px-6 py-6 text-[0] leading-none text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
               <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">Centro de decision</p>
               <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{actionTitle}</h3>
               <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">{actionDescription}</p>
               <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">
                 Al aceptar, confirmas la contratacion del servicio con <strong className="text-white">{profile?.business_name || profile?.full_name}</strong> bajo los terminos acordados.
               </p>
               Al aceptar, confirmas la contratación del servicio con <strong>{profile?.business_name || profile?.full_name}</strong> bajo los términos acordados.
             </div>

             {/* BOTONES */}
             <div className="hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:flex sm:flex-col sm:gap-4">
                
                {/* 1. BOTÓN PDF (Tu componente existente) */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Acciones</p>
                    <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">Resolver presupuesto</h3>
                  </div>
                  <PDFExportButton quote={quote} items={items} profile={profile} />
                </div>

                <div className="flex w-full flex-col gap-3">
                  {canCollectFeedback ? (
                    <div id="feedback-panel" className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-slate-700 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Calificacion</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {feedbackSaved ? 'Ya calificaste este trabajo.' : 'Califica el trabajo realizado.'}
                          </p>
                        </div>
                        {feedbackSaved ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                            {feedbackSaved.rating}/5
                          </span>
                        ) : null}
                      </div>

                      {feedbackSaved && !feedbackOpen ? (
                        <div className="mt-3 space-y-2 rounded-xl border border-amber-100 bg-white p-3">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Icons.Star key={`saved-feedback-star-${value}`} filled={value <= feedbackSaved.rating} />
                            ))}
                          </div>
                          <p className="text-sm leading-6 text-slate-700">{feedbackSaved.comment}</p>
                          <p className="text-xs font-medium text-slate-500">
                            {feedbackSaved.isPublic ? 'Visible en el perfil publico del tecnico.' : 'Guardada como calificacion privada.'}
                          </p>
                        </div>
                      ) : null}

                      {feedbackOpen ? (
                        <div className="mt-3 space-y-3 rounded-xl border border-amber-100 bg-white p-3">
                          <div className="flex items-center gap-2 text-amber-500">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={`feedback-star-${value}`}
                                type="button"
                                onClick={() => setFeedbackDraft((current) => ({ ...current, rating: value }))}
                                className={`rounded-full p-1 transition ${value <= feedbackDraft.rating ? 'text-amber-500' : 'text-slate-300'}`}
                              >
                                <Icons.Star filled={value <= feedbackDraft.rating} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={feedbackDraft.comment}
                            onChange={(event) => setFeedbackDraft((current) => ({ ...current, comment: event.target.value }))}
                            rows={3}
                            placeholder="Cuenta como fue el trabajo, si cumplio tiempos y como quedo el resultado."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setFeedbackDraft((current) => ({ ...current, isPublic: true }))}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${feedbackDraft.isPublic ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                            >
                              Publica
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackDraft((current) => ({ ...current, isPublic: false }))}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${!feedbackDraft.isPublic ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                            >
                              Privada
                            </button>
                          </div>
                          {feedbackError ? <p className="text-xs font-medium text-rose-600">{feedbackError}</p> : null}
                          {feedbackNotice ? <p className="text-xs font-medium text-emerald-700">{feedbackNotice}</p> : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setFeedbackOpen(false)}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmitFeedback}
                              disabled={feedbackSubmitting}
                              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ${feedbackSubmitting ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400'}`}
                            >
                              {feedbackSubmitting ? 'Guardando...' : 'Guardar calificacion'}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {feedbackLoading ? <p className="mt-3 text-xs font-medium text-slate-500">Cargando calificacion...</p> : null}
                      {!feedbackOpen && feedbackNotice ? <p className="mt-3 text-xs font-medium text-slate-500">{feedbackNotice}</p> : null}
                    </div>
                  ) : null}
                  {/* 2. BOTÓN ACEPTAR */}
                  {!isAccepted && !isRejected && !isExpired ? (
                    <button 
                      onClick={handleAccept}
                      disabled={accepting}
                      className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] w-full sm:w-auto ${
                        accepting
                          ? 'bg-emerald-300 text-white/80 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-emerald-500/40'
                      }`}
                    >
                      <span className="tracking-wide text-base sm:text-lg">
                        {accepting ? 'ACEPTANDO...' : 'ACEPTAR PRESUPUESTO'}
                      </span>
                    </button>
                  ) : (
                    <div className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl cursor-default shadow-inner w-full sm:w-auto ${
                      isRejected || isExpired
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      <div className={`rounded-full p-1 text-white ${isRejected || isExpired ? 'bg-rose-600' : 'bg-green-600'}`}>
                          <Icons.Check />
                      </div>
                      <span className="tracking-wide text-base sm:text-lg font-black">
                        {isRejected ? 'PRESUPUESTO RECHAZADO' : isExpired ? 'PRESUPUESTO VENCIDO' : isPaid ? 'TRABAJO COBRADO' : isCompleted ? 'TRABAJO FINALIZADO' : 'PRESUPUESTO APROBADO'}
                      </span>
                    </div>
                  )}
                  {canCollectFeedback ? (
                    <button
                      type="button"
                      onClick={handleToggleFeedback}
                      className="w-full rounded-xl border border-amber-300 bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-amber-400"
                    >
                      {feedbackOpen ? 'Cancelar calificacion' : feedbackSaved ? 'Editar calificacion' : 'Calificar trabajo'}
                    </button>
                  ) : canRequestRevision ? (
                    <button
                      type="button"
                      onClick={handleToggleRevisionMode}
                      disabled={requestingRevision}
                      className={`w-full rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                        revisionMode
                          ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                      } ${requestingRevision ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      {revisionMode ? 'Cancelar revision' : 'Solicitar revision'}
                    </button>
                  ) : null}
                </div>
             </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES FIJA EN MÓVIL */}
        <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden">
          <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur">
            <div className="mx-auto w-full max-w-4xl px-4 py-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>Total</span>
                <span className="font-mono text-slate-900">${total.toLocaleString('es-AR')}</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <PDFExportButton quote={quote} items={items} profile={profile} />
                  {!isAccepted && !isRejected && !isExpired ? (
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className={`flex-1 flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] ${
                        accepting
                          ? 'bg-emerald-300 text-white/80 cursor-not-allowed'
                          : 'bg-emerald-600 text-white shadow-emerald-500/40'
                      }`}
                    >
                      <span className="tracking-wide">{accepting ? 'ACEPTANDO...' : 'ACEPTAR'}</span>
                    </button>
                  ) : (
                    <div className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-inner ${
                      isRejected || isExpired
                        ? 'border border-rose-200 bg-rose-100 text-rose-800'
                        : 'border border-green-200 bg-green-100 text-green-800'
                    }`}>
                      <div className={`rounded-full p-1 text-white ${isRejected || isExpired ? 'bg-rose-600' : 'bg-green-600'}`}>
                        <Icons.Check />
                      </div>
                      <span className="tracking-wide">{isRejected ? 'RECHAZADO' : isExpired ? 'VENCIDO' : isPaid ? 'COBRADO' : isCompleted ? 'FINALIZADO' : 'APROBADO'}</span>
                    </div>
                  )}
                </div>
                {canCollectFeedback ? (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleFeedback}
                      className="w-full rounded-xl border border-amber-300 bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white"
                    >
                      {feedbackOpen ? 'Cancelar calificacion' : feedbackSaved ? 'Editar calificacion' : 'Calificar trabajo'}
                    </button>
                    {feedbackOpen ? (
                      <div id="feedback-panel-mobile" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-slate-700">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={`feedback-mobile-star-${value}`}
                              type="button"
                              onClick={() => setFeedbackDraft((current) => ({ ...current, rating: value }))}
                              className={`rounded-full p-1 transition ${value <= feedbackDraft.rating ? 'text-amber-500' : 'text-slate-300'}`}
                            >
                              <Icons.Star filled={value <= feedbackDraft.rating} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={feedbackDraft.comment}
                          onChange={(event) => setFeedbackDraft((current) => ({ ...current, comment: event.target.value }))}
                          rows={3}
                          placeholder="Cuenta como fue el trabajo y si quedaste conforme."
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFeedbackDraft((current) => ({ ...current, isPublic: true }))}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${feedbackDraft.isPublic ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                          >
                            Publica
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackDraft((current) => ({ ...current, isPublic: false }))}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!feedbackDraft.isPublic ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                          >
                            Privada
                          </button>
                        </div>
                        {feedbackError ? <p className="mt-2 text-xs font-medium text-rose-600">{feedbackError}</p> : null}
                        {feedbackNotice ? <p className="mt-2 text-xs font-medium text-emerald-700">{feedbackNotice}</p> : null}
                        <button
                          type="button"
                          onClick={handleSubmitFeedback}
                          disabled={feedbackSubmitting}
                          className={`mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ${feedbackSubmitting ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500'}`}
                        >
                          {feedbackSubmitting ? 'Guardando...' : 'Guardar calificacion'}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : canRequestRevision ? (
                  <button
                    type="button"
                    onClick={handleToggleRevisionMode}
                    disabled={requestingRevision}
                    className={`w-full rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                      revisionMode
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : 'border-slate-900 bg-slate-900 text-white'
                    } ${requestingRevision ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {revisionMode ? 'Cancelar revision' : 'Solicitar revision'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

