'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'marketplace' | 'direct';
type Status =
  | 'published'
  | 'matched'
  | 'quoted'
  | 'direct_sent'
  | 'selected'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
type Urgency = 'baja' | 'media' | 'alta';
type Tab = 'new' | 'active' | 'history';

type KnownTech = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  rating: number;
  lastJobAt?: string;
};

type Quote = {
  id: string;
  technicianId: string;
  technicianName: string;
  specialty: string;
  phone: string;
  quoteStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | string;
  priceArs: number | null;
  etaHours: number | null;
  rating: number | null;
};

type TimelineEvent = {
  id: string;
  at: string;
  label: string;
};

type Request = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: Urgency;
  preferredWindow: string;
  mode: Mode;
  status: Status;
  updatedAt: string;
  targetTechId: string | null;
  targetTechName: string | null;
  targetTechPhone: string | null;
  assignedTechId: string | null;
  assignedTechName: string | null;
  assignedTechPhone: string | null;
  directExpiresAt: string | null;
  selectedQuoteId: string | null;
  quotes: Quote[];
  timeline: TimelineEvent[];
};

type WorkspaceSnapshot = {
  requests: Request[];
  knownTechnicians: KnownTech[];
};

type Props = {
  userId: string;
  authToken: string;
  displayName?: string | null;
  onSwitchProfile: () => void;
  onLogout: () => void | Promise<void>;
};

const TO_MATCH_MS = 20 * 1000;

const statusMeta: Record<Status, { label: string; className: string }> = {
  published: { label: 'Publicado', className: 'bg-sky-100 text-sky-700' },
  matched: { label: 'Tecnicos preseleccionados', className: 'bg-indigo-100 text-indigo-700' },
  quoted: { label: 'Con cotizaciones', className: 'bg-amber-100 text-amber-700' },
  direct_sent: { label: 'Solicitud directa enviada', className: 'bg-violet-100 text-violet-700' },
  selected: { label: 'Tecnico elegido', className: 'bg-emerald-100 text-emerald-700' },
  scheduled: { label: 'Agendado', className: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'En curso', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Finalizado', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', className: 'bg-rose-100 text-rose-700' },
};

const tabs: { key: Tab; label: string }[] = [
  { key: 'new', label: 'Nueva solicitud' },
  { key: 'active', label: 'Activas' },
  { key: 'history', label: 'Historial' },
];

const ars = (value: number) => `$${Math.round(value).toLocaleString('es-AR')}`;
const toIso = (value: unknown) => (value ? new Date(String(value)).toISOString() : new Date().toISOString());
const canAdvance = (status: Status) => status === 'selected' || status === 'scheduled' || status === 'in_progress';

const getAdvanceLabel = (status: Status) => {
  if (status === 'selected') return 'Agendar';
  if (status === 'scheduled') return 'Iniciar';
  if (status === 'in_progress') return 'Finalizar';
  return '';
};

const formatCountdown = (remainingMs: number) => {
  if (remainingMs <= 0) return 'Expirado';
  const total = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
};

const fetchJson = async (token: string, path: string, init?: RequestInit) => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error || 'No pudimos procesar la operacion.'));
  }
  return payload;
};

const parseSnapshot = (payload: Record<string, unknown>): WorkspaceSnapshot => ({
  requests: Array.isArray(payload.requests) ? (payload.requests as Request[]) : [],
  knownTechnicians: Array.isArray(payload.knownTechnicians) ? (payload.knownTechnicians as KnownTech[]) : [],
});

export default function ClientWorkspace({ userId, authToken, displayName, onSwitchProfile, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('new');
  const [clock, setClock] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<Mode>('marketplace');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electricidad');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('media');
  const [preferredWindow, setPreferredWindow] = useState('');
  const [targetTechId, setTargetTechId] = useState('');
  const [formError, setFormError] = useState('');

  const [requests, setRequests] = useState<Request[]>([]);
  const [knownTechs, setKnownTechs] = useState<KnownTech[]>([]);

  const autoLocksRef = useRef<Set<string>>(new Set());

  const applySnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    setRequests(snapshot.requests || []);
    setKnownTechs(snapshot.knownTechnicians || []);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!authToken) {
      setError('Sesion invalida. Vuelve a iniciar sesion.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const payload = await fetchJson(authToken, '/api/client/requests', { method: 'GET' });
      applySnapshot(parseSnapshot(payload));
    } catch (err: any) {
      setError(err?.message || 'No pudimos cargar solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [applySnapshot, authToken]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, userId]);

  const runAction = useCallback(
    async (requestId: string, action: string, extra?: Record<string, unknown>) => {
      if (!authToken) return;
      setSyncing(true);
      setError('');

      try {
        const payload = await fetchJson(authToken, `/api/client/requests/${requestId}`, {
          method: 'PATCH',
          body: JSON.stringify({ action, ...(extra || {}) }),
        });
        applySnapshot(parseSnapshot(payload));
      } catch (err: any) {
        setError(err?.message || 'No pudimos actualizar la solicitud.');
      } finally {
        setSyncing(false);
      }
    },
    [applySnapshot, authToken]
  );

  const runAutoAction = useCallback(
    async (requestId: string, action: string, extra?: Record<string, unknown>) => {
      const key = `${requestId}:${action}`;
      if (autoLocksRef.current.has(key)) return;
      autoLocksRef.current.add(key);
      try {
        await runAction(requestId, action, extra);
      } finally {
        window.setTimeout(() => {
          autoLocksRef.current.delete(key);
        }, 1200);
      }
    },
    [runAction]
  );

  const createRequest = async () => {
    setFormError('');
    if (!title.trim() || !category.trim() || !address.trim() || !description.trim()) {
      setFormError('Completa titulo, categoria, direccion y descripcion.');
      return;
    }
    if (mode === 'direct' && !targetTechId) {
      setFormError('Selecciona un tecnico conocido para solicitud directa.');
      return;
    }

    setSyncing(true);
    setError('');
    try {
      const payload = await fetchJson(authToken, '/api/client/requests', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          address: address.trim(),
          city: city.trim(),
          description: description.trim(),
          urgency,
          preferredWindow: preferredWindow.trim(),
          mode,
          targetTechnicianId: mode === 'direct' ? targetTechId : null,
        }),
      });

      applySnapshot(parseSnapshot(payload));
      setTab('active');
      setTitle('');
      setCategory('Electricidad');
      setAddress('');
      setCity('');
      setDescription('');
      setUrgency('media');
      setPreferredWindow('');
      setMode('marketplace');
      setTargetTechId('');
    } catch (err: any) {
      setFormError(err?.message || 'No pudimos crear la solicitud.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!requests.length || syncing) return;

    requests.forEach((request) => {
      if (request.status === 'direct_sent' && request.directExpiresAt) {
        const remaining = new Date(request.directExpiresAt).getTime() - clock;
        if (remaining <= 0) {
          runAutoAction(request.id, 'open_marketplace');
          return;
        }
      }

      if (request.status === 'published') {
        const age = clock - new Date(request.updatedAt).getTime();
        if (age >= TO_MATCH_MS) {
          runAutoAction(request.id, 'ensure_matches');
        }
      }
    });
  }, [clock, requests, runAutoAction, syncing]);

  const activeRequests = useMemo(
    () => requests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled'),
    [requests]
  );

  const historyRequests = useMemo(
    () => requests.filter((request) => request.status === 'completed' || request.status === 'cancelled'),
    [requests]
  );

  const stats = useMemo(() => {
    const quoted = activeRequests.filter((request) =>
      request.quotes.some((quote) => quote.quoteStatus === 'submitted' && quote.priceArs !== null)
    ).length;
    const waitingDirect = activeRequests.filter((request) => request.status === 'direct_sent').length;
    const completed = historyRequests.filter((request) => request.status === 'completed').length;
    return { open: activeRequests.length, quoted, waitingDirect, completed };
  }, [activeRequests, historyRequests]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-slate-500">Cargando perfil cliente...</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Perfil cliente</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {displayName ? `${displayName}, pide tu trabajo` : 'Pide tu trabajo'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Marketplace por rubro y zona sobre tecnicos reales de la base, o solicitud directa a un tecnico conocido.
              Contacto habilitado tras aceptacion. MVP sin pago in-app.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSwitchProfile}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cambiar perfil
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Solicitudes activas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.open}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Con cotizacion recibida</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.quoted}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Directas esperando</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.waitingDirect}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.completed}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                tab === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={loadWorkspace}
            className="ml-auto rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            {error}
          </div>
        )}

        {tab === 'new' && (
          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titulo"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Direccion"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ciudad (para matching)"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option>Electricidad</option>
                <option>Plomeria</option>
                <option>Gas</option>
                <option>Albanileria</option>
                <option>Pintura</option>
                <option>Sanitario</option>
              </select>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
              <input
                value={preferredWindow}
                onChange={(e) => setPreferredWindow(e.target.value)}
                placeholder="Franja preferida"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripcion"
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('marketplace')}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                  mode === 'marketplace' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
                }`}
              >
                Marketplace
              </button>
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                  mode === 'direct' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
                }`}
              >
                Directa
              </button>
            </div>

            {mode === 'direct' && (
              <div className="space-y-2">
                <select
                  value={targetTechId}
                  onChange={(e) => setTargetTechId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Seleccionar tecnico conocido...</option>
                  {knownTechs.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} - {tech.specialty}
                    </option>
                  ))}
                </select>
                {!knownTechs.length && (
                  <p className="text-xs text-slate-500">
                    Aun no tienes tecnicos conocidos. Cuando finalices un trabajo podras pedir directo al mismo tecnico.
                  </p>
                )}
              </div>
            )}

            {formError && <p className="text-xs text-amber-700">{formError}</p>}

            <button
              type="button"
              onClick={createRequest}
              disabled={syncing}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {mode === 'direct' ? 'Enviar directa' : 'Publicar solicitud'}
            </button>
          </div>
        )}

        {tab === 'active' && (
          <div className="mt-4 space-y-3">
            {!activeRequests.length && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay solicitudes activas.
              </div>
            )}

            {activeRequests.map((request) => {
              const remainingMs = request.directExpiresAt
                ? new Date(request.directExpiresAt).getTime() - clock
                : 0;

              return (
                <article key={request.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      {request.title} | {request.category}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta[request.status].className}`}>
                      {statusMeta[request.status].label}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {request.address}
                    {request.city ? `, ${request.city}` : ''} | Urgencia {request.urgency}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{request.description}</p>

                  {request.status === 'direct_sent' && (
                    <p className="mt-2 text-xs text-violet-700">
                      Esperando respuesta de {request.targetTechName || 'tecnico'} | Timeout{' '}
                      {formatCountdown(remainingMs)}
                    </p>
                  )}

                  {(request.assignedTechName || request.assignedTechPhone) && (
                    <p className="mt-2 text-xs text-emerald-700">
                      Contacto habilitado: {request.assignedTechName} - {request.assignedTechPhone}
                    </p>
                  )}

                  {(request.status === 'matched' || request.status === 'quoted') && request.quotes.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {request.quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {quote.technicianName} | {quote.specialty}
                            </p>
                            <p className="text-xs text-slate-600">
                              {quote.priceArs !== null && quote.etaHours !== null
                                ? `Cotizacion: ${ars(quote.priceArs)} | ETA ${quote.etaHours}h`
                                : 'Cotizacion pendiente de respuesta'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => runAction(request.id, 'select_match', { matchId: quote.id })}
                            disabled={syncing}
                            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            Seleccionar tecnico
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => runAction(request.id, 'ensure_matches')}
                        disabled={syncing}
                        className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Buscar tecnicos
                      </button>
                    )}

                    {request.status === 'direct_sent' && (
                      <>
                        <button
                          type="button"
                          onClick={() => runAction(request.id, 'direct_accepted')}
                          disabled={syncing}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                        >
                          Simular aceptacion
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(request.id, 'direct_rejected')}
                          disabled={syncing}
                          className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                        >
                          Abrir marketplace
                        </button>
                      </>
                    )}

                    {canAdvance(request.status) && (
                      <button
                        type="button"
                        onClick={() => runAction(request.id, 'advance')}
                        disabled={syncing}
                        className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                      >
                        {getAdvanceLabel(request.status)}
                      </button>
                    )}

                    {request.status !== 'completed' && request.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => runAction(request.id, 'cancel')}
                        disabled={syncing}
                        className="rounded-full border border-rose-300 px-3 py-1 text-[11px] font-semibold text-rose-600 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {!!request.timeline.length && (
                    <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-600">
                      {request.timeline
                        .slice()
                        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                        .slice(0, 4)
                        .map((event) => (
                          <li key={event.id}>
                            {new Date(toIso(event.at)).toLocaleString('es-AR')} - {event.label}
                          </li>
                        ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {tab === 'history' && (
          <div className="mt-4 space-y-2">
            {!historyRequests.length && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Sin historial aun.
              </div>
            )}
            {historyRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {request.title} | {statusMeta[request.status].label} | {new Date(toIso(request.updatedAt)).toLocaleString('es-AR')}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
