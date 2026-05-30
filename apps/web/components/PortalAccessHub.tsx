'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  LogIn,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';

import { hasSupabaseConfig, supabase } from '../lib/supabase/supabase';
import PublicTopNav from './PublicTopNav';

type AccessRole = 'cliente' | 'tecnico';

type AccessOption = {
  role: AccessRole;
  title: string;
  badge: string;
  description: string;
  detail: string;
  panelLabel: string;
  loginHref: string;
  registerHref: string;
  accountHref: string;
  icon: typeof Users;
  shellClassName: string;
  iconClassName: string;
  cardClassName: string;
  spotlightClassName: string;
};

const TECH_PANEL_PATH = '/tecnico-panel';
const buildTechnicianAccessHref = (mode: 'login' | 'register') =>
  `/tecnicos?mode=${mode}&perfil=tecnico&next=${encodeURIComponent(TECH_PANEL_PATH)}`;

const ACCESS_OPTIONS: AccessOption[] = [
  {
    role: 'cliente',
    title: 'Cliente',
    badge: 'Solicitudes y seguimiento',
    description: 'Publica trabajos, revisa respuestas y entra a tu cuenta desde el flujo cliente.',
    detail: 'Ideal para hogares, consorcios y empresas que necesitan pedir servicio.',
    panelLabel: 'Portal cliente',
    loginHref: '/cliente?mode=login',
    registerHref: '/cliente?mode=register',
    accountHref: '/cliente',
    icon: Users,
    shellClassName: 'border-[#8bd4ff]/[0.55] bg-[#eff9ff]',
    iconClassName: 'text-[#0f5f8f]',
    cardClassName: 'border-[#d8edf8] bg-[linear-gradient(180deg,rgba(239,249,255,0.96),rgba(255,255,255,0.98))]',
    spotlightClassName: 'from-[rgba(127,212,255,0.28)] via-transparent to-transparent',
  },
  {
    role: 'tecnico',
    title: 'Tecnico',
    badge: 'Cotizaciones y operacion',
    description: 'Entra a tu panel de trabajo para ver solicitudes, cotizar y administrar tu agenda.',
    detail: 'Pensado para tecnicos independientes, cuadrillas y servicios de mantenimiento.',
    panelLabel: 'Panel tecnico',
    loginHref: buildTechnicianAccessHref('login'),
    registerHref: buildTechnicianAccessHref('register'),
    accountHref: TECH_PANEL_PATH,
    icon: Wrench,
    shellClassName: 'border-[#f6c08f]/[0.60] bg-[#fff3e7]',
    iconClassName: 'text-[#a24b06]',
    cardClassName: 'border-[#f0ddca] bg-[linear-gradient(180deg,rgba(255,243,231,0.96),rgba(255,255,255,0.98))]',
    spotlightClassName: 'from-[rgba(255,179,94,0.28)] via-transparent to-transparent',
  },
];

export default function PortalAccessHub() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AccessRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!hasSupabaseConfig) {
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const selectedOption = ACCESS_OPTIONS.find((option) => option.role === selectedRole) || null;
  const sessionLabel = session?.user?.email?.trim() || 'Sesion detectada';

  return (
    <div className="min-h-screen bg-[#14071f] text-white">
      <PublicTopNav activeHref="/portal" sticky />

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#14071f_0%,#22062f_52%,#12041a_100%)]"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="w-full rounded-[36px] border border-white/[0.12] bg-white/[0.06] p-5 shadow-[0_44px_140px_-70px_rgba(0,0,0,0.92)] backdrop-blur md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                    <ShieldCheck className="h-4 w-4 text-[#ffb35e]" />
                    Acceso a cuentas
                  </div>

                  <div>
                    <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                      {selectedOption ? `Entrar como ${selectedOption.title}` : 'Elige como entrar'}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/[0.72] sm:text-base">
                      {selectedOption
                        ? 'Primero definimos el perfil y despues te llevamos al flujo exacto para ingresar o crear tu cuenta.'
                        : 'El acceso ahora parte desde un selector unico. Eliges cliente o tecnico y sigues directo al panel correcto.'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[28px] border border-white/[0.12] bg-white/[0.08] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Paso 1</p>
                      <p className="mt-2 text-base font-semibold text-white">Selecciona perfil</p>
                      <p className="mt-2 text-sm leading-6 text-white/[0.65]">
                        Cliente y tecnico tienen acceso y lenguaje distintos.
                      </p>
                    </div>
                    <div className="rounded-[28px] border border-white/[0.12] bg-white/[0.08] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Paso 2</p>
                      <p className="mt-2 text-base font-semibold text-white">Ingresa a tu cuenta</p>
                      <p className="mt-2 text-sm leading-6 text-white/[0.65]">
                        Si ya tienes sesion, entras directo. Si no, sigues al login correcto.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/[0.65]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5">
                      <BriefcaseBusiness className="h-4 w-4 text-[#ffb35e]" />
                      Un solo punto de entrada
                    </span>
                    {loadingSession ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5">
                        Validando sesion...
                      </span>
                    ) : session ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/[0.18] bg-emerald-400/10 px-3 py-1.5 text-emerald-100">
                        Sesion activa: {sessionLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5">
                        Si no tienes cuenta, puedes crearla luego de elegir perfil.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {ACCESS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedRole === option.role;

                    return (
                      <button
                        key={option.role}
                        type="button"
                        onClick={() => setSelectedRole(option.role)}
                        className={`group relative overflow-hidden rounded-[30px] border p-6 text-left transition ${
                          isSelected
                            ? 'border-white/60 bg-white/[0.16] shadow-[0_26px_70px_-42px_rgba(255,255,255,0.45)]'
                            : 'border-white/[0.12] bg-white/[0.06] hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${option.spotlightClassName} opacity-100`}
                        />
                        <div className="relative">
                          <div className={`inline-flex rounded-[20px] border p-3 ${option.shellClassName}`}>
                            <Icon className={`h-7 w-7 ${option.iconClassName}`} />
                          </div>
                          <div className="mt-5 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-2xl font-bold text-white">{option.title}</p>
                              <p className="mt-2 text-sm leading-6 text-white/[0.72]">{option.description}</p>
                            </div>
                            <ArrowRight
                              className={`mt-1 h-5 w-5 shrink-0 transition ${
                                isSelected ? 'text-white' : 'text-white/[0.35] group-hover:translate-x-0.5 group-hover:text-white/80'
                              }`}
                            />
                          </div>
                          <div className="mt-5 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/[0.12] bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                              {option.badge}
                            </span>
                            <span className="rounded-full border border-white/[0.12] bg-white/10 px-3 py-1 text-[11px] text-white/[0.55]">
                              {option.panelLabel}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-2 text-sm text-white/[0.58]">
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-4 py-2 font-semibold text-white/[0.72] transition hover:border-white/[0.22] hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Administracion
                  </Link>
                  <p>Si entras con varios perfiles, puedes volver y cambiarlo cuando quieras.</p>
                </div>
              </div>

              <div className="lg:pl-2">
                <div className="rounded-[34px] border border-[#eadfce]/70 bg-[#fffdf9] p-6 text-[#180f24] shadow-[0_34px_120px_-62px_rgba(0,0,0,0.82)] sm:p-7">
                  {selectedOption ? (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Perfil elegido</p>
                          <h2 className="mt-3 text-3xl font-semibold text-slate-900">{selectedOption.title}</h2>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{selectedOption.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedRole(null)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Cambiar
                        </button>
                      </div>

                      <div className={`rounded-[28px] border p-5 ${selectedOption.cardClassName}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {session ? 'Cuenta lista para entrar' : 'Accion disponible'}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">{selectedOption.panelLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {session
                            ? `Ya detectamos una sesion activa. Entras directo al ${selectedOption.panelLabel.toLowerCase()}.`
                            : `Te llevamos al acceso ${selectedOption.title.toLowerCase()} para iniciar sesion o crear la cuenta correcta.`}
                        </p>
                      </div>

                      {session ? (
                        <Link
                          href={selectedOption.accountHref}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a0338] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_-26px_rgba(42,3,56,0.8)] transition hover:bg-[#3b0b4a]"
                        >
                          Ir a mi cuenta
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <div className="space-y-3">
                          <Link
                            href={selectedOption.loginHref}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a0338] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_-26px_rgba(42,3,56,0.8)] transition hover:bg-[#3b0b4a]"
                          >
                            <LogIn className="h-4 w-4" />
                            Ingresar
                          </Link>
                          <Link
                            href={selectedOption.registerHref}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            <UserPlus className="h-4 w-4" />
                            Crear cuenta
                          </Link>
                        </div>
                      )}

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Que sucede despues</p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                          <p>1. Entras por el flujo correcto para tu perfil.</p>
                          <p>2. Si ya tienes sesion, accedes directo a tu panel.</p>
                          <p>3. Si aun no tienes cuenta, la creas y vuelves al panel correspondiente.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Acceso guiado</p>
                        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Elige un perfil para continuar</h2>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          El comportamiento es intencional: primero eliges el contexto y luego mostramos el acceso que corresponde a esa cuenta.
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,245,232,0.96),rgba(255,255,255,0.98))] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Listo para continuar</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">Acceso claro por perfil</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Seleccionas quien entra y evitamos mezclar el acceso de cliente con el de tecnico.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {ACCESS_OPTIONS.map((option) => (
                          <button
                            key={`${option.role}-cta`}
                            type="button"
                            onClick={() => setSelectedRole(option.role)}
                            className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                          >
                            <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{option.badge}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
