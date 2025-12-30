'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/supabase';

type QuoteRow = {
  id: string;
  client_name: string | null;
  client_address: string | null;
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

const TAX_RATE = 0.21;

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-white/10 text-white/70' },
  sent: { label: 'Enviado', className: 'bg-sky-500/20 text-sky-200' },
  approved: { label: 'Aprobado', className: 'bg-emerald-500/20 text-emerald-200' },
  accepted: { label: 'Aceptado', className: 'bg-emerald-500/20 text-emerald-200' },
  pending: { label: 'Pendiente', className: 'bg-amber-500/20 text-amber-200' },
  rejected: { label: 'Rechazado', className: 'bg-rose-500/20 text-rose-200' },
  locked: { label: 'Bloqueado', className: 'bg-slate-500/20 text-slate-200' },
  completed: { label: 'Completado', className: 'bg-indigo-500/20 text-indigo-200' },
};

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function TechniciansPage() {
  const router = useRouter();
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
  const [applyTax, setApplyTax] = useState(true);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

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

  const resetForm = () => {
    setActiveQuoteId(null);
    setClientName('');
    setClientAddress('');
    setDiscount(0);
    setApplyTax(true);
    setItems([]);
    setFormError('');
    setInfoMessage('');
  };

  const loadQuote = async (quote: QuoteRow) => {
    setActiveQuoteId(quote.id);
    setClientName(quote.client_name || '');
    setClientAddress(quote.client_address || '');
    setApplyTax((quote.tax_rate || 0) > 0);
    setDiscount(0);
    setFormError('');
    setInfoMessage('');
    const { data: itemsData } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id);
    const mapped = (itemsData || []).map((item: any) => ({
      id: item.id?.toString() || `item-${Math.random().toString(36).slice(2)}`,
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unit_price || 0),
      type: (item?.metadata?.type || 'labor') as 'labor' | 'material',
    }));
    setItems(mapped);
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

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
    [items]
  );
  const totalBeforeTax = Math.max(0, subtotal - discount);
  const taxAmount = applyTax ? totalBeforeTax * TAX_RATE : 0;
  const total = totalBeforeTax + taxAmount;

  const handleSave = async (nextStatus: 'draft' | 'sent') => {
    if (!clientName.trim()) {
      setFormError('Ingresa el nombre del cliente.');
      return;
    }
    if (!clientAddress.trim()) {
      setFormError('Ingresa la direccion del trabajo.');
      return;
    }
    const cleanedItems = items.filter((item) => item.description.trim());
    if (cleanedItems.length === 0) {
      setFormError('Agrega al menos un item.');
      return;
    }

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

      let quoteId = activeQuoteId;
      if (quoteId) {
        const { error } = await supabase.from('quotes').update(quotePayload).eq('id', quoteId);
        if (error) throw error;
        await supabase.from('quote_items').delete().eq('quote_id', quoteId);
      } else {
        const { data, error } = await supabase.from('quotes').insert(quotePayload).select().single();
        if (error) throw error;
        quoteId = data.id;
        setActiveQuoteId(quoteId);
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

      await fetchQuotes();
      setInfoMessage(nextStatus === 'sent' ? 'Presupuesto enviado.' : 'Borrador guardado.');
    } catch (error: any) {
      setFormError(error?.message || 'No pudimos guardar el presupuesto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!activeQuoteId) return;
    const url = `${window.location.origin}/p/${activeQuoteId}`;
    await navigator.clipboard.writeText(url);
    setInfoMessage('Link copiado al portapapeles.');
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
      <div className="min-h-screen bg-[#0A0F1E] text-white flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm text-white/70">
          Cargando...
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] text-white">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
          <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F39C12]/20 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

          <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
                  <p className="text-sm font-semibold text-white/80">Panel tecnico</p>
                </div>
              </div>
              <h1 className="text-5xl font-black text-white md:text-6xl">Acceso para tecnicos</h1>
              <p className="text-base text-white/70 md:text-lg">
                Gestiona presupuestos, materiales y estados desde la web. Todo sincronizado con tu cuenta.
              </p>
              <a
                href="https://www.urbanfixar.com"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
              >
                Volver al inicio
              </a>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Ingresa a tu cuenta</h2>
                <p className="text-sm text-white/70">Accede con Google o con tu correo.</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Continuar con Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-white/50">
                <div className="h-px flex-1 bg-white/10" />
                o
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {authMode === 'register' && (
                <div className="space-y-3">
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                  />
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Nombre del negocio"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                  />
                </div>
              )}

              <div className="mt-4 space-y-3">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Correo"
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Contrasena"
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                />
              </div>

              {authError && <p className="mt-4 text-xs text-[#F39C12]">{authError}</p>}

              <button
                type="button"
                onClick={handleEmailAuth}
                className="mt-5 w-full rounded-2xl bg-[#F39C12] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-[#F59E0B]"
              >
                {authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="mt-4 w-full text-sm text-white/70 hover:text-white"
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
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F39C12]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        <header className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 pt-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-lg shadow-black/30">
              <img src="/icon.png" alt="UrbanFix logo" className="h-9 w-9" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">UrbanFix</p>
              <p className="text-sm font-semibold text-white/80">
                {profile?.business_name || 'Panel tecnico'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
            >
              Nuevo presupuesto
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
            >
              Cerrar sesion
            </button>
          </div>
        </header>

        <main className="relative mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Presupuestos</h2>
              <span className="rounded-full bg-[#0EA5E9]/20 px-3 py-1 text-[10px] font-semibold text-[#7DD3FC]">
                {quotes.length} activos
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {quotes.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Aun no tienes presupuestos. Crea el primero desde el panel.
                </div>
              )}
              {quotes.map((quote) => {
                const info = statusMap[quote.status || ''] || {
                  label: (quote.status || 'N/A').toUpperCase(),
                  className: 'bg-white/10 text-white/70',
                };
                return (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => loadQuote(quote)}
                    className={`w-full rounded-2xl border border-white/10 px-4 py-3 text-left transition ${
                      activeQuoteId === quote.id ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        {quote.client_name || 'Presupuesto'}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${info.className}`}>
                        {info.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">
                      {quote.client_address || 'Sin direccion'} · {new Date(quote.created_at).toLocaleDateString('es-AR')}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white">
                      ${(quote.total_amount || 0).toLocaleString('es-AR')}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {activeQuoteId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
                </h2>
                <p className="text-sm text-white/60">Completa los datos y guarda.</p>
              </div>
              {activeQuoteId && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Copiar link
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nombre del cliente"
                className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
              />
              <input
                value={clientAddress}
                onChange={(event) => setClientAddress(event.target.value)}
                placeholder="Direccion del trabajo"
                className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
              >
                Agregar item
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr_auto]">
                    <input
                      value={item.description}
                      onChange={(event) => handleItemUpdate(item.id, { description: event.target.value })}
                      placeholder="Descripcion del item"
                      className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                    />
                    <input
                      value={item.quantity}
                      onChange={(event) => handleItemUpdate(item.id, { quantity: toNumber(event.target.value) })}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Cant."
                      className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                    />
                    <input
                      value={item.unitPrice}
                      onChange={(event) => handleItemUpdate(item.id, { unitPrice: toNumber(event.target.value) })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio"
                      className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                    />
                    <select
                      value={item.type}
                      onChange={(event) =>
                        handleItemUpdate(item.id, { type: event.target.value as 'labor' | 'material' })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="labor">Mano de obra</option>
                      <option value="material">Material</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Agrega items para calcular el total.
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(event) => setApplyTax(event.target.checked)}
                    />
                    IVA 21%
                  </label>
                  <span>${taxAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span>Descuento</span>
                  <input
                    value={discount}
                    onChange={(event) => setDiscount(toNumber(event.target.value))}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28 rounded-lg border border-white/10 bg-[#101827] px-2 py-1 text-right text-xs text-white outline-none"
                  />
                </div>
                <div className="mt-4 border-t border-white/10 pt-3 text-base font-semibold text-white">
                  Total: ${total.toLocaleString('es-AR')}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <p className="text-sm text-white/60">
                  Al enviar el presupuesto, el cliente podra verlo desde el link y aceptarlo.
                </p>
                {formError && <p className="mt-3 text-xs text-[#F39C12]">{formError}</p>}
                {infoMessage && <p className="mt-3 text-xs text-emerald-200">{infoMessage}</p>}
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave('draft')}
                    disabled={isSaving}
                    className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                  >
                    Guardar borrador
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave('sent')}
                    disabled={isSaving}
                    className="rounded-2xl bg-[#F39C12] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-[#F59E0B]"
                  >
                    Enviar al cliente
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
