'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import { ANALYTICS_ENDPOINT, getOrCreateAnalyticsSessionId } from '../../lib/analytics';

const WHATSAPP_PHONE = '5491170084556';
const CONTACT_EMAIL = 'info@urbanfixar.com';

const interestOptions = [
  'Quiero una demo general',
  'Quiero ver el flujo tecnico',
  'Quiero ver el flujo cliente',
  'Quiero implementarlo en mi equipo',
];

const sanitizeLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export default function HomeLeadCapture() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [interest, setInterest] = useState(interestOptions[0]);
  const [captureState, setCaptureState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastChannel, setLastChannel] = useState<'whatsapp' | 'email' | null>(null);

  const leadDraft = useMemo(() => {
    const safeName = sanitizeLine(name);
    const safeCompany = sanitizeLine(company);
    const safeInterest = sanitizeLine(interest);

    const lines = [
      'Hola, quiero una demo de UrbanFix.',
      safeName ? `Nombre: ${safeName}` : null,
      safeCompany ? `Empresa o equipo: ${safeCompany}` : null,
      safeInterest ? `Interes: ${safeInterest}` : null,
      'Vengo desde la homepage.',
    ].filter(Boolean);

    return {
      safeName,
      safeCompany,
      safeInterest,
      payload: lines.join('\n'),
    };
  }, [company, interest, name]);

  const whatsappHref = useMemo(
    () => `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(leadDraft.payload)}`,
    [leadDraft.payload]
  );

  const mailHref = useMemo(() => {
    const subject = 'Quiero una demo de UrbanFix';
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(leadDraft.payload)}`;
  }, [leadDraft.payload]);

  const captureLead = (channel: 'whatsapp' | 'email') => {
    setCaptureState('saving');
    setLastChannel(channel);

    const path = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
    const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';
    const target = channel === 'whatsapp' ? WHATSAPP_PHONE : CONTACT_EMAIL;

    const body = {
      event_type: 'funnel',
      event_name: 'homepage_demo_lead',
      session_id: getOrCreateAnalyticsSessionId(),
      path,
      referrer,
      event_context: {
        source: 'homepage',
        section: 'demo_capture',
        channel,
        target,
        interest: leadDraft.safeInterest || 'sin_interes',
        name: leadDraft.safeName || 'sin_nombre',
        company: leadDraft.safeCompany || 'sin_empresa',
        message: leadDraft.payload,
      },
    };

    try {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      })
        .then((response) => {
          setCaptureState(response.ok ? 'saved' : 'error');
        })
        .catch(() => {
          setCaptureState('error');
        });
    } catch {
      setCaptureState('error');
    }
  };

  const captureNote =
    captureState === 'saved'
      ? `Lead guardado en UrbanFix antes de abrir ${lastChannel === 'email' ? 'email' : 'WhatsApp'}.`
      : captureState === 'error'
        ? 'No pudimos registrar el lead interno, pero el acceso directo sigue funcionando.'
        : captureState === 'saving'
          ? 'Guardando el lead en UrbanFix mientras abrimos el canal elegido.'
          : 'Cada CTA tambien registra este lead dentro de UrbanFix para seguimiento comercial.';

  return (
    <section className="rounded-[28px] border border-white/14 bg-black/25 p-5 backdrop-blur-md sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">Captura de demo</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Pide una demo y deja tu contexto en el primer mensaje.</h3>
          <p className="mt-3 text-sm leading-6 text-white/74">
            Completa lo minimo y abrimos WhatsApp o email con el lead ya armado para no perder tiempo en la primera ida y
            vuelta.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/58">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#ffb35e]/65 focus:bg-white/[0.07]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/58">Empresa o equipo</span>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Estudio, cuadrilla o empresa"
            className="w-full rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#ffb35e]/65 focus:bg-white/[0.07]"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/58">Que quieres ver</span>
        <select
          value={interest}
          onChange={(event) => setInterest(event.target.value)}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-[#ffb35e]/65 focus:bg-white/[0.07]"
        >
          {interestOptions.map((option) => (
            <option key={option} value={option} className="bg-[#2a0338] text-white">
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => captureLead('whatsapp')}
          className="inline-flex items-center gap-2 rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffb45e]"
        >
          <MessageCircle className="h-4 w-4" />
          Enviar por WhatsApp
          <ArrowUpRight className="h-4 w-4" />
        </a>

        <a
          href={mailHref}
          onClick={() => captureLead('email')}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/92 transition hover:border-white hover:text-white"
        >
          <Mail className="h-4 w-4" />
          Enviar por email
        </a>
      </div>

      <p className="mt-3 text-xs leading-6 text-white/50">
        El mensaje sale precompletado a <span className="font-semibold text-white/72">+54 9 11 7008-4556</span> o{' '}
        <span className="font-semibold text-white/72">info@urbanfixar.com</span>.
      </p>
      <p className="mt-2 text-xs leading-6 text-white/58">{captureNote}</p>
    </section>
  );
}
