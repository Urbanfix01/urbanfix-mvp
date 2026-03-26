'use client';

import React, { useState } from 'react';
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
      setProfiles((data || []) as TechnicianProfile[]);
    } catch (err) {
      console.error('Error:', err);
      setMessage('Error al buscar');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullProfile = async (profileId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();

      if (error) throw error;
      setSelectedProfile(data as TechnicianProfile);
      setFormData(data as TechnicianProfile);
    } catch (err) {
      console.error('Error:', err);
      setMessage('Error al cargar perfil');
    } finally {
      setIsLoading(false);
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
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Editar Perfiles de Técnicos</h3>
        <p className="mt-1 text-sm text-slate-600">Busca y edita los datos de los técnicos.</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Buscar técnico</label>
        <input
          type="text"
          placeholder="Nombre, email, teléfono..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {profiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500 tracking-[0.1em]">{profiles.length} resultados</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  loadFullProfile(profile.id);
                  setSearchQuery('');
                  setProfiles([]);
                }}
                className={`w-full rounded-lg border px-4 py-2 text-left transition ${
                  selectedProfile?.id === profile.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-slate-900">{profile.business_name || profile.full_name}</p>
                <p className="text-xs text-slate-500">{profile.email}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">{formData.business_name || formData.full_name}</h4>
            <button onClick={() => setSelectedProfile(null)} className="text-slate-500 hover:text-slate-900">
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
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Negocio</label>
              <input
                type="text"
                value={formData.business_name || ''}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Teléfono</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Ciudad</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Cobertura</label>
              <input
                type="text"
                value={formData.coverage_area || ''}
                onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Rubros</label>
              <textarea
                value={formData.specialties || ''}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Publicado</label>
              <select
                value={formData.profile_published ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, profile_published: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-[0.1em]">Acceso</label>
              <select
                value={formData.access_granted ? 'si' : 'no'}
                onChange={(e) => setFormData({ ...formData, access_granted: e.target.value === 'si' })}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-slate-900 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setSelectedProfile(null)}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!selectedProfile && profiles.length === 0 && !searchQuery && (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">Ingresa un nombre para buscar un técnico</p>
        </div>
      )}
    </div>
  );
}
