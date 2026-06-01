'use client';

import React, { useEffect, useMemo, useState } from 'react';

type AdminTechniciansUnifiedProps = {
  accessToken?: string | null;
};

type TechnicianProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  company_address: string | null;
  coverage_area: string | null;
  specialties: string | null;
  access_granted: boolean | null;
  access_granted_at: string | null;
  profile_published: boolean | null;
  profile_published_at: string | null;
  service_lat: number | string | null;
  service_lng: number | string | null;
  service_location_precision: string | null;
  admin_review_status: string | null;
  admin_review_reason: string | null;
  admin_review_marked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FilterStatus = 'all' | 'ready' | 'review' | 'approved' | 'incomplete';
type ReviewAction = 'approve' | 'correction' | 'reject';

const toText = (value: unknown) => String(value || '').trim();

const normalizeEmail = (value: unknown) => {
  const normalized = toText(value).toLowerCase();
  return normalized.includes('@') ? normalized : '';
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasExactMapPoint = (profile: TechnicianProfile) =>
  toFiniteNumber(profile.service_lat) !== null &&
  toFiniteNumber(profile.service_lng) !== null &&
  toText(profile.service_location_precision).toLowerCase() === 'exact';

const getApprovalMissingLabels = (profile: TechnicianProfile) => {
  const missing: string[] = [];
  if (!toText(profile.full_name)) missing.push('nombre');
  if (!toText(profile.business_name)) missing.push('negocio');
  if (!normalizeEmail(profile.email)) missing.push('email');
  if (!toText(profile.phone)) missing.push('WhatsApp');
  if (!toText(profile.city)) missing.push('localidad');
  if (!hasExactMapPoint(profile)) missing.push('ubicacion exacta');
  return missing;
};

const isPendingReview = (profile: TechnicianProfile) =>
  toText(profile.admin_review_status).toLowerCase() === 'pending';

const isApprovalReady = (profile: TechnicianProfile) =>
  profile.access_granted !== true && getApprovalMissingLabels(profile).length === 0;

const getProfileLabel = (profile: TechnicianProfile) =>
  toText(profile.business_name) || toText(profile.full_name) || toText(profile.email) || 'Tecnico sin nombre';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-AR');
};

const statusBadge = (profile: TechnicianProfile) => {
  if (profile.access_granted === true) {
    return {
      label: profile.profile_published === false ? 'Aprobado oculto' : 'Aprobado',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (isApprovalReady(profile)) {
    return { label: 'Listo para aprobar', className: 'border-blue-200 bg-blue-50 text-blue-700' };
  }
  if (isPendingReview(profile)) {
    return { label: 'En revision', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }
  return { label: 'Incompleto', className: 'border-slate-200 bg-slate-50 text-slate-600' };
};

export default function AdminTechniciansUnified({ accessToken = null }: AdminTechniciansUnifiedProps) {
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ready');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) || null,
    [profiles, selectedId]
  );

  const stats = useMemo(
    () => ({
      total: profiles.length,
      ready: profiles.filter(isApprovalReady).length,
      review: profiles.filter((profile) => profile.access_granted !== true && isPendingReview(profile)).length,
      approved: profiles.filter((profile) => profile.access_granted === true).length,
      incomplete: profiles.filter(
        (profile) => profile.access_granted !== true && !isApprovalReady(profile) && !isPendingReview(profile)
      ).length,
    }),
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (filterStatus === 'ready') return isApprovalReady(profile);
        if (filterStatus === 'review') return profile.access_granted !== true && isPendingReview(profile);
        if (filterStatus === 'approved') return profile.access_granted === true;
        if (filterStatus === 'incomplete') {
          return profile.access_granted !== true && !isApprovalReady(profile) && !isPendingReview(profile);
        }
        return true;
      })
      .filter((profile) => {
        if (!query) return true;
        return [profile.full_name, profile.business_name, profile.email, profile.phone, profile.city]
          .map((value) => toText(value).toLowerCase())
          .some((value) => value.includes(query));
      });
  }, [filterStatus, profiles, searchQuery]);

  const loadProfiles = async () => {
    if (!accessToken) {
      setIsLoading(false);
      setMessage('No hay sesion admin activa.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/access/technicians', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { profiles?: TechnicianProfile[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar tecnicos.');
      }

      const nextProfiles = payload?.profiles || [];
      setProfiles(nextProfiles);
      if (selectedId && !nextProfiles.some((profile) => profile.id === selectedId)) {
        setSelectedId('');
      }
    } catch (error) {
      console.error('Error cargando tecnicos admin:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudieron cargar tecnicos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const runReviewAction = async (profile: TechnicianProfile, action: ReviewAction) => {
    if (!accessToken || actionLoadingId) return;

    const missing = getApprovalMissingLabels(profile);
    if (action === 'approve' && missing.length > 0) {
      setMessage(`Falta completar antes de aprobar: ${missing.join(', ')}.`);
      setSelectedId(profile.id);
      return;
    }

    const reviewReason =
      action === 'correction'
        ? `Completar antes de aprobar: ${missing.join(', ') || 'revision manual pendiente'}.`
        : action === 'reject'
          ? 'Perfil descartado por revision admin.'
          : '';

    setActionLoadingId(`${profile.id}:${action}`);
    setMessage('');

    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: profile.id,
          accessGranted: action === 'approve',
          profilePublished: action === 'approve',
          reviewStatus: action === 'approve' ? 'resolved' : action === 'correction' ? 'pending' : 'dismissed',
          reviewReason,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo actualizar el perfil.');
      }

      setMessage(
        action === 'approve'
          ? 'Tecnico aprobado y publicado.'
          : action === 'correction'
            ? 'Perfil marcado para correccion.'
            : 'Perfil rechazado.'
      );
      await loadProfiles();
      setSelectedId(profile.id);
    } catch (error) {
      console.error('Error actualizando aprobacion:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setActionLoadingId('');
    }
  };

  const renderActionButtons = (profile: TechnicianProfile) => {
    const loadingApprove = actionLoadingId === `${profile.id}:approve`;
    const loadingCorrection = actionLoadingId === `${profile.id}:correction`;
    const loadingReject = actionLoadingId === `${profile.id}:reject`;
    const missing = getApprovalMissingLabels(profile);
    const canApprove = profile.access_granted !== true && missing.length === 0;

    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runReviewAction(profile, 'approve')}
          disabled={!canApprove || Boolean(actionLoadingId)}
          className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loadingApprove ? 'Aprobando...' : 'Aprobar y publicar'}
        </button>
        <button
          type="button"
          onClick={() => runReviewAction(profile, 'correction')}
          disabled={profile.access_granted === true || Boolean(actionLoadingId)}
          className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingCorrection ? 'Marcando...' : 'Pedir correccion'}
        </button>
        <button
          type="button"
          onClick={() => runReviewAction(profile, 'reject')}
          disabled={Boolean(actionLoadingId)}
          className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingReject ? 'Rechazando...' : 'Rechazar'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Semana 1</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-950">Aprobacion de tecnicos</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Controla quien puede operar. Un tecnico solo se aprueba si tiene datos clave completos y ubicacion exacta.
            </p>
          </div>
          <button
            type="button"
            onClick={loadProfiles}
            disabled={isLoading || !accessToken}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {[
            { key: 'ready', label: 'Listos', value: stats.ready, className: 'border-blue-200 bg-blue-50 text-blue-800' },
            { key: 'review', label: 'En revision', value: stats.review, className: 'border-amber-200 bg-amber-50 text-amber-800' },
            { key: 'approved', label: 'Aprobados', value: stats.approved, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            { key: 'incomplete', label: 'Incompletos', value: stats.incomplete, className: 'border-slate-200 bg-slate-50 text-slate-700' },
            { key: 'all', label: 'Total', value: stats.total, className: 'border-slate-200 bg-white text-slate-900' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilterStatus(item.key as FilterStatus)}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${item.className} ${
                filterStatus === item.key ? 'ring-2 ring-slate-900/10' : ''
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nombre, negocio, email o telefono"
              className="min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              {filteredProfiles.length} resultado(s)
            </span>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {message}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {isLoading && <p className="py-8 text-center text-sm text-slate-500">Cargando tecnicos...</p>}
            {!isLoading && filteredProfiles.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No hay tecnicos para este filtro.</p>
            )}
            {!isLoading &&
              filteredProfiles.map((profile) => {
                const badge = statusBadge(profile);
                const missing = getApprovalMissingLabels(profile);
                return (
                  <article
                    key={profile.id}
                    className={`rounded-2xl border p-4 transition ${
                      selectedId === profile.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <button type="button" onClick={() => setSelectedId(profile.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-bold text-slate-950">{getProfileLabel(profile)}</h4>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{profile.email || 'Sin email'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {profile.phone || 'Sin WhatsApp'} - {profile.city || 'Sin localidad'}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {missing.length === 0 ? 'Datos clave completos.' : `Falta: ${missing.join(', ')}.`}
                        </p>
                      </button>
                      {renderActionButtons(profile)}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedProfile ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle</p>
              <h4 className="mt-1 text-lg font-bold text-slate-950">Selecciona un tecnico</h4>
              <p className="mt-2 text-sm text-slate-600">
                Aca vas a ver checklist, datos publicos y ultimo estado de revision antes de aprobar.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de revision</p>
                <h4 className="mt-1 text-xl font-bold text-slate-950">{getProfileLabel(selectedProfile)}</h4>
                <p className="mt-1 text-sm text-slate-600">{selectedProfile.email || 'Sin email'}</p>
              </div>

              <div className="space-y-2">
                {[
                  ['Nombre', toText(selectedProfile.full_name)],
                  ['Negocio', toText(selectedProfile.business_name)],
                  ['WhatsApp', toText(selectedProfile.phone)],
                  ['Localidad', toText(selectedProfile.city)],
                  ['Ubicacion exacta', hasExactMapPoint(selectedProfile) ? 'Confirmada' : 'Pendiente'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                    <span className="text-right text-sm font-semibold text-slate-900">{value || 'Pendiente'}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Estado admin</p>
                <p className="mt-1 text-sm font-semibold text-amber-900">
                  {selectedProfile.admin_review_status || 'Sin revision activa'}
                </p>
                <p className="mt-2 text-sm text-amber-800">
                  {selectedProfile.admin_review_reason || 'Sin observaciones.'}
                </p>
                <p className="mt-2 text-xs text-amber-700">
                  Marcado: {formatDateTime(selectedProfile.admin_review_marked_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-950">Base:</span> {selectedProfile.company_address || '-'}</p>
                <p className="mt-2"><span className="font-semibold text-slate-950">Cobertura:</span> {selectedProfile.coverage_area || '-'}</p>
                <p className="mt-2"><span className="font-semibold text-slate-950">Rubros:</span> {selectedProfile.specialties || '-'}</p>
                <p className="mt-2"><span className="font-semibold text-slate-950">Alta:</span> {formatDateTime(selectedProfile.created_at)}</p>
              </div>

              {renderActionButtons(selectedProfile)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
