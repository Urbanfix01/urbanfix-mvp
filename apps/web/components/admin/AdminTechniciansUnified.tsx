'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabase';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../public/PublicTechniciansMap';

type TechnicianProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  coverage_area: string | null;
  specialties: string | null;
  access_granted: boolean | null;
  profile_published: boolean | null;
  service_lat: number | null;
  service_lng: number | null;
  created_at: string | null;
};

type EditFormData = Partial<TechnicianProfile>;
type ViewMode = 'list' | 'map';

export default function AdminTechniciansUnified() {
  const [allProfiles, setAllProfiles] = useState<TechnicianProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TechnicianProfile | null>(null);
  const [formData, setFormData] = useState<EditFormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [filterCity, setFilterCity] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    loadAllProfiles();
  }, []);

  const loadAllProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      console.log('Profiles loaded:', data?.length || 0);
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
      setSelectedProfile(data as TechnicianProfile);
      setFormData(data as TechnicianProfile);
    } catch (err) {
      console.error('Error:', err);
      setMessage('Error al cargar perfil');
    }
  };

  const handleSave = async () => {
    if (!selectedProfile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update(formData).eq('id', selectedProfile.id);
      if (error) throw error;
      setMessage('✅ Perfil guardado correctamente');
      setSelectedProfile({ ...selectedProfile, ...formData });
      loadAllProfiles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Error al guardar el perfil');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const cities = Array.from(new Set(allProfiles.map((p) => p.city).filter(Boolean))).sort() as string[];

  // Convertir perfiles a puntos de mapa
  const mapPoints: PublicTechnicianMapPoint[] = filteredProfiles
    .filter((p) => p.service_lat && p.service_lng)
    .map((p) => ({
      id: p.id,
      name: p.full_name || p.business_name || 'Técnico',
      profileHref: `/tecnico/${p.id}`,
      whatsappHref: p.phone ? `https://wa.me/54${p.phone.replace(/\D/g, '')}` : '#',
      city: p.city || 'UrbanFix',
      coverageArea: p.coverage_area || '',
      specialties: p.specialties ? p.specialties.split(',').map((s) => s.trim()) : [],
      lat: p.service_lat!,
      lng: p.service_lng!,
      radiusKm: 5,
      precision: 'exact' as const,
      openNow: p.access_granted ? true : false,
      workingHoursLabel: p.access_granted ? 'Disponible' : 'No disponible',
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
    published: allProfiles.filter((p) => p.profile_published).length,
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
        <div className="rounded-lg border border-slate-200 bg-white p-4" style={{ height: '600px' }}>
          <PublicTechniciansMap
            points={mapPoints}
            title="Mapa de Técnicos"
            description={`Mostrando ${filteredProfiles.length} de ${allProfiles.length} técnicos`}
          />
        </div>
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
                      {profile.profile_published && (
                        <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-blue-100 text-blue-800">
                          📢 Publicado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1">{profile.email || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      📍 {profile.city || 'Sin ciudad'} {profile.phone && `| 📱 ${profile.phone}`}
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
              onClick={() => setSelectedProfile(null)}
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
              <label className="block text-xs font-semibold uppercase text-slate-700">Rubros/Especialidades</label>
              <textarea
                value={formData.specialties || ''}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Estado de Acceso</label>
              <select
                value={formData.access_granted ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, access_granted: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="no">❌ Sin acceso</option>
                <option value="si">✅ Con acceso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700">Publicado</label>
              <select
                value={formData.profile_published ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, profile_published: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="no">❌ No publicado</option>
                <option value="si">✅ Publicado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isSaving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
            <button
              onClick={() => setSelectedProfile(null)}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
