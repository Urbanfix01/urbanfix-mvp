'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabase';

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

export default function AdminProfileEditPanelFixed() {
  const [allProfiles, setAllProfiles] = useState<TechnicianProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TechnicianProfile | null>(null);
  const [formData, setFormData] = useState<EditFormData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Cargar todos los técnicos al montar el componente
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

      if (error) throw error;
      setAllProfiles((data || []) as TechnicianProfile[]);
      applyFilters((data || []) as TechnicianProfile[], searchQuery, filterStatus);
    } catch (err) {
      console.error('Error:', err);
      setMessage('Error al cargar técnicos');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (profiles: TechnicianProfile[], search: string, status: string) => {
    let filtered = profiles;

    if (status === 'registered') {
      filtered = filtered.filter((p) => p.access_granted);
    } else if (status === 'unregistered') {
      filtered = filtered.filter((p) => !p.access_granted);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.full_name?.toLowerCase() || '').includes(q) ||
          (p.business_name?.toLowerCase() || '').includes(q) ||
          (p.email?.toLowerCase() || '').includes(q) ||
          (p.phone?.toLowerCase() || '').includes(q) ||
          (p.city?.toLowerCase() || '').includes(q)
      );
    }

    setFilteredProfiles(filtered);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(allProfiles, query, filterStatus);
  };

  const handleStatusFilter = (status: 'all' | 'registered' | 'unregistered') => {
    setFilterStatus(status);
    applyFilters(allProfiles, searchQuery, status);
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
      setMessage('✅ Guardado correctamente');
      setSelectedProfile({ ...selectedProfile, ...formData });
      loadAllProfiles();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    total: allProfiles.length,
    registered: allProfiles.filter((p) => p.access_granted).length,
    unregistered: allProfiles.filter((p) => !p.access_granted).length,
    withLocation: allProfiles.filter((p) => p.service_lat && p.service_lng).length,
  };

  return (
    <div className="space-y-6">
      {/* ESTADÍSTICAS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500 font-semibold">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs uppercase text-green-700 font-semibold">Registrados</p>
          <p className="mt-2 text-2xl font-bold text-green-900">{stats.registered}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs uppercase text-red-700 font-semibold">No registrados</p>
          <p className="mt-2 text-2xl font-bold text-red-900">{stats.unregistered}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase text-blue-700 font-semibold">Con ubicación</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{stats.withLocation}</p>
        </div>
      </div>

      {/* CONTROLES DE FILTRO */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
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
            ✗ No registrados ({stats.unregistered})
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, email, ciudad, teléfono..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* VISTA DE LISTA */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-600">
          <p className="text-lg">Cargando técnicos...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <p className="text-lg">No se encontraron técnicos</p>
          <p className="text-sm mt-2">Intenta con otros criterios de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => {
                loadFullProfile(profile.id);
              }}
              className={`rounded-lg border p-3 cursor-pointer transition ${
                selectedProfile?.id === profile.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{profile.business_name || profile.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-600 truncate">{profile.email || 'Sin email'}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-slate-500">{profile.city || 'Sin ciudad'}</p>
                    {profile.phone && <p className="text-xs text-slate-500">📱 {profile.phone}</p>}
                    {profile.service_lat && profile.service_lng && (
                      <p className="text-xs text-blue-600">📍 Ubicado</p>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex flex-col gap-1 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      profile.access_granted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {profile.access_granted ? '✓ Registrado' : '✗ No registrado'}
                  </span>
                  {profile.profile_published && (
                    <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-blue-100 text-blue-800">
                      📢 Publicado
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORMULARIO DE EDICIÓN */}
      {selectedProfile && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 text-lg">
              {formData.business_name || formData.full_name || 'Perfil'}
            </h4>
            <button
              onClick={() => setSelectedProfile(null)}
              className="text-slate-500 hover:text-slate-900 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          {message && (
            <div
              className={`rounded px-4 py-2 text-sm font-medium ${
                message.includes('✅')
                  ? 'border border-green-300 bg-green-50 text-green-800'
                  : 'border border-red-300 bg-red-50 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Nombre</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Negocio</label>
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Teléfono</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Ciudad</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Cobertura</label>
              <input
                type="text"
                value={formData.coverage_area || ''}
                onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Rubros/Especialidades</label>
              <textarea
                value={formData.specialties || ''}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                rows={2}
                placeholder="Ej: Plomería, Electricidad, Reparación de aires..."
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Perfil Publicado</label>
              <select
                value={formData.profile_published ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, profile_published: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Acceso al Sistema</label>
              <select
                value={formData.access_granted ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, access_granted: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            {selectedProfile.service_lat && selectedProfile.service_lng && (
              <>
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700">Latitud</label>
                  <p className="text-slate-600 mt-1">{selectedProfile.service_lat}</p>
                </div>
                <div className="text-xs">
                  <label className="block font-semibold text-slate-700">Longitud</label>
                  <p className="text-slate-600 mt-1">{selectedProfile.service_lng}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isSaving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
            <button
              onClick={() => setSelectedProfile(null)}
              className="px-4 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
