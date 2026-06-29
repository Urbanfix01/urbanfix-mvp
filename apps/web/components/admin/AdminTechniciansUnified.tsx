'use client';

import React, { useEffect, useMemo, useState } from 'react';

type TechnicalAudience = 'tecnico' | 'empresa';

type AdminTechniciansUnifiedProps = {
  accessToken?: string | null;
  audience?: TechnicalAudience;
  onQueueStatsChange?: (stats: TechnicianQueueStats) => void;
};

type TechnicianProfile = {
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

export type TechnicianQueueStats = {
  total: number;
  attention: number;
  ready: number;
  review: number;
  approved: number;
  hidden: number;
  incomplete: number;
};

type FilterStatus = 'all' | 'attention' | 'ready' | 'review' | 'approved' | 'hidden' | 'incomplete';
type ReviewAction = 'approve' | 'correction' | 'reject' | 'publish';

const TECHNICAL_AUDIENCE_COPY: Record<
  TechnicalAudience,
  {
    singular: string;
    plural: string;
    title: string;
    subtitle: string;
    notificationsTitle: string;
    empty: string;
    fallbackLabel: string;
  }
> = {
  tecnico: {
    singular: 'tecnico',
    plural: 'tecnicos',
    title: 'Aprobacion de tecnicos',
    subtitle: 'Revisa contacto, zona de trabajo y ubicacion exacta antes de publicar un tecnico en UrbanFix.',
    notificationsTitle: 'Notificaciones de tecnicos',
    empty: 'No hay tecnicos para este filtro.',
    fallbackLabel: 'Tecnico sin nombre',
  },
  empresa: {
    singular: 'empresa',
    plural: 'empresas',
    title: 'Aprobacion de empresas',
    subtitle: 'Revisa responsable, datos comerciales, zona de trabajo y ubicacion antes de publicar una empresa.',
    notificationsTitle: 'Notificaciones de empresas',
    empty: 'No hay empresas para este filtro.',
    fallbackLabel: 'Empresa sin nombre',
  },
};

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

const getLocationLabel = (profile: TechnicianProfile) =>
  [profile.service_city || profile.city, profile.service_district, profile.service_province, profile.country]
    .map(toText)
    .filter(Boolean)
    .join(', ');

const getAddressLabel = (profile: TechnicianProfile) => toText(profile.company_address) || toText(profile.address);

const getWhatsappHref = (profile: TechnicianProfile) => {
  const digits = toText(profile.phone).replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : '';
};

const getMailHref = (profile: TechnicianProfile) => {
  const email = normalizeEmail(profile.email);
  return email ? `mailto:${email}` : '';
};

const hasContactChannel = (profile: TechnicianProfile) => Boolean(normalizeEmail(profile.email) || toText(profile.phone));

const getApprovalMissingLabels = (profile: TechnicianProfile) => {
  const missing: string[] = [];
  if (!toText(profile.full_name)) missing.push('nombre');
  if (!toText(profile.business_name)) missing.push('negocio');
  if (!hasContactChannel(profile)) missing.push('mail o WhatsApp');
  if (!getLocationLabel(profile)) missing.push('localidad');
  if (!hasExactMapPoint(profile)) missing.push('ubicacion exacta');
  return missing;
};

const isPendingReview = (profile: TechnicianProfile) =>
  toText(profile.admin_review_status).toLowerCase() === 'pending';

const isApprovalReady = (profile: TechnicianProfile) =>
  profile.access_granted !== true && getApprovalMissingLabels(profile).length === 0;

const isApprovedHidden = (profile: TechnicianProfile) =>
  profile.access_granted === true && profile.profile_published === false;

const isApprovedVisible = (profile: TechnicianProfile) =>
  profile.access_granted === true && profile.profile_published !== false;

const isIncompleteProfile = (profile: TechnicianProfile) =>
  profile.access_granted !== true && !isApprovalReady(profile) && !isPendingReview(profile);

const needsAdminAttention = (profile: TechnicianProfile) =>
  isApprovalReady(profile) ||
  (profile.access_granted !== true && isPendingReview(profile)) ||
  isApprovedHidden(profile) ||
  isIncompleteProfile(profile);

const getProfileLabel = (profile: TechnicianProfile, fallbackLabel = 'Tecnico sin nombre') =>
  toText(profile.business_name) || toText(profile.full_name) || toText(profile.email) || fallbackLabel;

const getReviewStatusLabel = (value: string | null | undefined) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'pending') return 'Correccion solicitada';
  if (normalized === 'resolved') return 'Resuelto';
  if (normalized === 'dismissed') return 'Rechazado';
  return 'Sin revision activa';
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-AR');
};

const statusBadge = (profile: TechnicianProfile) => {
  if (profile.access_granted === true) {
    if (profile.profile_published === false) {
      return {
        label: 'Aprobado oculto',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    return {
      label: 'Aprobado',
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

export default function AdminTechniciansUnified({
  accessToken = null,
  audience = 'tecnico',
  onQueueStatsChange,
}: AdminTechniciansUnifiedProps) {
  const copy = TECHNICAL_AUDIENCE_COPY[audience];
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('attention');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<TechnicianProfile | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) || null,
    [profiles, selectedId]
  );

  const stats = useMemo<TechnicianQueueStats>(() => {
    const ready = profiles.filter(isApprovalReady).length;
    const review = profiles.filter((profile) => profile.access_granted !== true && isPendingReview(profile)).length;
    const approved = profiles.filter(isApprovedVisible).length;
    const hidden = profiles.filter(isApprovedHidden).length;
    const incomplete = profiles.filter(isIncompleteProfile).length;

    return {
      total: profiles.length,
      attention: ready + review + hidden + incomplete,
      ready,
      review,
      approved,
      hidden,
      incomplete,
    };
  }, [profiles]);

  useEffect(() => {
    onQueueStatsChange?.(stats);
  }, [onQueueStatsChange, stats]);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (filterStatus === 'attention') return needsAdminAttention(profile);
        if (filterStatus === 'ready') return isApprovalReady(profile);
        if (filterStatus === 'review') return profile.access_granted !== true && isPendingReview(profile);
        if (filterStatus === 'approved') return isApprovedVisible(profile);
        if (filterStatus === 'hidden') return isApprovedHidden(profile);
        if (filterStatus === 'incomplete') return isIncompleteProfile(profile);
        return true;
      })
      .filter((profile) => {
        if (!query) return true;
        return [
          profile.full_name,
          profile.business_name,
          profile.email,
          profile.phone,
          profile.city,
          profile.service_city,
          profile.service_province,
          profile.service_district,
        ]
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
      const response = await fetch(`/api/admin/access/technicians?audience=${encodeURIComponent(audience)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { profiles?: TechnicianProfile[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || `No se pudieron cargar ${copy.plural}.`);
      }

      const nextProfiles = payload?.profiles || [];
      setProfiles(nextProfiles);
      if (selectedId && !nextProfiles.some((profile) => profile.id === selectedId)) {
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
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const runReviewAction = async (profile: TechnicianProfile, action: ReviewAction) => {
    if (!accessToken || actionLoadingId) return;

    const missing = getApprovalMissingLabels(profile);
    if ((action === 'approve' || action === 'publish') && missing.length > 0) {
      setMessage(`Falta completar antes de aprobar: ${missing.join(', ')}.`);
      return;
    }

    if (action === 'reject') {
      const label =
        profile.access_granted === true
          ? copy.singular === 'empresa'
            ? 'retirar el acceso de esta empresa'
            : 'retirar el acceso de este tecnico'
          : 'rechazar este perfil';
      if (!window.confirm(`Confirmar: vas a ${label}.`)) return;
    }

    const keepDetailOpen = selectedId === profile.id;
    const reviewReason =
      action === 'correction'
        ? `Completar antes de aprobar: ${missing.join(', ') || 'revision manual pendiente'}.`
        : action === 'reject'
          ? profile.access_granted === true
            ? 'Acceso retirado por revision admin.'
            : 'Perfil descartado por revision admin.'
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
          accessGranted: action === 'approve' || action === 'publish',
          profilePublished: action === 'approve' || action === 'publish',
          reviewStatus: action === 'approve' || action === 'publish' ? 'resolved' : action === 'correction' ? 'pending' : 'dismissed',
          reviewReason,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; supportMessageCreated?: boolean; supportMessageError?: string | null }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo actualizar el perfil.');
      }

      setMessage(
        action === 'approve'
          ? copy.singular === 'empresa'
            ? 'Empresa aprobada y publicada.'
            : 'Tecnico aprobado y publicado.'
          : action === 'publish'
            ? 'Perfil publicado nuevamente.'
          : action === 'correction'
            ? payload?.supportMessageCreated
              ? 'Perfil marcado para correccion y solicitud enviada al chat interno.'
              : `Perfil marcado para correccion. ${payload?.supportMessageError || 'No se pudo crear el mensaje de chat automaticamente.'}`
            : profile.access_granted === true
              ? 'Acceso retirado.'
              : 'Perfil rechazado.'
      );
      await loadProfiles();
      setSelectedId(keepDetailOpen ? profile.id : '');
    } catch (error) {
      console.error('Error actualizando aprobacion:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setActionLoadingId('');
    }
  };

  const openDeleteDialog = (profile: TechnicianProfile) => {
    if (actionLoadingId) return;
    setMessage('');
    setDeleteCandidate(profile);
    setDeleteConfirmStep(1);
    setDeleteConfirmText('');
  };

  const closeDeleteDialog = () => {
    if (actionLoadingId.endsWith(':delete')) return;
    setDeleteCandidate(null);
    setDeleteConfirmStep(1);
    setDeleteConfirmText('');
  };

  const runDeleteProfile = async () => {
    if (!accessToken || !deleteCandidate || actionLoadingId) return;
    const typedConfirmation = deleteConfirmText.trim().toUpperCase();
    if (typedConfirmation !== 'ELIMINAR') {
      setMessage('Para eliminar definitivamente, escribi ELIMINAR.');
      return;
    }

    const deletedLabel = getProfileLabel(deleteCandidate, copy.fallbackLabel);
    setActionLoadingId(`${deleteCandidate.id}:delete`);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/access/technicians/${encodeURIComponent(deleteCandidate.id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: deleteCandidate.id,
          confirmation: 'ELIMINAR',
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar el perfil.');
      }

      if (selectedId === deleteCandidate.id) {
        setSelectedId('');
      }
      setDeleteCandidate(null);
      setDeleteConfirmStep(1);
      setDeleteConfirmText('');
      await loadProfiles();
      setMessage(`Perfil eliminado definitivamente: ${deletedLabel}.`);
    } catch (error) {
      console.error(`Error eliminando perfil ${copy.singular}:`, error);
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar el perfil.');
    } finally {
      setActionLoadingId('');
    }
  };

  const renderActionButtons = (profile: TechnicianProfile) => {
    const loadingApprove = actionLoadingId === `${profile.id}:approve`;
    const loadingCorrection = actionLoadingId === `${profile.id}:correction`;
    const loadingReject = actionLoadingId === `${profile.id}:reject`;
    const loadingPublish = actionLoadingId === `${profile.id}:publish`;
    const loadingDelete = actionLoadingId === `${profile.id}:delete`;
    const missing = getApprovalMissingLabels(profile);
    const canApprove = profile.access_granted !== true && missing.length === 0;
    const isApproved = profile.access_granted === true;
    const hiddenApproved = isApprovedHidden(profile);
    const canPublish = hiddenApproved && missing.length === 0;

    return (
      <div className="flex flex-wrap gap-2">
        {hiddenApproved && (
          <button
            type="button"
            onClick={() => runReviewAction(profile, 'publish')}
            disabled={!canPublish || Boolean(actionLoadingId)}
            className="rounded-full bg-[#157a55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#106043] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loadingPublish ? 'Publicando...' : 'Publicar perfil'}
          </button>
        )}
        <button
          type="button"
          onClick={() => runReviewAction(profile, 'approve')}
          disabled={!canApprove || Boolean(actionLoadingId)}
          className="rounded-full bg-[#157a55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#106043] disabled:cursor-not-allowed disabled:bg-slate-300"
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
          {loadingReject ? 'Actualizando...' : isApproved ? 'Retirar acceso' : 'Rechazar'}
        </button>
        <button
          type="button"
          onClick={() => openDeleteDialog(profile)}
          disabled={Boolean(actionLoadingId)}
          className="rounded-full border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingDelete ? 'Eliminando...' : 'Eliminar perfil'}
        </button>
      </div>
    );
  };

  const selectedMissing = selectedProfile ? getApprovalMissingLabels(selectedProfile) : [];
  const selectedLocation = selectedProfile ? getLocationLabel(selectedProfile) : '';
  const selectedAddress = selectedProfile ? getAddressLabel(selectedProfile) : '';
  const selectedWhatsappHref = selectedProfile ? getWhatsappHref(selectedProfile) : '';
  const selectedMailHref = selectedProfile ? getMailHref(selectedProfile) : '';
  const selectedPublicHref = selectedProfile?.access_granted === true ? `/tecnico/${selectedProfile.id}` : '';
  const attentionBreakdown: Array<{
    key: FilterStatus;
    label: string;
    value: number;
    helper: string;
    className: string;
  }> = [
    {
      key: 'ready',
      label: 'Listos',
      value: stats.ready,
      helper: 'Se pueden aprobar ahora.',
      className: 'border-blue-200 bg-blue-50 text-blue-800',
    },
    {
      key: 'review',
      label: 'Correccion',
      value: stats.review,
      helper: `Ya se pidio ajuste ${copy.singular === 'empresa' ? 'a la empresa' : 'al tecnico'}.`,
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    {
      key: 'hidden',
      label: 'Ocultos',
      value: stats.hidden,
      helper: 'Aprobados, pero no publicados.',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
    },
    {
      key: 'incomplete',
      label: 'Incompletos',
      value: stats.incomplete,
      helper: 'Faltan datos para decidir.',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6688]">Revision operativa</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-950">{copy.title}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{copy.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['1. Revisar datos', '2. Confirmar ubicacion', '3. Aprobar y publicar'].map((step) => (
                <span key={step} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {step}
                </span>
              ))}
            </div>
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
      </div>

      <div className="rounded-[24px] border border-amber-200 bg-[#fffaf0] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              {copy.notificationsTitle}
            </p>
            <h4 className="mt-1 text-lg font-bold text-slate-950">
              {stats.attention} perfil(es) requieren gestion
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              El numero del menu se compone de listos, correcciones, ocultos e incompletos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilterStatus('attention')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filterStatus === 'attention'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Ver alertas
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {attentionBreakdown.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilterStatus(item.key)}
              className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${item.className} ${
                filterStatus === item.key ? 'ring-2 ring-slate-900/10' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{item.label}</p>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-black">{item.value}</span>
              </div>
              <p className="mt-1 text-xs leading-5 opacity-80">{item.helper}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {[
          { key: 'attention', label: 'Atencion', value: stats.attention, className: 'border-amber-300 bg-[#fffaf0] text-amber-900' },
          { key: 'ready', label: 'Listos', value: stats.ready, className: 'border-[#b8d8ff] bg-[#eef6ff] text-[#155391]' },
          { key: 'review', label: 'Correccion', value: stats.review, className: 'border-amber-200 bg-amber-50 text-amber-800' },
          { key: 'approved', label: 'Aprobados', value: stats.approved, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
          { key: 'hidden', label: 'Ocultos', value: stats.hidden, className: 'border-orange-200 bg-orange-50 text-orange-800' },
          { key: 'incomplete', label: 'Incompletos', value: stats.incomplete, className: 'border-slate-200 bg-slate-50 text-slate-700' },
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

      <div>
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nombre, negocio, email, telefono o zona"
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
            {isLoading && <p className="py-8 text-center text-sm text-slate-500">Cargando {copy.plural}...</p>}
            {!isLoading && filteredProfiles.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">{copy.empty}</p>
            )}
            {!isLoading &&
              filteredProfiles.map((profile) => {
                const badge = statusBadge(profile);
                const missing = getApprovalMissingLabels(profile);
                const location = getLocationLabel(profile);
                const address = getAddressLabel(profile);
                return (
                  <article
                    key={profile.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-bold text-slate-950">
                            {getProfileLabel(profile, copy.fallbackLabel)}
                          </h4>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{profile.email || 'Sin email'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {profile.phone || 'Sin WhatsApp'} - {location || 'Sin zona'}
                        </p>
                        {address && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            Base: {address}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">
                          Registro: {formatDateTime(profile.created_at)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {missing.length === 0 ? 'Datos clave completos.' : `Falta: ${missing.join(', ')}.`}
                        </p>
                        {isApprovedHidden(profile) && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Oculto: aprobado, pero no publicado en la vidriera ni en el perfil publico.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(profile.id)}
                          className="rounded-full border border-[#d8c7e3] bg-[#f7f0fb] px-3 py-2 text-xs font-semibold text-[#4a1b63] transition hover:bg-[#f0e1f8]"
                        >
                          Revisar perfil
                        </button>
                        {renderActionButtons(profile)}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-technician-review-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalle de revision</p>
                <h4 id="admin-technician-review-title" className="mt-1 text-xl font-bold text-slate-950">
                  {getProfileLabel(selectedProfile, copy.fallbackLabel)}
                </h4>
                <p className="mt-1 text-sm text-slate-600">{selectedProfile.email || 'Sin email'}</p>
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
              {selectedWhatsappHref ? (
                <a
                  href={selectedWhatsappHref}
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
              {selectedMailHref ? (
                <a
                  href={selectedMailHref}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Email
                </a>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                  Sin email
                </span>
              )}
              {selectedPublicHref ? (
                <a
                  href={selectedPublicHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#d8c7e3] bg-[#f7f0fb] px-3 py-1.5 text-xs font-semibold text-[#4a1b63] transition hover:bg-[#f0e1f8]"
                >
                  Ver publico
                </a>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                  Publico pendiente
                </span>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist para aprobar</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  selectedMissing.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedMissing.length === 0 ? 'Completo' : `${selectedMissing.length} faltante(s)`}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ['Nombre', toText(selectedProfile.full_name)],
                  ['Negocio', toText(selectedProfile.business_name)],
                  ['Contacto', normalizeEmail(selectedProfile.email) || toText(selectedProfile.phone)],
                  ['Zona', selectedLocation],
                  ['Ubicacion exacta', hasExactMapPoint(selectedProfile) ? 'Confirmada' : 'Pendiente'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                    <span className={`text-right text-sm font-semibold ${value ? 'text-slate-900' : 'text-amber-700'}`}>
                      {value || 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Estado admin</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">
                {getReviewStatusLabel(selectedProfile.admin_review_status)}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                {selectedProfile.admin_review_reason || 'Sin observaciones.'}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Marcado: {formatDateTime(selectedProfile.admin_review_marked_at)}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-950">Base:</span> {selectedAddress || '-'}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Zona:</span> {selectedLocation || '-'}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Cobertura:</span> {selectedProfile.coverage_area || '-'}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Rubros:</span> {selectedProfile.specialties || '-'}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Horario:</span> {selectedProfile.working_hours || '-'}</p>
              <p className="mt-2"><span className="font-semibold text-slate-950">Alta:</span> {formatDateTime(selectedProfile.created_at)}</p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {renderActionButtons(selectedProfile)}
            </div>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-technician-delete-title"
            className="w-full max-w-lg rounded-[28px] border border-rose-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Eliminacion definitiva
                </p>
                <h4 id="admin-technician-delete-title" className="mt-1 text-xl font-bold text-slate-950">
                  {getProfileLabel(deleteCandidate, copy.fallbackLabel)}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {deleteCandidate.email || deleteCandidate.phone || 'Sin contacto visible'}
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
                  La cuenta deja de aparecer en administracion, en la vidriera publica y no podra ingresar con este usuario.
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
                <label className="text-sm font-semibold text-slate-900" htmlFor="delete-technician-confirmation">
                  Escribi ELIMINAR para confirmar
                </label>
                <input
                  id="delete-technician-confirmation"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="ELIMINAR"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400"
                  autoFocus
                />
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmStep(1);
                      setDeleteConfirmText('');
                    }}
                    disabled={actionLoadingId.endsWith(':delete')}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={runDeleteProfile}
                    disabled={deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR' || actionLoadingId.endsWith(':delete')}
                    className="min-w-[190px] rounded-full border border-[#9f1239] bg-[#be123c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9f1239] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                  >
                    {actionLoadingId.endsWith(':delete') ? 'Eliminando...' : 'Eliminar definitivamente'}
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
