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
    } catch (requestError: any) {
      setError(requestError?.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    loadRequests();
  }, [active]);

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
              Comparte cada solicitud por WhatsApp o dispara mail desde el panel sin salir de admin.
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
          {filteredRequests.map((request) => (
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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
