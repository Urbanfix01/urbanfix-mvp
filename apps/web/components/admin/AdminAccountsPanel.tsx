'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ManagedAudience = 'cliente' | 'empresa';
type FilterStatus = 'all' | 'complete' | 'incomplete' | 'active' | 'online' | 'no_profile';

export type AudienceAccountStats = {
  total: number;
  attention: number;
  complete: number;
  incomplete: number;
  active: number;
  online: number;
  noProfile: number;
};

type AdminAccountsPanelProps = {
  accessToken?: string | null;
  audience: ManagedAudience;
  onStatsChange?: (stats: AudienceAccountStats) => void;
};

type AccountProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  service_city: string | null;
  service_province: string | null;
  service_district: string | null;
  company_address: string | null;
  coverage_area: string | null;
  working_hours: string | null;
  specialties: string | null;
  access_granted: boolean | null;
  profile_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_seen_at: string | null;
  last_seen_path: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
};

type AccountItem = {
  id: string;
  audience: string;
  audienceSource: string;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  confirmedAt: string | null;
  bannedUntil: string | null;
  metadata: {
    fullName: string;
    businessName: string;
    userType: string;
    profile: string;
    appAudience: string;
  };
  profile: AccountProfile | null;
};

const AUDIENCE_COPY: Record<
  ManagedAudience,
  {
    singular: string;
    plural: string;
    title: string;
    subtitle: string;
    profileLabel: string;
    empty: string;
  }
> = {
  cliente: {
    singular: 'cliente',
    plural: 'clientes',
    title: 'Administracion de clientes',
    subtitle: 'Revisa cuentas, WhatsApp, actividad y perfil base de quienes piden trabajos.',
    profileLabel: 'Perfil cliente',
    empty: 'No hay clientes para este filtro.',
  },
  empresa: {
    singular: 'empresa',
    plural: 'empresas',
    title: 'Administracion de empresas',
    subtitle: 'Revisa cuentas de empresa, responsable, contacto y datos comerciales.',
    profileLabel: 'Perfil empresa',
    empty: 'No hay empresas para este filtro.',
  },
};

const toText = (value: unknown) => String(value || '').trim();
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const normalizeEmail = (value: unknown) => {
  const normalized = toText(value).toLowerCase();
  return normalized.includes('@') ? normalized : '';
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-AR');
};

const isRecent = (value: string | null | undefined) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() <= 30 * 24 * 60 * 60 * 1000;
};

const isOnline = (value: string | null | undefined) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() <= ONLINE_WINDOW_MS;
};

const getProfileLabel = (account: AccountItem) =>
  toText(account.profile?.business_name) ||
  toText(account.profile?.full_name) ||
  toText(account.metadata.businessName) ||
  toText(account.metadata.fullName) ||
  normalizeEmail(account.email) ||
  account.id;

const getContactEmail = (account: AccountItem) => normalizeEmail(account.profile?.email) || normalizeEmail(account.email);

const getContactPhone = (account: AccountItem) => toText(account.profile?.phone) || toText(account.phone);

const getLocationLabel = (account: AccountItem) =>
  [
    account.profile?.service_city || account.profile?.city,
    account.profile?.service_district,
    account.profile?.service_province,
    account.profile?.country,
  ]
    .map(toText)
    .filter(Boolean)
    .join(', ');

const getAddressLabel = (account: AccountItem) =>
  toText(account.profile?.company_address) || toText(account.profile?.address) || toText(account.profile?.coverage_area);

const getWhatsappHref = (account: AccountItem) => {
  const digits = getContactPhone(account).replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : '';
};

const getMailHref = (account: AccountItem) => {
  const email = getContactEmail(account);
  return email ? `mailto:${email}` : '';
};

const getMissingLabels = (account: AccountItem, audience: ManagedAudience) => {
  const missing: string[] = [];
  const label = getProfileLabel(account);
  const email = getContactEmail(account);
  const phone = getContactPhone(account);
  const location = getLocationLabel(account) || getAddressLabel(account);

  if (!account.profile) missing.push('perfil');
  if (!label || label === account.id) missing.push(audience === 'empresa' ? 'empresa' : 'nombre');
  if (audience === 'empresa' && !toText(account.profile?.business_name || account.metadata.businessName)) {
    missing.push('nombre de empresa');
  }
  if (!email && !phone) missing.push('mail o WhatsApp');
  if (audience === 'cliente' && !phone) missing.push('WhatsApp');
  if (audience === 'empresa' && !location) missing.push('zona');

  return Array.from(new Set(missing));
};

const getStatusBadge = (account: AccountItem, audience: ManagedAudience) => {
  if (!account.profile) {
    return { label: 'Sin perfil', className: 'border-rose-200 bg-rose-50 text-rose-700' };
  }
  if (getMissingLabels(account, audience).length > 0) {
    return { label: 'Incompleto', className: 'border-amber-200 bg-amber-50 text-amber-800' };
  }
  if (isRecent(account.lastSignInAt || account.profile.last_seen_at)) {
    return { label: 'Activo', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }
  return { label: 'Completo', className: 'border-blue-200 bg-blue-50 text-blue-700' };
};

export default function AdminAccountsPanel({ accessToken = null, audience, onStatsChange }: AdminAccountsPanelProps) {
  const copy = AUDIENCE_COPY[audience];
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedId, setSelectedId] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [convertCandidate, setConvertCandidate] = useState<AccountItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AccountItem | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) || null,
    [accounts, selectedId]
  );

  const stats = useMemo<AudienceAccountStats>(() => {
    const complete = accounts.filter((account) => getMissingLabels(account, audience).length === 0).length;
    const noProfile = accounts.filter((account) => !account.profile).length;
    const active = accounts.filter((account) => isRecent(account.lastSignInAt || account.profile?.last_seen_at)).length;
    const online = accounts.filter((account) => isOnline(account.profile?.last_seen_at)).length;
    const incomplete = Math.max(0, accounts.length - complete);

    return {
      total: accounts.length,
      attention: incomplete,
      complete,
      incomplete,
      active,
      online,
      noProfile,
    };
  }, [accounts, audience]);

  useEffect(() => {
    onStatsChange?.(stats);
  }, [onStatsChange, stats]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts
      .filter((account) => {
        const missing = getMissingLabels(account, audience);
        if (filterStatus === 'complete') return missing.length === 0;
        if (filterStatus === 'incomplete') return missing.length > 0;
        if (filterStatus === 'active') return isRecent(account.lastSignInAt || account.profile?.last_seen_at);
        if (filterStatus === 'online') return isOnline(account.profile?.last_seen_at);
        if (filterStatus === 'no_profile') return !account.profile;
        return true;
      })
      .filter((account) => {
        if (!query) return true;
        return [
          getProfileLabel(account),
          getContactEmail(account),
          getContactPhone(account),
          getLocationLabel(account),
          getAddressLabel(account),
          account.metadata.userType,
          account.metadata.profile,
        ]
          .map((value) => toText(value).toLowerCase())
          .some((value) => value.includes(query));
      });
  }, [accounts, audience, filterStatus, searchQuery]);

  const getDetailRows = (account: AccountItem) => {
    const rows: string[][] = [
      ['Nombre', toText(account.profile?.full_name) || toText(account.metadata.fullName)],
      ['Email', getContactEmail(account)],
      ['WhatsApp', getContactPhone(account)],
      ['Zona', getLocationLabel(account) || getAddressLabel(account)],
    ];

    if (audience === 'empresa') {
      rows.splice(1, 0, [
        'Empresa',
        toText(account.profile?.business_name) || toText(account.metadata.businessName),
      ]);
    }

    return rows;
  };

  const loadAccounts = async () => {
    if (!accessToken) {
      setIsLoading(false);
      setMessage('No hay sesion admin activa.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/accounts?audience=${encodeURIComponent(audience)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { accounts?: AccountItem[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || `No se pudieron cargar ${copy.plural}.`);
      }

      const nextAccounts = payload?.accounts || [];
      setAccounts(nextAccounts);
      if (selectedId && !nextAccounts.some((account) => account.id === selectedId)) {
        setSelectedId('');
      }
    } catch (error) {
      console.error(`Error cargando ${copy.plural} admin:`, error);
      setMessage(error instanceof Error ? error.message : `No se pudieron cargar ${copy.plural}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, audience]);

  const openConvertDialog = (account: AccountItem) => {
    if (actionLoadingId || audience !== 'cliente') return;
    setMessage('');
    setConvertCandidate(account);
  };

  const closeConvertDialog = () => {
    if (actionLoadingId.endsWith(':convert')) return;
    setConvertCandidate(null);
  };

  const runConvertToTechnician = async () => {
    if (!accessToken || !convertCandidate || actionLoadingId) return;

    const convertedLabel = getProfileLabel(convertCandidate);
    setActionLoadingId(`${convertCandidate.id}:convert`);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(convertCandidate.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'change_audience',
          targetAudience: 'tecnico',
          fromAudience: audience,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo pasar la cuenta a tecnico.');
      }

      if (selectedId === convertCandidate.id) {
        setSelectedId('');
      }
      setConvertCandidate(null);
      await loadAccounts();
      setMessage(`${convertedLabel} ahora figura en Tecnicos para revision.`);
    } catch (error) {
      console.error('Error pasando cuenta a tecnico:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo pasar la cuenta a tecnico.');
    } finally {
      setActionLoadingId('');
    }
  };

  const openDeleteDialog = (account: AccountItem) => {
    if (actionLoadingId) return;
    setMessage('');
    setDeleteCandidate(account);
    setDeleteConfirmStep(1);
    setDeleteConfirmText('');
  };

  const closeDeleteDialog = () => {
    if (actionLoadingId.endsWith(':delete')) return;
    setDeleteCandidate(null);
    setDeleteConfirmStep(1);
    setDeleteConfirmText('');
  };

  const runDeleteAccount = async () => {
    if (!accessToken || !deleteCandidate || actionLoadingId) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR') {
      setMessage('Para eliminar definitivamente, escribi ELIMINAR.');
      return;
    }

    const deletedLabel = getProfileLabel(deleteCandidate);
    setActionLoadingId(`${deleteCandidate.id}:delete`);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(deleteCandidate.id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: deleteCandidate.id,
          confirmation: 'ELIMINAR',
          audience,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar la cuenta.');
      }

      if (selectedId === deleteCandidate.id) {
        setSelectedId('');
      }
      setDeleteCandidate(null);
      setDeleteConfirmStep(1);
      setDeleteConfirmText('');
      await loadAccounts();
      setMessage(`Cuenta eliminada definitivamente: ${deletedLabel}.`);
    } catch (error) {
      console.error(`Error eliminando ${copy.singular}:`, error);
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.');
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6688]">
              Revision de cuentas
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-950">{copy.title}</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={loadAccounts}
            disabled={isLoading || !accessToken}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {[
          { key: 'online', label: 'Online', value: stats.online, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
          { key: 'complete', label: 'Completos', value: stats.complete, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
          { key: 'incomplete', label: 'Incompletos', value: stats.incomplete, className: 'border-amber-200 bg-amber-50 text-amber-800' },
          { key: 'active', label: 'Activos 30d', value: stats.active, className: 'border-blue-200 bg-blue-50 text-blue-800' },
          { key: 'no_profile', label: 'Sin perfil', value: stats.noProfile, className: 'border-rose-200 bg-rose-50 text-rose-800' },
          { key: 'all', label: 'Total', value: stats.total, className: 'border-slate-200 bg-white text-slate-900' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilterStatus(item.key as FilterStatus)}
            className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${item.className} ${
              filterStatus === item.key ? 'ring-2 ring-slate-900/10' : ''
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">{item.value}</p>
          </button>
        ))}
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={`Buscar ${copy.plural} por nombre, email, WhatsApp o zona`}
            className="min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            {filteredAccounts.length} resultado(s)
          </span>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {message}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {isLoading && <p className="py-8 text-center text-sm text-slate-500">Cargando {copy.plural}...</p>}
          {!isLoading && filteredAccounts.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">{copy.empty}</p>
          )}
          {!isLoading &&
            filteredAccounts.map((account) => {
              const badge = getStatusBadge(account, audience);
              const missing = getMissingLabels(account, audience);
              const email = getContactEmail(account);
              const phone = getContactPhone(account);
              const location = getLocationLabel(account) || getAddressLabel(account);
              const accountIsOnline = isOnline(account.profile?.last_seen_at);

              return (
                <article
                  key={account.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-base font-bold text-slate-950">{getProfileLabel(account)}</h4>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        {accountIsOnline && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        )}
                        {account.audienceSource === 'inferido' && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                            Tipo inferido
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{email || 'Sin email'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {phone || 'Sin WhatsApp'} - {location || 'Sin zona'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Alta: {formatDateTime(account.createdAt)} · Ultimo ingreso: {formatDateTime(account.lastSignInAt)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Actividad: {accountIsOnline ? 'online ahora' : formatDateTime(account.profile?.last_seen_at)}
                        {account.profile?.last_seen_path ? ` · ${account.profile.last_seen_path}` : ''}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {missing.length === 0 ? 'Datos clave completos.' : `Falta: ${missing.join(', ')}.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(account.id)}
                        className="rounded-full border border-[#d8c7e3] bg-[#f7f0fb] px-3 py-2 text-xs font-semibold text-[#4a1b63] transition hover:bg-[#f0e1f8]"
                      >
                        Revisar cuenta
                      </button>
                      {audience === 'cliente' && (
                        <button
                          type="button"
                          onClick={() => openConvertDialog(account)}
                          disabled={Boolean(actionLoadingId)}
                          className="rounded-full border border-[#ffb15a] bg-[#fff7ed] px-3 py-2 text-xs font-semibold text-[#9b4a00] transition hover:bg-[#ffedd5] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Pasar a tecnico
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(account)}
                        disabled={Boolean(actionLoadingId)}
                        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Eliminar cuenta
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-account-review-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.profileLabel}</p>
                <h4 id="admin-account-review-title" className="mt-1 text-xl font-bold text-slate-950">
                  {getProfileLabel(selectedAccount)}
                </h4>
                <p className="mt-1 text-sm text-slate-600">{getContactEmail(selectedAccount) || 'Sin email'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId('')}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {getWhatsappHref(selectedAccount) ? (
                <a
                  href={getWhatsappHref(selectedAccount)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  WhatsApp
                </a>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                  Sin WhatsApp
                </span>
              )}
              {getMailHref(selectedAccount) ? (
                <a
                  href={getMailHref(selectedAccount)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Email
                </a>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                  Sin email
                </span>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist de cuenta</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  getMissingLabels(selectedAccount, audience).length === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {getMissingLabels(selectedAccount, audience).length === 0
                    ? 'Completo'
                    : `${getMissingLabels(selectedAccount, audience).length} faltante(s)`}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {getDetailRows(selectedAccount).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                    <span className={`text-right text-sm font-semibold ${value ? 'text-slate-900' : 'text-amber-700'}`}>
                      {value || 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-950">ID:</span> {selectedAccount.id}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Tipo:</span> {selectedAccount.audience} ({selectedAccount.audienceSource})</p>
              <p className="mt-2">
                <span className="font-semibold text-slate-950">Estado:</span>{' '}
                {isOnline(selectedAccount.profile?.last_seen_at) ? 'Online ahora' : 'Offline'}
              </p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Alta:</span> {formatDateTime(selectedAccount.createdAt)}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Ultimo ingreso:</span> {formatDateTime(selectedAccount.lastSignInAt)}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Ultima actividad:</span> {formatDateTime(selectedAccount.profile?.last_seen_at)}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Ruta:</span> {selectedAccount.profile?.last_seen_path || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {convertCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-account-convert-title"
            className="w-full max-w-lg rounded-[28px] border border-[#ffcf91] bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9b4a00]">
                  Cambio de perfil
                </p>
                <h4 id="admin-account-convert-title" className="mt-1 text-xl font-bold text-slate-950">
                  {getProfileLabel(convertCandidate)}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {getContactEmail(convertCandidate) || getContactPhone(convertCandidate) || 'Sin contacto visible'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConvertDialog}
                disabled={actionLoadingId.endsWith(':convert')}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#ffcf91] bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-[#7c2d12]">
                Esta cuenta dejara de figurar como cliente y pasara a Tecnicos.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#9b4a00]">
                No se aprueba ni se publica automaticamente. Queda pendiente para revisar datos, zona y aprobacion.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConvertDialog}
                  disabled={actionLoadingId.endsWith(':convert')}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={runConvertToTechnician}
                  disabled={actionLoadingId.endsWith(':convert')}
                  className="min-w-[170px] rounded-full border border-[#ff8f1f] bg-[#ff8f1f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e9790b] disabled:cursor-not-allowed disabled:border-orange-200 disabled:bg-orange-200 disabled:text-white/80"
                >
                  {actionLoadingId.endsWith(':convert') ? 'Cambiando...' : 'Pasar a tecnico'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-account-delete-title"
            className="w-full max-w-lg rounded-[28px] border border-rose-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Eliminacion definitiva
                </p>
                <h4 id="admin-account-delete-title" className="mt-1 text-xl font-bold text-slate-950">
                  {getProfileLabel(deleteCandidate)}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {getContactEmail(deleteCandidate) || getContactPhone(deleteCandidate) || 'Sin contacto visible'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={actionLoadingId.endsWith(':delete')}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            {deleteConfirmStep === 1 ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">
                  Esto elimina el perfil y la cuenta de acceso vinculada.
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-800">
                  La cuenta deja de aparecer en administracion y no podra ingresar con este usuario.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmStep(2)}
                    className="min-w-[170px] rounded-full border border-[#9f1239] bg-[#be123c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9f1239]"
                  >
                    Entiendo, continuar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-white p-4">
                <label className="text-sm font-semibold text-slate-900" htmlFor="delete-account-confirmation">
                  Escribi ELIMINAR para confirmar
                </label>
                <input
                  id="delete-account-confirmation"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="ELIMINAR"
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400"
                  autoFocus
                />
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmStep(1)}
                    disabled={actionLoadingId.endsWith(':delete')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={runDeleteAccount}
                    disabled={deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR' || actionLoadingId.endsWith(':delete')}
                    className="min-w-[170px] rounded-full bg-[#be123c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9f1239] disabled:cursor-not-allowed disabled:bg-rose-200 disabled:text-white/70"
                  >
                    {actionLoadingId.endsWith(':delete') ? 'Eliminando...' : 'Eliminar definitivo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
