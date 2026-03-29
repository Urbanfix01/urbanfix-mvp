'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase/supabase';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../public/PublicTechniciansMap';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';

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
  address: string | null;
  company_address: string | null;
  coverage_area: string | null;
  specialties: string | null;
  access_granted: boolean | null;
  profile_published: boolean | null;
  profile_published_at: string | null;
  service_lat: number | null;
  service_lng: number | null;
  service_radius_km: number | null;
  service_location_precision: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VisibilityChannel = {
  visible: boolean;
  reasons: string[];
};

type VisibilityGeo = {
  exact: { lat: number; lng: number } | null;
  fallback: { label: string; lat: number; lng: number } | null;
  workZoneConfigured: boolean;
  hasExactGeo: boolean;
  hasFallbackGeo: boolean;
};

type VisibilityProfile = {
  id: string;
  label: string;
  email: string | null;
  accessGranted: boolean;
  profilePublished: boolean | null;
  profilePublishedEffective: boolean;
  profilePublishedAt: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  companyAddress: string | null;
  coverageArea: string | null;
  specialties: string | null;
  serviceRadiusKm: number | null;
  publicRating: number | null;
  publicReviewsCount: number;
  completedJobsTotal: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type VisibilityResponse = {
  ok: boolean;
  technicianId: string;
  profileFound: boolean;
  usedFallback?: boolean;
  profile?: VisibilityProfile;
  geo?: VisibilityGeo;
  links?: { publicPath: string };
  visibility?: {
    publicProfilePage: VisibilityChannel;
    vidriera: VisibilityChannel;
    clientMap: VisibilityChannel;
    operativo: VisibilityChannel;
  };
};

type EditFormData = Partial<TechnicianProfile>;
type ViewMode = 'list' | 'map';
type QuickActionType = 'access' | 'publish' | null;

type LegacyBulkResponse = {
  ok: boolean;
  updatedCount: number;
  updatedIds: string[];
  updatedProfiles: Array<{
    id: string;
    email: string | null;
    fullName: string | null;
    businessName: string | null;
    city: string | null;
  }>;
};

const toText = (value: unknown) => String(value || '').trim();

const normalizeEmail = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : '';
};

const hasLegacyValidAccessCandidate = (profile: TechnicianProfile) =>
  profile.access_granted !== true &&
  profile.profile_published === true &&
  Boolean(normalizeEmail(profile.email)) &&
  Boolean(toText(profile.business_name)) &&
  Boolean(toText(profile.phone)) &&
  Boolean(toText(profile.city));

const hasWorkZoneConfigured = (
  profile: Pick<TechnicianProfile, 'city' | 'address' | 'company_address' | 'coverage_area'> | EditFormData
) => Boolean(toText(profile.city) || toText(profile.address) || toText(profile.company_address) || toText(profile.coverage_area));

const isProfilePublishedEffective = (value: boolean | null | undefined) => value !== false;

const hasMapCoordinates = (profile: Pick<TechnicianProfile, 'service_lat' | 'service_lng'>) =>
  Number.isFinite(Number(profile.service_lat)) && Number.isFinite(Number(profile.service_lng));

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('es-AR');
};

const buildEditableSnapshot = (profile: EditFormData | TechnicianProfile | null) => ({
  full_name: toText(profile?.full_name),
  business_name: toText(profile?.business_name),
  email: normalizeEmail(profile?.email),
  phone: toText(profile?.phone),
  city: toText(profile?.city),
  address: toText(profile?.address),
  company_address: toText(profile?.company_address),
  coverage_area: toText(profile?.coverage_area),
  specialties: toText(profile?.specialties),
  access_granted: profile?.access_granted === true,
  profile_published: isProfilePublishedEffective(profile?.profile_published),
});

export default function AdminTechniciansUnified({ accessToken = null }: AdminTechniciansUnifiedProps) {
  const [allProfiles, setAllProfiles] = useState<TechnicianProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TechnicianProfile | null>(null);
  const [formData, setFormData] = useState<EditFormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<QuickActionType>(null);
  const [legacyBulkLoading, setLegacyBulkLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [filterCity, setFilterCity] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [visibilityData, setVisibilityData] = useState<VisibilityResponse | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  const selectedSnapshot = useMemo(() => buildEditableSnapshot(selectedProfile), [selectedProfile]);
  const draftSnapshot = useMemo(() => buildEditableSnapshot(formData), [formData]);
  const isDirty = useMemo(() => {
    if (!selectedProfile) return false;
    return JSON.stringify(selectedSnapshot) !== JSON.stringify(draftSnapshot);
  }, [draftSnapshot, selectedProfile, selectedSnapshot]);
  const formValidationError = useMemo(() => {
    if (!selectedProfile) return '';
    if (!draftSnapshot.full_name && !draftSnapshot.business_name) {
      return 'Completa nombre o negocio antes de guardar.';
    }
    if (toText(formData.email) && !draftSnapshot.email) {
      return 'El email cargado no es válido.';
    }
    if (draftSnapshot.profile_published && !draftSnapshot.access_granted) {
      return 'Para publicar el perfil, primero habilita el acceso.';
    }
    if (draftSnapshot.profile_published && !hasWorkZoneConfigured(formData)) {
      return 'Para publicar el perfil, completa ciudad, dirección o cobertura.';
    }
    return '';
  }, [draftSnapshot, formData, selectedProfile]);
  const legacyValidProfiles = useMemo(() => allProfiles.filter(hasLegacyValidAccessCandidate), [allProfiles]);

  const closeEditor = () => {
    setSelectedProfile(null);
    setFormData({});
    setVisibilityData(null);
    setVisibilityError('');
    setMessage('');
  };

  useEffect(() => {
    loadAllProfiles();
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;

    const refreshedProfile = allProfiles.find((profile) => profile.id === selectedProfile.id);
    if (!refreshedProfile) {
      closeEditor();
      return;
    }

    if (refreshedProfile !== selectedProfile) {
      setSelectedProfile(refreshedProfile);
      if (!isDirty) {
        setFormData(refreshedProfile);
      }
    }
  }, [allProfiles, isDirty, selectedProfile]);

  useEffect(() => {
    if (!selectedProfile?.id) {
      setVisibilityData(null);
      setVisibilityError('');
      return;
    }

    if (!accessToken) {
      setVisibilityData(null);
      setVisibilityError('No hay sesión admin activa para cargar el diagnóstico interno.');
      return;
    }

    loadVisibility(selectedProfile.id);
  }, [accessToken, selectedProfile?.id]);

  const loadAllProfiles = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const profiles = (data || []) as TechnicianProfile[];
      setAllProfiles(profiles);
      applyFilters(profiles, searchQuery, filterStatus, filterCity);
      
      if (profiles.length === 0) {
        setMessage('⚠️ No hay técnicos en la base de datos. Verifica la tabla "profiles" en Supabase.');
      }
    } catch (err) {
      console.error('Error completo:', err);
      setMessage('Error al cargar técnicos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    profiles: TechnicianProfile[],
    search: string,
    status: string,
    city: string
  ) => {
    let filtered = profiles;

    if (status === 'registered') {
      filtered = filtered.filter((p) => p.access_granted);
    } else if (status === 'unregistered') {
      filtered = filtered.filter((p) => !p.access_granted);
    }

    if (city !== 'all') {
      filtered = filtered.filter((p) => (p.city || '').toLowerCase() === city.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.full_name?.toLowerCase() || '').includes(q) ||
          (p.business_name?.toLowerCase() || '').includes(q) ||
          (p.email?.toLowerCase() || '').includes(q) ||
          (p.phone?.toLowerCase() || '').includes(q)
      );
    }

    setFilteredProfiles(filtered);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(allProfiles, query, filterStatus, filterCity);
  };

  const handleStatusFilter = (status: 'all' | 'registered' | 'unregistered') => {
    setFilterStatus(status);
    applyFilters(allProfiles, searchQuery, status, filterCity);
  };

  const handleCityFilter = (city: string) => {
    setFilterCity(city);
    applyFilters(allProfiles, searchQuery, filterStatus, city);
  };

  const loadFullProfile = async (profileId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      if (error) throw error;
      setMessage('');
      setSelectedProfile(data as TechnicianProfile);
      setFormData(data as TechnicianProfile);
    } catch (err) {
      console.error('Error:', err);
      setMessage('Error al cargar perfil');
    }
  };

  const loadVisibility = async (profileId: string) => {
    if (!accessToken) return;

    setVisibilityLoading(true);
    setVisibilityError('');
    try {
      const response = await fetch(`/api/admin/access/technicians/${profileId}/visibility`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as VisibilityResponse | { error?: string } | null;
      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || 'No se pudo cargar el diagnóstico.');
      }

      setVisibilityData(payload as VisibilityResponse);
    } catch (err) {
      console.error('Error cargando diagnóstico del técnico:', err);
      setVisibilityData(null);
      setVisibilityError(err instanceof Error ? err.message : 'No se pudo cargar el diagnóstico.');
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleAccessQuickToggle = async (accessGranted: boolean) => {
    if (!selectedProfile || !accessToken) return;

    setQuickActionLoading('access');
    setMessage('');
    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: selectedProfile.id,
          accessGranted,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo actualizar el acceso.');
      }

      setSelectedProfile((current) => (current ? { ...current, access_granted: accessGranted } : current));
      setFormData((current) => ({ ...current, access_granted: accessGranted }));
      setMessage(accessGranted ? '✅ Técnico habilitado correctamente.' : '✅ Técnico bloqueado correctamente.');
      await loadAllProfiles();
      await loadVisibility(selectedProfile.id);
    } catch (err) {
      console.error('Error actualizando acceso:', err);
      setMessage(`❌ ${err instanceof Error ? err.message : 'No se pudo actualizar el acceso.'}`);
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handlePublishQuickToggle = async (profilePublished: boolean) => {
    if (!selectedProfile) return;

    const effectiveAccess = formData.access_granted ?? selectedProfile.access_granted;
    if (profilePublished && effectiveAccess !== true) {
      setMessage('⚠️ Para publicar el perfil, primero habilita el acceso.');
      return;
    }

    const zoneCandidate = {
      city: formData.city ?? selectedProfile.city,
      address: formData.address ?? selectedProfile.address,
      company_address: formData.company_address ?? selectedProfile.company_address,
      coverage_area: formData.coverage_area ?? selectedProfile.coverage_area,
    };

    if (profilePublished && !hasWorkZoneConfigured(zoneCandidate)) {
      setMessage('⚠️ Para publicar el perfil, completa ciudad, dirección, base operativa o cobertura.');
      return;
    }

    setQuickActionLoading('publish');
    setMessage('');
    try {
      const profilePublishedAt = profilePublished ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('profiles')
        .update({ profile_published: profilePublished, profile_published_at: profilePublishedAt })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      setSelectedProfile((current) =>
        current ? { ...current, profile_published: profilePublished, profile_published_at: profilePublishedAt } : current
      );
      setFormData((current) => ({ ...current, profile_published: profilePublished, profile_published_at: profilePublishedAt }));
      setMessage(profilePublished ? '✅ Perfil publicado correctamente.' : '✅ Perfil despublicado correctamente.');
      await loadAllProfiles();
      await loadVisibility(selectedProfile.id);
    } catch (err) {
      console.error('Error actualizando publicación:', err);
      setMessage(`❌ ${err instanceof Error ? err.message : 'No se pudo actualizar la publicación.'}`);
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleSave = async () => {
    if (!selectedProfile) return;
    if (!isDirty) {
      setMessage('⚠️ No hay cambios pendientes para guardar.');
      return;
    }
    if (formValidationError) {
      setMessage(`⚠️ ${formValidationError}`);
      return;
    }
    setIsSaving(true);
    try {
      const nextPayload: EditFormData = { ...formData };
      if (formData.profile_published !== undefined && formData.profile_published !== selectedProfile.profile_published) {
        nextPayload.profile_published_at = formData.profile_published ? new Date().toISOString() : null;
      }

      const { error } = await supabase.from('profiles').update(nextPayload).eq('id', selectedProfile.id);
      if (error) throw error;
      setMessage('✅ Perfil guardado correctamente');
      setSelectedProfile({ ...selectedProfile, ...nextPayload });
      setFormData((current) => ({ ...current, ...nextPayload }));
      await loadAllProfiles();
      await loadVisibility(selectedProfile.id);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Error al guardar el perfil');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableLegacyProfiles = async () => {
    if (!accessToken || legacyBulkLoading || legacyValidProfiles.length === 0) return;

    setLegacyBulkLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/access/legacy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as (LegacyBulkResponse & { error?: string }) | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron habilitar perfiles legacy válidos.');
      }

      const updatedIds = payload?.updatedIds || [];
      if (updatedIds.length === 0) {
        setMessage('ℹ️ No hay perfiles legacy válidos pendientes de habilitación.');
        return;
      }

      setMessage(`✅ Se habilitaron ${updatedIds.length} perfiles legacy válidos.`);
      await loadAllProfiles();

      if (selectedProfile && updatedIds.includes(selectedProfile.id)) {
        await loadFullProfile(selectedProfile.id);
        await loadVisibility(selectedProfile.id);
      }
    } catch (err) {
      console.error('Error habilitando perfiles legacy:', err);
      setMessage(`❌ ${err instanceof Error ? err.message : 'No se pudieron habilitar perfiles legacy válidos.'}`);
    } finally {
      setLegacyBulkLoading(false);
    }
  };

  const cities = Array.from(new Set(allProfiles.map((p) => p.city).filter(Boolean))).sort() as string[];

  // Convertir perfiles a puntos de mapa
  const mapPoints: PublicTechnicianMapPoint[] = filteredProfiles
    .filter((p) => hasMapCoordinates(p))
    .map((p) => ({
      id: p.id,
      name: p.business_name || p.full_name || 'Técnico',
      profileHref: buildTechnicianPath(p.id, p.business_name || p.full_name || 'Técnico UrbanFix'),
      whatsappHref: p.phone ? `https://wa.me/54${p.phone.replace(/\D/g, '')}` : '#',
      city: p.city || 'UrbanFix',
      coverageArea: p.coverage_area || '',
      specialties: p.specialties ? p.specialties.split(',').map((s) => s.trim()) : [],
      lat: p.service_lat!,
      lng: p.service_lng!,
      radiusKm: Math.max(1, Math.round(Number(p.service_radius_km || 20))),
      precision: p.service_location_precision === 'exact' ? 'exact' : 'approx',
      openNow: false,
      availabilityStatus: 'unspecified',
      workingHoursLabel: 'Disponibilidad a coordinar',
      likesCount: 0,
      rating: null,
      reviewsCount: 0,
      completedJobsTotal: 0,
      avatarUrl: '',
      companyLogoUrl: '',
    }));
  
  const stats = {
    total: allProfiles.length,
    registered: allProfiles.filter((p) => p.access_granted).length,
    unregistered: allProfiles.filter((p) => !p.access_granted).length,
    published: allProfiles.filter((p) => isProfilePublishedEffective(p.profile_published)).length,
    mapped: allProfiles.filter((p) => hasMapCoordinates(p)).length,
  };

  return (
    <div className="space-y-6">
      {/* ESTADÍSTICAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500 font-semibold">Total Técnicos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs uppercase text-green-700 font-semibold">✓ Registrados</p>
          <p className="mt-2 text-3xl font-bold text-green-900">{stats.registered}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs uppercase text-red-700 font-semibold">✗ No Registrados</p>
          <p className="mt-2 text-3xl font-bold text-red-900">{stats.unregistered}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase text-blue-700 font-semibold">📢 Publicados</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">{stats.published}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 md:col-span-4 xl:col-span-1">
          <p className="text-xs uppercase text-amber-700 font-semibold">📍 Con ubicación</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{stats.mapped}</p>
        </div>
      </div>

      {/* CONTROLES DE FILTRO */}
      <div className="space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos ({allProfiles.length})
          </button>
          <button
            onClick={() => handleStatusFilter('registered')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filterStatus === 'registered'
                ? 'bg-green-600 text-white'
                : 'border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            ✓ Registrados ({stats.registered})
          </button>
          <button
            onClick={() => handleStatusFilter('unregistered')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filterStatus === 'unregistered'
                ? 'bg-red-600 text-white'
                : 'border border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            ✗ No Registrados ({stats.unregistered})
          </button>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Backfill legacy</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Habilitar perfiles legacy válidos</h3>
              <p className="mt-1 text-sm text-slate-600">
                Toma solo perfiles publicados, sin acceso, con email, negocio, teléfono y ciudad completos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnableLegacyProfiles}
              disabled={!accessToken || legacyBulkLoading || legacyValidProfiles.length === 0}
              className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {legacyBulkLoading ? 'Procesando...' : `Habilitar ${legacyValidProfiles.length} perfil(es)`}
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]">
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Candidatos</p>
              <p className="mt-2 text-3xl font-bold text-violet-900">{legacyValidProfiles.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {legacyValidProfiles.length === 0 ? (
                <p>No hay perfiles legacy válidos pendientes.</p>
              ) : (
                <div className="space-y-2">
                  {legacyValidProfiles.slice(0, 4).map((profile) => (
                    <div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{profile.business_name || profile.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500">{profile.email || 'Sin email'} · {profile.city || 'Sin ciudad'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadFullProfile(profile.id)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Abrir
                      </button>
                    </div>
                  ))}
                  {legacyValidProfiles.length > 4 && (
                    <p className="text-xs text-slate-500">Y {legacyValidProfiles.length - 4} perfil(es) más.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-3 flex-wrap flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, email, teléfono..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
            />
            <select
              value={filterCity}
              onChange={(e) => handleCityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
            >
              <option value="all">📍 Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  📍 {city}
                </option>
              ))}
            </select>
          </div>

          {/* SELECTOR DE VISTA */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition ${
                viewMode === 'map'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🗺️ Mapa
            </button>
          </div>
        </div>
      </div>

      {/* VISTA DE LISTA O MAPA */}
      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">⏳ Cargando técnicos...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">No se encontraron técnicos</p>
          <p className="text-sm text-slate-500 mt-2">Intenta con otros criterios de búsqueda</p>
        </div>
      ) : viewMode === 'map' ? (
        mapPoints.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="text-lg font-semibold text-amber-900">No hay técnicos con ubicación mapeable en este filtro</p>
            <p className="mt-2 text-sm text-amber-800">
              Revisa si cargaron coordenadas válidas o cambia los filtros para ver otros perfiles.
            </p>
          </div>
        ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4" style={{ height: '600px' }}>
          <PublicTechniciansMap
            points={mapPoints}
            title="Mapa de Técnicos"
            description={`Mostrando ${filteredProfiles.length} de ${allProfiles.length} técnicos`}
          />
        </div>
        )
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase font-semibold text-slate-500 mb-3">
            📋 Mostrando {filteredProfiles.length} de {allProfiles.length} técnicos
          </p>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => loadFullProfile(profile.id)}
                className={`rounded-lg border p-4 cursor-pointer transition ${
                  selectedProfile?.id === profile.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">
                        {profile.business_name || profile.full_name || '—'}
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          profile.access_granted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {profile.access_granted ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                      {isProfilePublishedEffective(profile.profile_published) && (
                        <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-blue-100 text-blue-800">
                          📢 Publicado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1">{profile.email || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      📍 {profile.city || 'Sin ciudad'} {profile.phone && `| 📱 ${profile.phone}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {hasMapCoordinates(profile)
                        ? `🗺️ ${profile.service_location_precision === 'exact' ? 'Ubicación verificada' : 'Zona estimada'}`
                        : '🗺️ Sin ubicación para mapa'}
                    </p>
                    {profile.specialties && (
                      <p className="text-xs text-slate-600 mt-1">🔧 {profile.specialties}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      {new Date(profile.created_at || '').toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULARIO DE EDICIÓN */}
      {selectedProfile && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              ✏️ Editando: {formData.business_name || formData.full_name}
            </h3>
            <button
              onClick={closeEditor}
              className="text-slate-500 hover:text-slate-900 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          {message && (
            <div
              className={`rounded px-4 py-3 text-sm font-medium ${
                message.includes('✅')
                  ? 'border border-green-300 bg-green-50 text-green-800'
                  : 'border border-red-300 bg-red-50 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Acceso técnico</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {formData.access_granted ? 'Habilitado' : 'Bloqueado'}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Controla si el técnico puede operar y aparecer en los flujos internos que requieren acceso.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        formData.access_granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {formData.access_granted ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleAccessQuickToggle(true)}
                      disabled={quickActionLoading !== null || !accessToken || formData.access_granted === true}
                      className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quickActionLoading === 'access' && formData.access_granted !== true ? 'Procesando...' : 'Habilitar técnico'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccessQuickToggle(false)}
                      disabled={quickActionLoading !== null || !accessToken || formData.access_granted !== true}
                      className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quickActionLoading === 'access' && formData.access_granted === true ? 'Procesando...' : 'Bloquear técnico'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Publicación</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {isProfilePublishedEffective(formData.profile_published) ? 'Visible al público' : 'Oculto'}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Controla la presencia en perfil público, vidriera y mapa cliente.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isProfilePublishedEffective(formData.profile_published)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isProfilePublishedEffective(formData.profile_published) ? 'PUBLICADO' : 'OCULTO'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handlePublishQuickToggle(true)}
                      disabled={quickActionLoading !== null || isProfilePublishedEffective(formData.profile_published)}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quickActionLoading === 'publish' && !isProfilePublishedEffective(formData.profile_published)
                        ? 'Procesando...'
                        : 'Publicar perfil'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublishQuickToggle(false)}
                      disabled={quickActionLoading !== null || !isProfilePublishedEffective(formData.profile_published)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quickActionLoading === 'publish' && isProfilePublishedEffective(formData.profile_published)
                        ? 'Procesando...'
                        : 'Ocultar perfil'}
                    </button>
                  </div>
                </div>
              </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Nombre</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Negocio</label>
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Teléfono</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Ciudad</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Cobertura</label>
              <input
                type="text"
                value={formData.coverage_area || ''}
                onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Base operativa</label>
              <input
                type="text"
                value={formData.company_address || ''}
                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Dirección exacta donde opera el técnico"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Dirección visible</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Dirección pública o referencia comercial"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700">Rubros/Especialidades</label>
              <textarea
                value={formData.specialties || ''}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty || Boolean(formValidationError)}
              className="flex-1 rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isSaving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
            <button
              onClick={closeEditor}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              ✕ Cerrar
            </button>
          </div>

          {formValidationError && <p className="text-xs font-medium text-amber-700">{formValidationError}</p>}
          {!formValidationError && !isDirty && (
            <p className="text-xs font-medium text-slate-500">No hay cambios pendientes en este perfil.</p>
          )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnóstico interno</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900">Visibilidad y geo</h4>
                </div>
                <button
                  type="button"
                  onClick={() => selectedProfile?.id && loadVisibility(selectedProfile.id)}
                  disabled={!selectedProfile?.id || !accessToken || visibilityLoading}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {visibilityLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>

              {!accessToken && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No hay sesión admin activa para consultar este diagnóstico.
                </div>
              )}

              {accessToken && visibilityError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {visibilityError}
                </div>
              )}

              {accessToken && !visibilityError && visibilityLoading && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Cargando estado interno del perfil...
                </div>
              )}

              {accessToken && !visibilityError && !visibilityLoading && visibilityData?.profileFound && visibilityData.profile && visibilityData.geo && visibilityData.visibility && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Access granted</p>
                      <p className={`mt-2 text-sm font-bold ${visibilityData.profile.accessGranted ? 'text-green-700' : 'text-red-700'}`}>
                        {visibilityData.profile.accessGranted ? 'true' : 'false'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Profile published</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {String(visibilityData.profile.profilePublished)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Efectivo: {visibilityData.profile.profilePublishedEffective ? 'visible' : 'oculto'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Geo exacta</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {visibilityData.geo.exact
                          ? `${visibilityData.geo.exact.lat.toFixed(6)}, ${visibilityData.geo.exact.lng.toFixed(6)}`
                          : 'Sin coordenadas exactas'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Geo fallback</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {visibilityData.geo.fallback
                          ? `${visibilityData.geo.fallback.label} (${visibilityData.geo.fallback.lat.toFixed(4)}, ${visibilityData.geo.fallback.lng.toFixed(4)})`
                          : 'Sin fallback resoluble'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="grid gap-2">
                      <p><span className="font-semibold text-slate-900">ID:</span> {visibilityData.technicianId}</p>
                      <p><span className="font-semibold text-slate-900">Email:</span> {visibilityData.profile.email || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Ciudad:</span> {visibilityData.profile.city || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Base operativa:</span> {visibilityData.profile.companyAddress || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Cobertura:</span> {visibilityData.profile.coverageArea || '—'}</p>
                      <p><span className="font-semibold text-slate-900">Publicado desde:</span> {formatDateTime(visibilityData.profile.profilePublishedAt)}</p>
                      <p><span className="font-semibold text-slate-900">Actualizado:</span> {formatDateTime(visibilityData.profile.updatedAt)}</p>
                      {visibilityData.links?.publicPath && (
                        <a
                          href={visibilityData.links.publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-700 hover:text-blue-800"
                        >
                          Abrir perfil público
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'Perfil público', channel: visibilityData.visibility.publicProfilePage },
                      { label: 'Vidriera', channel: visibilityData.visibility.vidriera },
                      { label: 'Mapa cliente', channel: visibilityData.visibility.clientMap },
                      { label: 'Operativo', channel: visibilityData.visibility.operativo },
                    ].map(({ label, channel }) => {
                      return (
                        <div
                          key={label}
                          className={`rounded-xl border p-3 ${
                            channel.visible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{label}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                channel.visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {channel.visible ? 'Visible' : 'Bloqueado'}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-700">
                            {channel.reasons.length === 0 ? (
                              <p>Sin bloqueos detectados.</p>
                            ) : (
                              channel.reasons.map((reason) => <p key={reason}>• {reason}</p>)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {accessToken && !visibilityError && !visibilityLoading && visibilityData && !visibilityData.profileFound && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No existe una fila en profiles para este técnico.
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
