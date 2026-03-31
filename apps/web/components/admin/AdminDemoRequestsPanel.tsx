'use client';

import { useEffect, useMemo, useState } from 'react';

type DemoRequestStatus = 'new' | 'contacted' | 'qualified' | 'closed';

type DemoRequestItem = {
  id: string;
  source: string;
  status: DemoRequestStatus;
  full_name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  role?: string | null;
  city?: string | null;
  team_size?: string | null;
  platform_interest?: string | null;
  use_case?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

type DemoRequestsResponse = {
  requests: DemoRequestItem[];
};

type Props = {
  accessToken: string;
  active: boolean;
};

const STATUS_OPTIONS: Array<{ value: DemoRequestStatus; label: string }> = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'closed', label: 'Cerrado' },
];

const STATUS_BADGE_CLASS: Record<DemoRequestStatus, string> = {
  new: 'border border-amber-200 bg-amber-50 text-amber-700',
  contacted: 'border border-sky-200 bg-sky-50 text-sky-700',
  qualified: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border border-slate-200 bg-slate-100 text-slate-700',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR');
};

const normalizeText = (value?: string | null) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toCsvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const buildWhatsappHref = (phone?: string | null, fullName?: string | null) => {
  const digits = String(phone || '').replace(/\D+/g, '');
  if (!digits) return '';
  const text = encodeURIComponent(`Hola ${String(fullName || '').trim() || ''}, te escribimos desde UrbanFix por tu solicitud de demo.`.trim());
  return `https://wa.me/${digits}?text=${text}`;
};

export default function AdminDemoRequestsPanel({ accessToken, active }: Props) {
  const [requests, setRequests] = useState<DemoRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DemoRequestStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/demo-requests', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<DemoRequestsResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar las solicitudes de demo.');
      }
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    } catch (nextError: any) {
      setError(nextError?.message || 'No se pudieron cargar las solicitudes de demo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active || !accessToken) return;
    loadRequests();
  }, [active, accessToken]);

  const filteredRequests = useMemo(() => {
    const query = normalizeText(search);
    return requests.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = normalizeText(
        [
          item.full_name,
          item.email,
          item.phone,
          item.company_name,
          item.role,
          item.city,
          item.platform_interest,
          item.use_case,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
      );
      return haystack.includes(query);
    });
  }, [requests, search, statusFilter]);

  const totals = useMemo(
    () => ({
      total: requests.length,
      new: requests.filter((item) => item.status === 'new').length,
      contacted: requests.filter((item) => item.status === 'contacted').length,
      qualified: requests.filter((item) => item.status === 'qualified').length,
      closed: requests.filter((item) => item.status === 'closed').length,
    }),
    [requests]
  );

  const patchStatus = async (id: string, status: DemoRequestStatus) => {
    setUpdatingId(id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/demo-requests', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; request?: DemoRequestItem };
      if (!response.ok || !payload.request) {
        throw new Error(payload?.error || 'No se pudo actualizar la solicitud.');
      }
      setRequests((current) => current.map((item) => (item.id === id ? payload.request! : item)));
      setMessage('Estado actualizado.');
    } catch (nextError: any) {
      setError(nextError?.message || 'No se pudo actualizar la solicitud.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.1)] backdrop-blur-[2px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Captación comercial</p>
          <h3 className="text-lg font-semibold text-slate-900">Solicitudes de demo</h3>
          <p className="text-sm text-slate-500">Leads que entraron desde la nueva puerta de demo para Android, web o demo guiada.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadRequests}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'demo_requests.csv',
                filteredRequests.map((item) => ({
                  fecha: item.created_at,
                  estado: item.status,
                  nombre: item.full_name,
                  email: item.email,
                  telefono: item.phone || '',
                  empresa: item.company_name || '',
                  rol: item.role || '',
                  ciudad: item.city || '',
                  equipo: item.team_size || '',
                  interes: item.platform_interest || '',
                  caso_uso: item.use_case || '',
                  notas: item.notes || '',
                  fuente: item.source || '',
                }))
              )
            }
            disabled={!filteredRequests.length}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.total}</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600">Nuevos</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{totals.new}</p>
        </div>
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-600">Contactados</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">{totals.contacted}</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Calificados</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{totals.qualified}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cerrados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.closed}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, email, empresa o necesidad..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | DemoRequestStatus)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{filteredRequests.length} resultado(s)</span>
      </div>

      {error && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>}
      {!error && message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="mt-5 space-y-4">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Cargando solicitudes de demo...
          </div>
        )}
        {!loading && filteredRequests.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay solicitudes para los filtros actuales.
          </div>
        )}
        {!loading &&
          filteredRequests.map((item) => {
            const whatsappHref = buildWhatsappHref(item.phone, item.full_name);
            return (
              <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-900">{item.full_name}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_BADGE_CLASS[item.status]}`}>
                        {STATUS_OPTIONS.find((option) => option.value === item.status)?.label || item.status}
                      </span>
                      {item.platform_interest && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                          {item.platform_interest}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.company_name || 'Sin empresa'}
                      {item.role ? ` • ${item.role}` : ''}
                      {item.city ? ` • ${item.city}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <a href={`mailto:${item.email}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                        {item.email}
                      </a>
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                          {item.phone}
                        </a>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                        Fuente: {item.source || 'download-page'}
                      </span>
                      {item.team_size && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                          Equipo: {item.team_size}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(event) => patchStatus(item.id, event.target.value as DemoRequestStatus)}
                      disabled={updatingId === item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    )}
                    <a
                      href={`mailto:${item.email}?subject=${encodeURIComponent('UrbanFix demo')}`}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Email
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Qué quiere probar</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.use_case || 'Sin detalle.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Comentarios</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.notes || 'Sin comentarios adicionales.'}</p>
                    <p className="mt-3 text-[11px] text-slate-400">Creado: {formatDateTime(item.created_at)} • Actualizado: {formatDateTime(item.updated_at)}</p>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}