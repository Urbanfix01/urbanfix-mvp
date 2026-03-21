'use client';

import React, { useEffect, useMemo, useState } from 'react';

type AdminClientRequestItem = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string | null;
  description: string;
  urgency: string;
  mode: string;
  status: string;
  preferredWindow?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  targetTechnicianName?: string | null;
  targetTechnicianPhone?: string | null;
  matchesCount?: number;
  submittedQuotesCount?: number;
  ticketHref: string;
  whatsappHref: string;
  whatsappText: string;
  emailSubject: string;
};

type RequestsResponse = {
  requests: AdminClientRequestItem[];
  resendConfigured: boolean;
  fromEmail?: string | null;
};

type Props = {
  accessToken: string;
  active: boolean;
};

type RequestEditDraft = {
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: string;
  mode: string;
  status: string;
  preferredWindow: string;
  targetTechnicianName: string;
  targetTechnicianPhone: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR');
};

const toText = (value: unknown) => String(value || '').trim();

const statusLabel = (value: string) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'matched') return 'Matcheada';
  if (normalized === 'quoted') return 'Cotizada';
  if (normalized === 'direct_sent') return 'Directa enviada';
  if (normalized === 'selected') return 'Tecnico elegido';
  if (normalized === 'scheduled') return 'Agendada';
  if (normalized === 'in_progress') return 'En curso';
  if (normalized === 'completed') return 'Completada';
  if (normalized === 'cancelled') return 'Cancelada';
  return 'Publicada';
};

const statusClass = (value: string) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'matched') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'quoted') return 'bg-sky-100 text-sky-700';
  if (normalized === 'direct_sent') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'completed') return 'bg-slate-200 text-slate-700';
  if (normalized === 'cancelled') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
};

const urgencyClass = (value: string) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'alta') return 'bg-rose-100 text-rose-700';
  if (normalized === 'baja') return 'bg-slate-200 text-slate-700';
  return 'bg-amber-100 text-amber-700';
};

const buildEditDraft = (request: AdminClientRequestItem): RequestEditDraft => ({
  title: request.title,
  category: request.category,
  address: request.address,
  city: toText(request.city),
  description: request.description,
  urgency: toText(request.urgency) || 'media',
  mode: toText(request.mode) || 'marketplace',
  status: toText(request.status) || 'published',
  preferredWindow: toText(request.preferredWindow),
  targetTechnicianName: toText(request.targetTechnicianName),
  targetTechnicianPhone: toText(request.targetTechnicianPhone),
});

export default function AdminClientRequestsPanel({ accessToken, active }: Props) {
  const [requests, setRequests] = useState<AdminClientRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resendConfigured, setResendConfigured] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [emailTargets, setEmailTargets] = useState<Record<string, string>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftsById, setDraftsById] = useState<Record<string, RequestEditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/client-requests', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as Partial<RequestsResponse> & { error?: string };
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las solicitudes.');

      const nextRequests = Array.isArray(payload?.requests) ? payload.requests : [];
      setRequests(nextRequests);
      setResendConfigured(Boolean(payload?.resendConfigured));
      setFromEmail(toText(payload?.fromEmail));
      setEmailTargets((current) => {
        const next = { ...current };
        nextRequests.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = toText(item.clientEmail);
          }
        });
        return next;
      });
      setDraftsById((current) => {
        const next = { ...current };
        nextRequests.forEach((item) => {
          next[item.id] = buildEditDraft(item);
        });
        return next;
      });
    } catch (requestError: any) {
      setError(requestError?.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    loadRequests();
  }, [active, accessToken]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = toText(search).toLowerCase();
    if (!normalizedSearch) return requests;

    return requests.filter((item) =>
      [
        item.title,
        item.category,
        item.city,
        item.address,
        item.clientName,
        item.clientEmail,
        item.clientPhone,
        item.description,
      ]
        .map((value) => toText(value).toLowerCase())
        .some((value) => value.includes(normalizedSearch))
    );
  }, [requests, search]);

  const copyWhatsappText = async (request: AdminClientRequestItem) => {
    try {
      await navigator.clipboard.writeText(request.whatsappText);
      setFeedbackById((current) => ({ ...current, [request.id]: 'Texto copiado para WhatsApp.' }));
    } catch {
      setFeedbackById((current) => ({ ...current, [request.id]: 'No se pudo copiar el texto.' }));
    }
  };

  const copyTicketLink = async (request: AdminClientRequestItem) => {
    try {
      await navigator.clipboard.writeText(request.ticketHref);
      setFeedbackById((current) => ({ ...current, [request.id]: 'Link del ticket copiado.' }));
    } catch {
      setFeedbackById((current) => ({ ...current, [request.id]: 'No se pudo copiar el link del ticket.' }));
    }
  };

  const startEditing = (request: AdminClientRequestItem) => {
    setDraftsById((current) => ({
      ...current,
      [request.id]: current[request.id] || buildEditDraft(request),
    }));
    setEditingId(request.id);
    setFeedbackById((current) => ({ ...current, [request.id]: '' }));
  };

  const cancelEditing = (request: AdminClientRequestItem) => {
    setDraftsById((current) => ({
      ...current,
      [request.id]: buildEditDraft(request),
    }));
    setEditingId((current) => (current === request.id ? null : current));
  };

  const updateDraftField = (requestId: string, field: keyof RequestEditDraft, value: string) => {
    setDraftsById((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || ({} as RequestEditDraft)),
        [field]: value,
      },
    }));
  };

  const saveRequest = async (request: AdminClientRequestItem) => {
    const draft = draftsById[request.id] || buildEditDraft(request);
    setSavingId(request.id);
    setFeedbackById((current) => ({ ...current, [request.id]: '' }));
    try {
      const response = await fetch('/api/admin/client-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          ...draft,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload?.error || 'No se pudo editar la solicitud.');

      setFeedbackById((current) => ({ ...current, [request.id]: 'Solicitud actualizada.' }));
      setEditingId((current) => (current === request.id ? null : current));
      await loadRequests();
    } catch (requestError: any) {
      setFeedbackById((current) => ({
        ...current,
        [request.id]: requestError?.message || 'No se pudo editar la solicitud.',
      }));
    } finally {
      setSavingId(null);
    }
  };

  const deleteRequest = async (request: AdminClientRequestItem) => {
    const confirmed = window.confirm(`Vas a eliminar la solicitud "${request.title}". Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingId(request.id);
    setFeedbackById((current) => ({ ...current, [request.id]: '' }));
    try {
      const response = await fetch(`/api/admin/client-requests?requestId=${encodeURIComponent(request.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload?.error || 'No se pudo eliminar la solicitud.');

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setEditingId((current) => (current === request.id ? null : current));
      setDraftsById((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      setEmailTargets((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
    } catch (requestError: any) {
      setFeedbackById((current) => ({
        ...current,
        [request.id]: requestError?.message || 'No se pudo eliminar la solicitud.',
      }));
    } finally {
      setDeletingId(null);
    }
  };

  const sendEmail = async (request: AdminClientRequestItem) => {
    const toEmail = toText(emailTargets[request.id]);
    if (!toEmail) {
      setFeedbackById((current) => ({ ...current, [request.id]: 'Carga al menos un email destino.' }));
      return;
    }

    setSendingId(request.id);
    setFeedbackById((current) => ({ ...current, [request.id]: '' }));
    try {
      const response = await fetch('/api/admin/client-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'send_email',
          requestId: request.id,
          toEmail,
        }),
      });
      const payload = (await response.json()) as { error?: string; sentTo?: string[] };
      if (!response.ok) throw new Error(payload?.error || 'No se pudo enviar el mail.');

      setFeedbackById((current) => ({
        ...current,
        [request.id]: `Mail enviado a ${(payload.sentTo || []).join(', ') || toEmail}.`,
      }));
    } catch (requestError: any) {
      setFeedbackById((current) => ({
        ...current,
        [request.id]: requestError?.message || 'No se pudo enviar el mail.',
      }));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Solicitudes cliente</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Gestion operativa desde admin</h3>
            <p className="mt-1 text-sm text-slate-500">
              Edita, elimina y comparte cada solicitud por ticket, WhatsApp o mail sin salir de admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {requests.length} solicitudes
            </span>
            <button
              type="button"
              onClick={loadRequests}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente, trabajo, rubro, ciudad o direccion..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {resendConfigured ? (
              <>
                <p className="font-semibold text-slate-800">Mail listo</p>
                <p className="mt-1">Desde: {fromEmail || 'configurado'}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-rose-700">Mail no configurado</p>
                <p className="mt-1">Faltan variables de Resend para envio desde admin.</p>
              </>
            )}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando solicitudes...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No hay solicitudes para mostrar con este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const draft = draftsById[request.id] || buildEditDraft(request);
            const isEditing = editingId === request.id;
            const isSaving = savingId === request.id;
            const isDeleting = deletingId === request.id;

            return (
              <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass(request.status)}`}>
                      {statusLabel(request.status)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${urgencyClass(request.urgency)}`}>
                      Urgencia {request.urgency}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                      {request.mode === 'direct' ? 'Directa' : 'Marketplace'}
                    </span>
                  </div>
                  <h4 className="mt-3 text-xl font-semibold text-slate-900">{request.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {request.category} | {request.city || 'Sin ciudad'} | {request.address}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <p>Actualizada: {formatDateTime(request.updatedAt)}</p>
                  <p className="mt-1">Creada: {formatDateTime(request.createdAt)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={request.ticketHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                >
                  Ver ticket
                </a>
                <button
                  type="button"
                  onClick={() => copyTicketLink(request)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Copiar ticket
                </button>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => cancelEditing(request)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cancelar edicion
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(request)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Editar solicitud
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteRequest(request)}
                  disabled={isDeleting}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar solicitud'}
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Solicitud</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{request.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                      Matches: {Number(request.matchesCount || 0)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                      Cotizaciones: {Number(request.submittedQuotesCount || 0)}
                    </span>
                    {toText(request.preferredWindow) && (
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                        Franja: {toText(request.preferredWindow)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente y difusion</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{request.clientName || 'Cliente UrbanFix'}</p>
                    {request.clientEmail && <p>{request.clientEmail}</p>}
                    {request.clientPhone && <p>{request.clientPhone}</p>}
                    {request.targetTechnicianName && (
                      <p className="text-xs text-slate-500">
                        Tecnico objetivo: {request.targetTechnicianName}
                        {request.targetTechnicianPhone ? ` | ${request.targetTechnicianPhone}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={request.whatsappHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-95"
                    >
                      Compartir por WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => copyWhatsappText(request)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Copiar texto
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Email destino</label>
                    <input
                      value={emailTargets[request.id] || ''}
                      onChange={(event) =>
                        setEmailTargets((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="cliente@dominio.com o varios separados por coma"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => sendEmail(request)}
                        disabled={!resendConfigured || sendingId === request.id}
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {sendingId === request.id ? 'Enviando...' : 'Enviar mail'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEmailTargets((current) => ({
                            ...current,
                            [request.id]: toText(request.clientEmail),
                          }))
                        }
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        Usar email del cliente
                      </button>
                    </div>
                  </div>

                  {feedbackById[request.id] && <p className="mt-3 text-xs text-slate-600">{feedbackById[request.id]}</p>}
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Editar solicitud</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      value={draft.title}
                      onChange={(event) => updateDraftField(request.id, 'title', event.target.value)}
                      placeholder="Titulo del trabajo"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <input
                      value={draft.category}
                      onChange={(event) => updateDraftField(request.id, 'category', event.target.value)}
                      placeholder="Rubro"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <input
                      value={draft.city}
                      onChange={(event) => updateDraftField(request.id, 'city', event.target.value)}
                      placeholder="Ciudad o zona"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <input
                      value={draft.address}
                      onChange={(event) => updateDraftField(request.id, 'address', event.target.value)}
                      placeholder="Direccion"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <select
                      value={draft.urgency}
                      onChange={(event) => updateDraftField(request.id, 'urgency', event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    >
                      <option value="alta">Urgencia alta</option>
                      <option value="media">Urgencia media</option>
                      <option value="baja">Urgencia baja</option>
                    </select>
                    <select
                      value={draft.mode}
                      onChange={(event) => updateDraftField(request.id, 'mode', event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    >
                      <option value="marketplace">Marketplace</option>
                      <option value="direct">Asignacion directa</option>
                    </select>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraftField(request.id, 'status', event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    >
                      <option value="published">Publicada</option>
                      <option value="matched">Matcheada</option>
                      <option value="quoted">Cotizada</option>
                      <option value="direct_sent">Directa enviada</option>
                      <option value="selected">Tecnico elegido</option>
                      <option value="scheduled">Agendada</option>
                      <option value="in_progress">En curso</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                    <input
                      value={draft.preferredWindow}
                      onChange={(event) => updateDraftField(request.id, 'preferredWindow', event.target.value)}
                      placeholder="Franja horaria sugerida"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <input
                      value={draft.targetTechnicianName}
                      onChange={(event) => updateDraftField(request.id, 'targetTechnicianName', event.target.value)}
                      placeholder="Tecnico objetivo"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400"
                    />
                    <input
                      value={draft.targetTechnicianPhone}
                      onChange={(event) => updateDraftField(request.id, 'targetTechnicianPhone', event.target.value)}
                      placeholder="Telefono del tecnico"
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400 md:col-span-2"
                    />
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraftField(request.id, 'description', event.target.value)}
                      placeholder="Descripcion de la solicitud"
                      rows={5}
                      className="w-full rounded-[24px] border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-400 md:col-span-2"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveRequest(request)}
                      disabled={isSaving}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEditing(request)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
