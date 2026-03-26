'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/supabase';

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
  working_hours: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  profile_published: boolean | null;
  access_granted: boolean | null;
};

type EditFormData = Partial<TechnicianProfile>;

export default function AdminProfileEditPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TechnicianProfile | null>(null);
  const [formData, setFormData] = useState<EditFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Buscar técnicos
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setProfiles([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,business_name,email,phone,city,access_granted,profile_published')
        .or(
          `full_name.ilike.%${query}%,business_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .limit(20);

      if (error) throw error;
      setProfiles(data as TechnicianProfile[]);
    } catch (err) {
      console.error('Error buscando perfiles:', err);
      setMessage('Error al buscar perfiles');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar perfil completo al seleccionarlo
  const loadFullProfile = async (profileId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setSelectedProfile(data as TechnicianProfile);
      setFormData(data as TechnicianProfile);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setMessage('Error al cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!selectedProfile) return;

    setIsSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', selectedProfile.id);

      if (error) throw error;

      setMessage('✅ Perfil guardado correctamente');
      setSelectedProfile({ ...selectedProfile, ...formData });

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error guardando perfil:', err);
      setMessage('❌ Error al guardar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof EditFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Editar Perfiles de Técnicos</h3>
      </div>

      {/* Búsqueda */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-white/80">Buscar técnico</label>
        <input
          type="text"
          placeholder="Nombre, email, teléfono..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#ff8f1f]"
        />
      </div>

      {/* Lista de resultados */}
      {profiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/60 uppercase tracking-[0.1em]">
            {profiles.length} resultados encontrados
          </p>
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  loadFullProfile(profile.id);
                  setSearchQuery('');
                  setProfiles([]);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selectedProfile?.id === profile.id
                    ? 'border-[#ff8f1f] bg-[#ff8f1f]/10'
                    : 'border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <p className="font-semibold text-white">{profile.business_name || profile.full_name}</p>
                <p className="text-xs text-white/60">{profile.email}</p>
                {profile.city && <p className="text-[10px] text-white/50">{profile.city}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de edición */}
      {selectedProfile && (
        <div className="space-y-6 rounded-2xl border border-white/12 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">
              {formData.business_name || formData.full_name || 'Sin nombre'}
            </h4>
            <button
              onClick={() => {
                setSelectedProfile(null);
                setFormData({});
              }}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          {message && (
            <div
              className={`rounded-lg px-4 py-2 text-sm ${
                message.includes('✅')
                  ? 'border border-green-300/30 bg-green-500/10 text-green-100'
                  : 'border border-rose-300/30 bg-rose-500/10 text-rose-100'
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Nombre Completo
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Nombre de Negocio
              </label>
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Ciudad
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Zona de Cobertura
              </label>
              <input
                type="text"
                value={formData.coverage_area || ''}
                onChange={(e) => handleInputChange('coverage_area', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Rubros (separados por comas)
              </label>
              <textarea
                value={formData.specialties || ''}
                onChange={(e) => handleInputChange('specialties', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={formData.facebook_url || ''}
                onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Instagram
              </label>
              <input
                type="url"
                value={formData.instagram_url || ''}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Publicado
              </label>
              <select
                value={formData.profile_published ? 'si' : 'no'}
                onChange={(e) => handleInputChange('profile_published', e.target.value === 'si')}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-[0.1em] mb-2">
                Acceso Permitido
              </label>
              <select
                value={formData.access_granted ? 'si' : 'no'}
                onChange={(e) => handleInputChange('access_granted', e.target.value === 'si')}
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#ff8f1f]"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-[#ff8f1f] py-2 font-semibold text-[#2a0338] transition hover:bg-[#ffa748] disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              onClick={() => {
                setSelectedProfile(null);
                setFormData({});
              }}
              className="px-4 py-2 rounded-lg border border-white/12 text-white/80 hover:bg-white/[0.04]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!selectedProfile && profiles.length === 0 && searchQuery && !isLoading && (
        <div className="rounded-lg border border-white/12 bg-white/[0.04] px-4 py-6 text-center">
          <p className="text-white/60">No se encontraron técnicos con esa búsqueda</p>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-white/12 bg-white/[0.04] px-4 py-6 text-center">
          <p className="text-white/60">Buscando...</p>
        </div>
      )}
    </div>
  );
}
