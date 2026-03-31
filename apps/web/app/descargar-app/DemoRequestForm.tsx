'use client';

import { FormEvent, useState } from 'react';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  role: string;
  city: string;
  teamSize: string;
  platformInterest: string;
  useCase: string;
  notes: string;
};

const initialState: FormState = {
  fullName: '',
  email: '',
  phone: '',
  companyName: '',
  role: '',
  city: '',
  teamSize: '',
  platformInterest: 'android',
  useCase: '',
  notes: '',
};

const inputClassName =
  'w-full rounded-2xl border border-white/14 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ff8f1f]/65 focus:bg-black/30';

export default function DemoRequestForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'download-page' }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'No pudimos enviar tu solicitud.');
      }

      setSuccess('Recibimos tu solicitud. Te contactaremos para activar la demo y el acceso de prueba.');
      setForm(initialState);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos enviar tu solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#ff8f1f]/22 bg-[linear-gradient(135deg,rgba(255,143,31,0.12),rgba(32,5,53,0.88))] p-5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
        Solicitar demo
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Déjanos tus datos y te habilitamos la prueba.</h2>
      <p className="mt-3 text-sm leading-6 text-white/78">
        Este formulario reemplaza la descarga directa: primero validamos tu caso, luego te enviamos el acceso y el acompañamiento para probar UrbanFix.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Nombre y apellido
          </label>
          <input
            value={form.fullName}
            onChange={(event) => handleChange('fullName', event.target.value)}
            className={inputClassName}
            placeholder="Ej. Juan Pérez"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            className={inputClassName}
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            WhatsApp o teléfono
          </label>
          <input
            value={form.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className={inputClassName}
            placeholder="+54 9 ..."
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Empresa u operación
          </label>
          <input
            value={form.companyName}
            onChange={(event) => handleChange('companyName', event.target.value)}
            className={inputClassName}
            placeholder="Nombre comercial"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Rol
          </label>
          <input
            value={form.role}
            onChange={(event) => handleChange('role', event.target.value)}
            className={inputClassName}
            placeholder="Dueño, técnico, coordinador..."
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Ciudad
          </label>
          <input
            value={form.city}
            onChange={(event) => handleChange('city', event.target.value)}
            className={inputClassName}
            placeholder="Ej. CABA"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Tamaño del equipo
          </label>
          <select
            value={form.teamSize}
            onChange={(event) => handleChange('teamSize', event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecciona una opción</option>
            <option value="solo">Solo trabajo yo</option>
            <option value="2-5">2 a 5 personas</option>
            <option value="6-15">6 a 15 personas</option>
            <option value="16+">16 o más</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Qué quieres probar
          </label>
          <select
            value={form.platformInterest}
            onChange={(event) => handleChange('platformInterest', event.target.value)}
            className={inputClassName}
          >
            <option value="android">Acceso Android</option>
            <option value="web">Plataforma web</option>
            <option value="android-web">Ambos</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Qué necesitas resolver
          </label>
          <textarea
            value={form.useCase}
            onChange={(event) => handleChange('useCase', event.target.value)}
            className={`${inputClassName} min-h-[108px] resize-y`}
            placeholder="Cuéntanos qué flujo quieres probar: presupuestos, operación técnica, perfiles, seguimiento, etc."
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            Comentarios adicionales
          </label>
          <textarea
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            className={`${inputClassName} min-h-[88px] resize-y`}
            placeholder="Si necesitas onboarding, llamada o una demo guiada, indícalo aquí."
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-[#ffb4b4]">{error}</p>}
      {success && <p className="mt-4 text-sm font-medium text-[#b7ffd2]">{success}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56] disabled:cursor-not-allowed disabled:bg-[#c8741f]"
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar demo'}
        </button>
        <p className="text-xs leading-6 text-white/58">
          Te responderemos por email o WhatsApp con el siguiente paso para activar la prueba.
        </p>
      </div>
    </form>
  );
}