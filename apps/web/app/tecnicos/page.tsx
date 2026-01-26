'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sora } from 'next/font/google';
import { supabase } from '../../lib/supabase/supabase';

type QuoteRow = {
  id: string;
  client_name: string | null;
  client_address: string | null;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount: number | null;
  tax_rate: number | null;
  status: string | null;
  created_at: string;
};

type ItemForm = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'material';
};

type AttachmentRow = {
  id: string;
  quote_id: string;
  user_id?: string | null;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

const TAX_RATE = 0.21;

const DEFAULT_PUBLIC_WEB_URL = 'https://www.urbanfixar.com';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const themeStyles = {
  '--ui-bg': '#F5F4F0',
  '--ui-card': '#FFFFFF',
  '--ui-ink': '#0F172A',
  '--ui-muted': '#64748B',
  '--ui-accent': '#111827',
  '--ui-accent-soft': '#F5B942',
} as React.CSSProperties;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const getPublicBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeBaseUrl(envUrl.trim());
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_WEB_URL;
};

const buildQuoteLink = (quoteId: string) => `${getPublicBaseUrl()}/p/${quoteId}`;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());

const extractQuoteId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (match) return match[0];
  if (trimmed.includes('/p/')) {
    const [, tail] = trimmed.split('/p/');
    const clean = tail?.split(/[?#]/)[0] || '';
    return clean;
  }
  return trimmed;
};

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: 'Computo', className: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Enviado', className: 'bg-sky-100 text-sky-700' },
  presented: { label: 'Presentado', className: 'bg-sky-100 text-sky-700' },
  approved: { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-700' },
  accepted: { label: 'Aceptado', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  cobrado: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rechazado', className: 'bg-rose-100 text-rose-700' },
  locked: { label: 'Bloqueado', className: 'bg-slate-200 text-slate-600' },
  completed: { label: 'Completado', className: 'bg-indigo-100 text-indigo-700' },
  finalizado: { label: 'Finalizado', className: 'bg-indigo-100 text-indigo-700' },
};

const pendingStatuses = new Set(['pending', 'sent', 'presented']);
const approvedStatuses = new Set(['approved', 'accepted']);
const draftStatuses = new Set(['draft', 'borrador']);
const completedStatuses = new Set(['completed', 'completado', 'finalizado', 'finalizados']);
const paidStatuses = new Set(['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged']);

const normalizeStatusValue = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();
  if (!normalized) return 'draft';
  if (normalized === 'accepted') return 'approved';
  if (normalized === 'finalizado') return 'completed';
  if (normalized === 'cobrado' || normalized === 'cobrados' || normalized === 'pagado' || normalized === 'pagados')
    return 'paid';
  if (normalized === 'presented' || normalized === 'sent' || normalized === 'pending') return normalized;
  if (normalized === 'approved' || normalized === 'completed' || normalized === 'paid' || normalized === 'draft')
    return normalized;
  if (draftStatuses.has(normalized)) return 'draft';
  if (pendingStatuses.has(normalized)) return 'pending';
  if (approvedStatuses.has(normalized)) return 'approved';
  if (completedStatuses.has(normalized)) return 'completed';
  if (paidStatuses.has(normalized)) return 'paid';
  return 'draft';
};

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getQuoteAddress = (quote: QuoteRow) =>
  quote.client_address || quote.address || quote.location_address || '';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const buildAttachmentPath = (userId: string, quoteId: string, fileName: string) =>
  `${userId}/quotes/${quoteId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(fileName)}`;

const isImageAttachment = (attachment: AttachmentRow) => {
  if (attachment.file_type && attachment.file_type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.file_url || '');
};

const buildItemsSignature = (items: ItemForm[]) =>
  JSON.stringify(
    items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      type: item.type,
    }))
  );

export default function TechniciansPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [authError, setAuthError] = useState('');

  const [profile, setProfile] = useState<any>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const savingRef = useRef(false);
  const lastSavedItemsSignatureRef = useRef('');
  const lastSavedItemsCountRef = useRef(0);
  const [activeTab, setActiveTab] = useState<
    'lobby' | 'presupuestos' | 'visualizador' | 'agenda' | 'perfil' | 'precios'
  >('lobby');
  const [viewerInput, setViewerInput] = useState('');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'pending' | 'approved' | 'draft' | 'completed' | 'paid'>(
    'all'
  );

  const navItems = [
    { key: 'lobby', label: 'Lobby', hint: 'Resumen general', short: 'LB' },
    { key: 'presupuestos', label: 'Presupuestos', hint: 'Ver estado', short: 'PR' },
    { key: 'visualizador', label: 'Visualizador', hint: 'Ver presupuesto', short: 'VI' },
    { key: 'agenda', label: 'Agenda', hint: 'Proximamente', short: 'AG' },
    { key: 'perfil', label: 'Perfil', hint: 'Datos del negocio', short: 'PF' },
    { key: 'precios', label: 'Precios', hint: 'Mano de obra', short: 'PM' },
  ] as const;

  const statusOptions = [
    { value: 'draft', label: 'Computo' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'sent', label: 'Enviado' },
    { value: 'presented', label: 'Presentado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'paid', label: 'Cobrado' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData || null);
      await fetchQuotes();
    };
    load();
  }, [session?.user?.id]);

  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setInfoMessage('No pudimos cargar los presupuestos.');
      return;
    }
    setQuotes((data as QuoteRow[]) || []);
  };

  const fetchAttachments = async (quoteId: string) => {
    const { data, error } = await supabase
      .from('quote_attachments')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    if (error) {
      setInfoMessage('No pudimos cargar los archivos adjuntos.');
      return;
    }
    setAttachments((data as AttachmentRow[]) || []);
  };

  const resetForm = () => {
    setActiveQuoteId(null);
    setClientName('');
    setClientAddress('');
    setDiscount(0);
    setApplyTax(false);
    setItems([]);
    setAttachments([]);
    setFormError('');
    setInfoMessage('');
    lastSavedItemsSignatureRef.current = '';
    lastSavedItemsCountRef.current = 0;
  };

  const loadQuote = async (quote: QuoteRow) => {
    setActiveTab('presupuestos');
    setActiveQuoteId(quote.id);
    setClientName(quote.client_name || '');
    setClientAddress(getQuoteAddress(quote));
    setApplyTax((quote.tax_rate || 0) > 0);
    setDiscount(0);
    setFormError('');
    setInfoMessage('');
    const { data: itemsData } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id);
    const mapped = (itemsData || []).map((item: any) => {
      const rawType = (item?.metadata?.type || item?.metadata?.category || 'labor').toString().toLowerCase();
      const normalizedType = rawType === 'material' || rawType === 'consumable' ? 'material' : 'labor';
      return {
        id: item.id?.toString() || `item-${Math.random().toString(36).slice(2)}`,
        description: item.description || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unit_price || 0),
        type: normalizedType as 'labor' | 'material',
      };
    });
    setItems(mapped);
    lastSavedItemsSignatureRef.current = buildItemsSignature(
      mapped.filter((item) => item.description.trim())
    );
    lastSavedItemsCountRef.current = mapped.filter((item) => item.description.trim()).length;
    await fetchAttachments(quote.id);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        type: 'labor',
      },
    ]);
  };

  const handleItemUpdate = (id: string, patch: Partial<ItemForm>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (!activeQuoteId) {
      setFormError('Guarda el presupuesto antes de adjuntar archivos.');
      return;
    }
    if (!session?.user?.id) {
      setFormError('Inicia sesion para subir archivos.');
      return;
    }
    const imageFiles = files.filter(
      (file) => (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name)
    );
    if (!imageFiles.length) {
      setFormError('Solo se permiten imagenes.');
      return;
    }

    setUploadingAttachments(true);
    setFormError('');
    try {
      const uploads = [];
      for (const file of imageFiles) {
        const storagePath = buildAttachmentPath(session.user.id, activeQuoteId, file.name);
        const { error: uploadError } = await supabase.storage
          .from('urbanfix-assets')
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
        uploads.push({
          quote_id: activeQuoteId,
          user_id: session.user.id,
          file_url: publicData.publicUrl,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size || null,
        });
      }
      const { error: insertError } = await supabase.from('quote_attachments').insert(uploads);
      if (insertError) throw insertError;
      await fetchAttachments(activeQuoteId);
      setInfoMessage('Archivos adjuntados.');
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      setFormError('No pudimos subir los archivos.');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
    [items]
  );
  const totalBeforeTax = Math.max(0, subtotal - discount);
  const taxAmount = applyTax ? totalBeforeTax * TAX_RATE : 0;
  const total = totalBeforeTax + taxAmount;
  const quoteLink = activeQuoteId ? buildQuoteLink(activeQuoteId) : '';
  const quoteStats = useMemo(() => {
    const totals = quotes.reduce(
      (acc, quote) => {
        const status = (quote.status || '').toLowerCase();
        if (status === 'draft') acc.draft += 1;
        if (pendingStatuses.has(status)) acc.pending += 1;
        if (approvedStatuses.has(status)) acc.approved += 1;
        acc.amount += quote.total_amount || 0;
        return acc;
      },
      { draft: 0, pending: 0, approved: 0, amount: 0 }
    );
    return {
      total: quotes.length,
      ...totals,
    };
  }, [quotes]);
  const recentQuotes = useMemo(() => quotes.slice(0, 3), [quotes]);
  const filteredQuotes = useMemo(() => {
    if (quoteFilter === 'pending') {
      return quotes.filter((quote) => pendingStatuses.has((quote.status || '').toLowerCase()));
    }
    if (quoteFilter === 'approved') {
      return quotes.filter((quote) => approvedStatuses.has((quote.status || '').toLowerCase()));
    }
    if (quoteFilter === 'draft') {
      return quotes.filter((quote) => draftStatuses.has((quote.status || '').toLowerCase()));
    }
    if (quoteFilter === 'completed') {
      return quotes.filter((quote) => completedStatuses.has((quote.status || '').toLowerCase()));
    }
    if (quoteFilter === 'paid') {
      return quotes.filter((quote) => paidStatuses.has((quote.status || '').toLowerCase()));
    }
    return quotes;
  }, [quotes, quoteFilter]);

  const handleOpenViewer = () => {
    const id = extractQuoteId(viewerInput);
    if (!id || !isUuid(id)) {
      setViewerError('Ingresa un ID valido o pega un link correcto.');
      setViewerUrl(null);
      return;
    }
    setViewerError('');
    setViewerUrl(buildQuoteLink(id));
  };

  const handleViewQuote = (quote: QuoteRow) => {
    const nextUrl = buildQuoteLink(quote.id);
    setActiveQuoteId(quote.id);
    setViewerInput(nextUrl);
    setViewerUrl(nextUrl);
    setViewerError('');
    setActiveTab('visualizador');
  };

  const handleShowQuotes = (filter: 'all' | 'pending' | 'approved' | 'draft' | 'completed' | 'paid') => {
    setQuoteFilter(filter);
    setActiveTab('presupuestos');
  };

  const handleStatusChange = async (quoteId: string, nextStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status: nextStatus })
        .eq('id', quoteId)
        .select('id, status')
        .single();
      if (error) throw error;
      setQuotes((prev) => prev.map((quote) => (quote.id === quoteId ? { ...quote, status: data.status } : quote)));
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert(error?.message || 'No pudimos actualizar el estado.');
    }
  };

  const handleSave = async (nextStatus: 'draft' | 'sent') => {
    if (savingRef.current || isSaving) return;
    savingRef.current = true;
    if (!clientName.trim()) {
      setFormError('Ingresa el nombre del cliente.');
      savingRef.current = false;
      return;
    }
    if (!clientAddress.trim()) {
      setFormError('Ingresa la direccion del trabajo.');
      savingRef.current = false;
      return;
    }
    const cleanedItems = items.filter((item) => item.description.trim());
    if (cleanedItems.length === 0) {
      setFormError('Agrega al menos un item.');
      savingRef.current = false;
      return;
    }
    const itemsSignature = buildItemsSignature(cleanedItems);
    const shouldSyncItems = !activeQuoteId || itemsSignature !== lastSavedItemsSignatureRef.current;

    setIsSaving(true);
    setFormError('');
    setInfoMessage('');
    try {
      const quotePayload = {
        client_name: clientName,
        client_address: clientAddress,
        total_amount: total,
        tax_rate: applyTax ? TAX_RATE : 0,
        status: nextStatus,
        user_id: session.user.id,
      };

      const isEditing = Boolean(activeQuoteId);
      let quoteId = activeQuoteId;
      if (quoteId) {
        const { data: updatedRows, error: updateError } = await supabase
          .from('quotes')
          .update(quotePayload)
          .eq('id', quoteId)
          .select('id');
        if (updateError) throw updateError;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error('No pudimos actualizar el presupuesto. Revisa permisos o politicas de seguridad.');
        }
      } else {
        const { data, error } = await supabase.from('quotes').insert(quotePayload).select().single();
        if (error) throw error;
        quoteId = data.id;
        setActiveQuoteId(quoteId);
      }

      if (shouldSyncItems && quoteId) {
        if (isEditing) {
          const { data: deletedRows, error: deleteError } = await supabase
            .from('quote_items')
            .delete()
            .eq('quote_id', quoteId)
            .select('id');
          if (deleteError) throw deleteError;
          if (lastSavedItemsCountRef.current > 0 && (deletedRows?.length || 0) === 0) {
            throw new Error(
              'No pudimos reemplazar los items del presupuesto. Revisa permisos o politicas de seguridad.'
            );
          }
        }

        const itemsPayload = cleanedItems.map((item) => ({
          quote_id: quoteId,
          description: item.description,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          metadata: { type: item.type },
        }));
        const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      await fetchQuotes();
      setInfoMessage(nextStatus === 'sent' ? 'Presupuesto enviado.' : 'Borrador guardado.');
      lastSavedItemsSignatureRef.current = itemsSignature;
      lastSavedItemsCountRef.current = cleanedItems.length;
    } catch (error: any) {
      setFormError(error?.message || 'No pudimos guardar el presupuesto.');
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleCopyLink = async (quoteId?: string) => {
    const targetId = quoteId || activeQuoteId;
    if (!targetId) return;
    const url = buildQuoteLink(targetId);
    try {
      await navigator.clipboard.writeText(url);
      setInfoMessage('Link copiado al portapapeles.');
    } catch (error) {
      setInfoMessage(`Link: ${url}`);
    }
  };

  const handleOpenQuoteWindow = (quoteId?: string) => {
    const targetId = quoteId || activeQuoteId;
    if (!targetId) return;
    const url = buildQuoteLink(targetId);
    const windowRef = window.open(
      url,
      'quoteWindow',
      'popup=yes,width=1200,height=800,noopener,noreferrer'
    );
    if (windowRef) {
      windowRef.focus();
    } else {
      setInfoMessage(`Link: ${url}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    resetForm();
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    const redirectTo = `${window.location.origin}/tecnicos`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!fullName.trim() || !businessName.trim()) {
          setAuthError('Completa tu nombre y el de tu negocio.');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, business_name: businessName } },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error?.message || 'No pudimos iniciar sesion.');
    }
  };

  if (loadingSession) {
    return (
      <div
        style={themeStyles}
        className={`${sora.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-muted)] flex items-center justify-center`}
      >
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-sm text-slate-500 shadow-sm">
          Cargando...
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div
        style={themeStyles}
        className={`${sora.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
      >
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_55%)]" />
          <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/20 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0F172A]/10 blur-3xl" />

          <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-200/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Panel tecnico</p>
                </div>
              </div>
              <h1 className="text-5xl font-black text-slate-900 md:text-6xl">Acceso para tecnicos</h1>
              <p className="text-base text-slate-600 md:text-lg">
                Gestiona presupuestos, materiales y estados desde la web. Todo sincronizado con tu cuenta.
              </p>
              <a
                href="https://www.urbanfixar.com"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Volver al inicio
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900">Ingresa a tu cuenta</h2>
                <p className="text-sm text-slate-600">Accede con Google o con tu correo.</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Continuar con Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                o
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {authMode === 'register' && (
                <div className="space-y-3">
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Nombre del negocio"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              )}

              <div className="mt-4 space-y-3">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Correo"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Contrasena"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>

              {authError && <p className="mt-4 text-xs text-amber-600">{authError}</p>}

              <button
                type="button"
                onClick={handleEmailAuth}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
              >
                {authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="mt-4 w-full text-sm text-slate-500 hover:text-slate-800"
              >
                {authMode === 'login' ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Ingresa'}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      style={themeStyles}
      className={`${sora.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/15 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/10 blur-3xl" />

        <header className="relative mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white/80 px-6 py-5 shadow-lg shadow-slate-200/50 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 ring-1 ring-slate-200 shadow-lg shadow-slate-200/40">
                <img src="/icon.png" alt="UrbanFix logo" className="h-9 w-9" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UrbanFix</p>
                <p className="text-sm font-semibold text-slate-800">
                  {profile?.business_name || 'Panel tecnico'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('presupuestos');
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Nuevo presupuesto
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Cerrar sesion
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-full border border-slate-200 bg-slate-50/90 p-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      if (item.key === 'presupuestos') setQuoteFilter('all');
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <span className="ml-auto hidden shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-500 sm:inline-flex">
                {quotes.length} activos
              </span>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
          <section className="space-y-6">
            {activeTab === 'lobby' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total presupuestos</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('all')}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{quoteStats.total}</p>
                    <p className="mt-1 text-xs text-slate-500">Activos en tu cuenta</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Pendientes</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('pending')}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-amber-600">{quoteStats.pending}</p>
                    <p className="mt-1 text-xs text-slate-500">En espera de respuesta</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Aprobados</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('approved')}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-emerald-600">{quoteStats.approved}</p>
                    <p className="mt-1 text-xs text-slate-500">Listos para ejecutar</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Facturacion estimada</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">
                      ${quoteStats.amount.toLocaleString('es-AR')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Suma de todos los presupuestos activos.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setActiveTab('presupuestos');
                        }}
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Crear presupuesto
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('visualizador')}
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        Abrir visualizador
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ultimos presupuestos</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('presupuestos')}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Ver todos
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {recentQuotes.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                          Todavia no hay presupuestos cargados.
                        </div>
                      )}
                      {recentQuotes.map((quote) => (
                        <button
                          key={quote.id}
                          type="button"
                          onClick={() => loadQuote(quote)}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{quote.client_name || 'Presupuesto'}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(quote.created_at).toLocaleDateString('es-AR')}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            ${(quote.total_amount || 0).toLocaleString('es-AR')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {navItems
                    .filter((item) => item.key !== 'lobby')
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveTab(item.key)}
                        className="rounded-3xl border border-slate-200 bg-white px-4 py-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.hint}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'presupuestos' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Presupuestos</h2>
                    <p className="text-xs text-slate-500">Listado y estado actual de tus presupuestos.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quoteFilter !== 'all' && (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                        {quoteFilter === 'pending'
                          ? 'Pendientes'
                          : quoteFilter === 'approved'
                            ? 'Aprobados'
                          : quoteFilter === 'draft'
                              ? 'Computo'
                              : quoteFilter === 'completed'
                                ? 'Finalizados'
                                : 'Cobrados'}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                      {filteredQuotes.length} activos
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'draft', label: 'Computo' },
                    { key: 'pending', label: 'Pendientes' },
                    { key: 'approved', label: 'Aprobados' },
                    { key: 'completed', label: 'Finalizados' },
                    { key: 'paid', label: 'Cobrados' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() =>
                        setQuoteFilter(
                          filter.key as 'all' | 'draft' | 'pending' | 'approved' | 'completed' | 'paid'
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                        quoteFilter === filter.key
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  {filteredQuotes.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Aun no tienes presupuestos. Crea el primero desde el panel.
                    </div>
                  )}
                  {filteredQuotes.map((quote) => {
                    const info = statusMap[quote.status || ''] || {
                      label: (quote.status || 'N/A').toUpperCase(),
                      className: 'bg-slate-100 text-slate-600',
                    };
                      return (
                        <button
                          key={quote.id}
                          type="button"
                          onClick={() => handleViewQuote(quote)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            activeQuoteId === quote.id
                              ? 'border-slate-300 bg-slate-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {quote.client_name || 'Presupuesto'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${info.className}`}>
                                {info.label}
                              </span>
                              <select
                                value={normalizeStatusValue(quote.status)}
                                onChange={(event) => handleStatusChange(quote.id, event.target.value)}
                                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 outline-none hover:border-slate-300"
                              >
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {getQuoteAddress(quote) || 'Sin direccion'} ·{' '}
                          {new Date(quote.created_at).toLocaleDateString('es-AR')}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          ${(quote.total_amount || 0).toLocaleString('es-AR')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === 'visualizador' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Visualizador</p>
                    <h2 className="text-xl font-semibold text-slate-900">Presupuesto publico</h2>
                    <p className="text-sm text-slate-500">
                      Pega el link o el ID para ver el presupuesto tal como lo ve el cliente.
                    </p>
                  </div>
                  {activeQuoteId && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextUrl = buildQuoteLink(activeQuoteId);
                        setViewerInput(nextUrl);
                        setViewerUrl(nextUrl);
                        setViewerError('');
                      }}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Usar presupuesto activo
                    </button>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={viewerInput}
                    onChange={(event) => {
                      setViewerInput(event.target.value);
                      if (viewerError) setViewerError('');
                    }}
                    placeholder="Pega el link o ID del presupuesto"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleOpenViewer}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Visualizar
                  </button>
                  {viewerUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Abrir en pestaña
                    </button>
                  )}
                </div>
                {viewerError && <p className="mt-3 text-xs text-amber-600">{viewerError}</p>}
                {viewerUrl && (
                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <iframe title="Visualizador de presupuesto" src={viewerUrl} className="h-[720px] w-full" />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Agenda</p>
                <h2 className="text-xl font-semibold text-slate-900">Calendario de trabajos</h2>
                <p className="text-sm text-slate-500">Esta seccion estara disponible pronto.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {['Instalaciones', 'Relevamientos'].map((label) => (
                    <div key={label} className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Aun no hay eventos programados. Podras cargar turnos desde aqui.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Perfil</p>
                <h2 className="text-xl font-semibold text-slate-900">Datos del negocio</h2>
                <p className="text-sm text-slate-500">Revisa la informacion principal de tu cuenta.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Nombre</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{profile?.full_name || 'Sin completar'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Negocio</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {profile?.business_name || 'Sin completar'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Telefono</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{profile?.phone || 'Sin completar'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Email</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{profile?.email || 'Sin completar'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'precios' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Precios</p>
                <h2 className="text-xl font-semibold text-slate-900">Mano de obra</h2>
                <p className="text-sm text-slate-500">
                  Define valores base para agilizar los presupuestos. Esta seccion estara disponible pronto.
                </p>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-800">Lista de precios en construccion</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Agregaremos una tabla editable con rubros, precios por hora y categorias.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
