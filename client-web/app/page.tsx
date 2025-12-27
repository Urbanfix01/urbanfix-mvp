'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/supabase';

export default function Home() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [authError, setAuthError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        router.replace('/tecnicos');
      } else {
        setCheckingSession(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        router.replace('/tecnicos');
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    setAuthError('');
    const redirectTo = `${window.location.origin}/tecnicos`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/tecnicos');
        return;
      }
      if (!fullName.trim() || !businessName.trim()) {
        setAuthError('Completa tu nombre y el de tu negocio.');
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, business_name: businessName } },
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error?.message || 'No pudimos iniciar sesion.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F39C12]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/20 blur-3xl" />

        <main className="relative mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid min-h-screen items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-7 text-center md:text-left">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                Plataforma de presupuestos
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-black leading-tight text-white md:text-6xl">
                  <span className="text-[#F39C12]">Urban</span>Fix
                  <span className="block text-2xl font-semibold text-white/70 md:text-3xl">
                    Gestion clara para tecnicos en movimiento.
                  </span>
                </h1>
                <p className="text-base text-white/70 md:text-lg">
                  Esta es la pagina para clientes y tecnicos. Si recibiste un presupuesto, abrilo desde el link que te
                  envio tu tecnico.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <a
                  href="https://urbanfixar.com/privacidad"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Politica de Privacidad
                </a>
                <a
                  href="https://urbanfixar.com/urbanfix"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
                >
                  Que es UrbanFix
                </a>
                <a
                  href="https://urbanfixar.com/terminos"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
                >
                  Terminos del Servicio
                </a>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-left shadow-2xl backdrop-blur">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                    Acceso rapido
                    <span className="rounded-full bg-[#0EA5E9]/20 px-3 py-1 text-[10px] font-semibold text-[#7DD3FC]">
                      Clientes
                    </span>
                  </div>
                  <p className="text-sm text-white/80">
                    El presupuesto se abre desde un link personalizado. Si aun no lo recibiste, solicitale el enlace a
                    tu tecnico.
                  </p>
                  <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/70">
                    Tip: Guarda el link en favoritos para revisar el detalle y aceptar el trabajo cuando lo necesites.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-2xl backdrop-blur md:self-start">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Ingresa a tu cuenta</h2>
                <p className="text-sm text-white/70">
                  Gestiona presupuestos desde la web con tu cuenta UrbanFix.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={checkingSession}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-60"
              >
                Continuar con Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-white/50">
                <div className="h-px flex-1 bg-white/10" />
                o
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {authMode === 'register' && (
                <div className="space-y-3">
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                  />
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Nombre del negocio"
                    className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#F39C12]/60"
                  />
                </div>
              )}

              <div className="space-y-3">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Correo"
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Contrasena"
                  className="w-full rounded-2xl border border-white/10 bg-[#101827] px-4 py-3 text-sm text-white outline-none transition focus:border-[#0EA5E9]/60"
                />
                {authError && <p className="text-xs text-[#F39C12]">{authError}</p>}
              </div>

              <button
                type="button"
                onClick={handleEmailAuth}
                disabled={checkingSession}
                className="mt-5 w-full rounded-2xl bg-[#F39C12] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-[#F59E0B] disabled:opacity-60"
              >
                {authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="mt-4 w-full text-sm text-white/70 hover:text-white"
              >
                {authMode === 'login' ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Ingresa'}
              </button>
              <p className="mt-4 text-xs text-white/60">
                Si sos cliente, abre el link del presupuesto que te envio tu tecnico.
              </p>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-start md:justify-start">
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 rounded-full bg-[#F39C12] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 opacity-90"
              >
                Android
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
              </button>
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 backdrop-blur opacity-90"
              >
                iOS
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Proximamente</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
