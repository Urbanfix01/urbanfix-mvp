'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  Check,
  ClipboardList,
  Crosshair,
  Droplets,
  Flame,
  Hammer,
  Home,
  KeyRound,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const CLIENT_REGISTER = '/cliente?mode=register&quick=1&intent=create-request';
const TECH_REGISTER = '/tecnicos?mode=register&perfil=tecnico&next=%2Ftecnicos&source=home';
const LOGIN = '/tecnicos?mode=login';

const navItems = [
  ['Cómo funciona', '#como-funciona'],
  ['Servicios', '#servicios'],
  ['Técnicos', '/vidriera'],
  ['Valores', '/precios-mano-de-obra'],
  ['Comunidad', '/comunidad'],
] as const;

const trades = [
  ['Plomería', '/hero/home-tool-pipe.png', 'Herramienta para trabajos de plomería'],
  ['Electricidad', '/hero/home-tool-wrench.png', 'Herramienta para trabajos técnicos'],
  ['Albañilería', '/hero/home-tool-trowel.png', 'Cuchara para trabajos de albañilería'],
  ['Pintura', '/hero/home-tool-brush.png', 'Pincel para trabajos de pintura'],
] as const;

const clientSteps = [
  [Search, 'Buscá el servicio', 'Elegí el oficio, revisá perfiles publicados y encontrá profesionales por zona.'],
  [ClipboardList, 'Describí el problema', 'Publicá el pedido con la información necesaria para recibir respuestas con contexto.'],
  [Star, 'Elegí y coordiná', 'Compará propuestas, organizá la visita y seguí el trabajo desde tu espacio.'],
] as const;

const technicianSteps = [
  [Bell, 'Recibí oportunidades', 'Revisá pedidos compatibles con tu especialidad y zona de trabajo.'],
  [WalletCards, 'Prepará presupuestos', 'Usá el catálogo de valores, ordená los ítems y compartí cada propuesta.'],
  [CalendarClock, 'Gestioná el servicio', 'Centralizá agenda, conversaciones y avance del trabajo en tu panel.'],
] as const;

const services = [
  ['01', 'Plomería', Droplets, '/hero/home-tool-pipe.png', 'from-[#4d1034]'],
  ['02', 'Electricidad', Zap, '/hero/home-tool-wrench.png', 'from-[#2d1555]'],
  ['03', 'Gas', Flame, '/hero/home-tool-pipe.png', 'from-[#65270b]'],
  ['04', 'Aire acondicionado', Wind, '/hero/home-tool-wrench.png', 'from-[#12334a]'],
  ['05', 'Cerrajería', KeyRound, '/hero/home-tool-wrench.png', 'from-[#3a253f]'],
  ['06', 'Albañilería', Hammer, '/hero/home-tool-trowel.png', 'from-[#51351c]'],
] as const;

const features = [
  [BadgeCheck, 'Perfiles publicados', 'Información de oficio, zona y disponibilidad para elegir con contexto.'],
  [ShieldCheck, 'Seguimiento compartido', 'Solicitud, respuesta y coordinación reunidas alrededor del mismo trabajo.'],
  [WalletCards, 'Presupuestos ordenados', 'Ítems, cantidades y valores visibles antes de avanzar con el servicio.'],
  [CalendarClock, 'Herramientas de gestión', 'Agenda, mensajes y estado del trabajo en el panel de cada usuario.'],
] as const;

const mapMarkers = [
  [1, 'plomeria', 18, 27, Droplets],
  [2, 'electricidad', 43, 19, Zap],
  [3, 'gas', 71, 30, Flame],
  [4, 'aire', 31, 67, Wind],
  [5, 'plomeria', 63, 72, Droplets],
  [6, 'electricidad', 84, 55, Zap],
] as const;

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid h-9 w-9 place-items-center rounded-lg border ${dark ? 'border-white/20 bg-white/10' : 'border-[#21002f]/15 bg-[#21002f]'}`}>
        <Image src="/icon-48.png" alt="" width={30} height={30} className="rounded-md" />
      </span>
      <span className={`text-xl font-extrabold tracking-[-0.055em] ${dark ? 'text-white' : 'text-[#21002f]'}`}>
        URBAN<span className="text-[#ff8f1f]">FIX</span>
      </span>
    </span>
  );
}

function Journey({
  dark,
  eyebrow,
  title,
  description,
  steps,
  href,
}: {
  dark?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  steps: typeof clientSteps | typeof technicianSteps;
  href: string;
}) {
  return (
    <article className={`border-x border-t ${dark ? 'border-white/15 bg-[#21002f] text-white' : 'border-[#21002f]/10 bg-white text-[#21002f]'}`}>
      <div className="grid lg:grid-cols-[.78fr_1.22fr]">
        <aside className={`border-b p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-12 ${dark ? 'border-white/15' : 'border-[#21002f]/10'}`}>
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8f1f]">{eyebrow}</p>
            <h3 data-ufx-reveal className="ufx-reveal mt-16 max-w-xl text-5xl font-black uppercase leading-[.86] tracking-[-.065em] sm:text-7xl">{title}</h3>
            <p className={`mt-8 max-w-md text-sm leading-6 ${dark ? 'text-white/55' : 'text-[#21002f]/55'}`}>{description}</p>
            <Link href={href} className={`mt-10 inline-flex items-center gap-3 border px-5 py-3 text-xs font-black uppercase ${dark ? 'border-white/20' : 'border-[#21002f]/15'}`}>
              Empezar <ArrowUpRight className="h-4 w-4 text-[#ff8f1f]" />
            </Link>
          </div>
        </aside>
        <div>
          {steps.map(([Icon, stepTitle, text], index) => (
            <section key={stepTitle} data-ufx-reveal className={`ufx-reveal grid min-h-[280px] grid-cols-[78px_1fr] border-b sm:grid-cols-[118px_1fr] ${dark ? 'border-white/15' : 'border-[#21002f]/10'}`}>
              <div className={`flex flex-col items-center justify-between border-r py-8 ${dark ? 'border-white/15' : 'border-[#21002f]/10'}`}>
                <span className="text-[10px] font-black tracking-[.18em] text-[#ff8f1f]">0{index + 1}</span>
                <span className={`grid h-11 w-11 place-items-center border ${dark ? 'border-white/15' : 'border-[#21002f]/10'}`}><Icon className="h-5 w-5" /></span>
              </div>
              <div className="flex flex-col justify-end p-7 sm:p-10">
                <h4 className="text-2xl font-black uppercase tracking-[-.04em] sm:text-3xl">{stepTitle}</h4>
                <p className={`mt-4 max-w-xl text-sm leading-6 ${dark ? 'text-white/55' : 'text-[#21002f]/55'}`}>{text}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function UrbanFixBase44Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tradeIndex, setTradeIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [mapFilter, setMapFilter] = useState('todos');
  const [selectedMarker, setSelectedMarker] = useState(2);
  const [locationActive, setLocationActive] = useState(false);

  const visibleMarkers = useMemo(
    () => mapMarkers.filter(([, trade]) => mapFilter === 'todos' || trade === mapFilter),
    [mapFilter],
  );

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 20);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setTradeIndex((current) => (current + 1) % trades.length), 3600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-ufx-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  const [tradeLabel, tradeImage, tradeAlt] = trades[tradeIndex];
  const [FeatureIcon, featureTitle, featureText] = features[featureIndex];

  return (
    <div id="top" className="min-h-screen bg-[#f2f1ef] text-[#21002f] selection:bg-[#ff8f1f]/30">
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-[#ff8f1f]" style={{ transform: `scaleX(${progress})` }} />

      <header className={`fixed inset-x-0 top-0 z-50 border-b transition duration-300 ${scrolled || menuOpen ? 'border-[#21002f]/10 bg-[#f2f1ef]/95 shadow-[0_14px_40px_rgba(33,0,47,.08)] backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
        <nav aria-label="Navegación principal" className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="#top" onClick={() => setMenuOpen(false)} aria-label="Ir al inicio"><Brand /></Link>
          <div className="hidden items-center gap-6 text-sm text-[#21002f]/60 lg:flex">
            {navItems.map(([label, href]) => <Link key={label} href={href} className="transition hover:text-[#21002f]">{label}</Link>)}
          </div>
          <div className="flex items-center gap-2">
            <Link href={LOGIN} className="hidden px-3 py-2 text-sm font-bold hover:text-[#ff7a00] sm:inline-flex">Ingresar</Link>
            <Link href="#registro" className="inline-flex min-h-10 items-center bg-[#ff8f1f] px-4 text-xs font-black sm:text-sm">Registrarse</Link>
            <button type="button" aria-expanded={menuOpen} aria-controls="urbanfix-home-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen((value) => !value)} className="grid h-10 w-10 place-items-center border border-[#21002f]/15 lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <nav id="urbanfix-home-menu" aria-label="Navegación móvil" className="border-t border-[#21002f]/10 bg-[#f2f1ef] px-4 pb-5 pt-2 lg:hidden">
            <div className="mx-auto grid max-w-[1500px]">
              {navItems.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center justify-between border-b border-[#21002f]/10 text-sm font-bold">{label}<ArrowRight className="h-4 w-4 text-[#ff8f1f]" /></Link>)}
              <Link href={LOGIN} onClick={() => setMenuOpen(false)} className="mt-3 flex min-h-12 items-center justify-center border border-[#21002f]/15 text-sm font-black">Ingresar</Link>
            </div>
          </nav>
        ) : null}
      </header>

      <main>
        <section className="overflow-hidden px-4 pb-4 pt-24 sm:px-6 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-[1500px] border-x border-[#21002f]/10 bg-white">
            <div className="grid min-h-[610px] border-y border-[#21002f]/10 lg:grid-cols-[1.65fr_.75fr]">
              <div data-ufx-reveal className="ufx-reveal flex flex-col justify-between border-b border-[#21002f]/10 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[#21002f]/55"><span className="h-2 w-2 rounded-full bg-[#ff8f1f] shadow-[0_0_0_5px_rgba(255,143,31,.14)]" />Servicios para hogares y técnicos</div>
                <h1 className="my-16 max-w-[920px] text-[clamp(4rem,11vw,10.5rem)] font-black uppercase leading-[.78] tracking-[-.085em]">Tu casa<br /><span className="text-[#ff8f1f]">resuelta.</span></h1>
                <p className="max-w-md text-sm leading-6 text-[#21002f]/60">UrbanFix conecta necesidades reales del hogar con técnicos de oficio y herramientas para organizar cada trabajo.</p>
              </div>
              <aside data-ufx-reveal className="ufx-reveal flex min-h-[340px] flex-col justify-between p-6 sm:p-10 lg:p-12">
                <p className="text-sm text-[#21002f]/45">Dos públicos. Una misma plataforma.</p>
                <h2 className="max-w-sm text-3xl font-black uppercase leading-[1.02] tracking-[-.045em] sm:text-4xl">Vecinos encuentran soluciones. Técnicos hacen crecer su trabajo.</h2>
                <Link href="#recorridos" className="flex items-center gap-2 text-sm font-semibold">Conocé los recorridos <ArrowDown className="h-4 w-4" /></Link>
              </aside>
            </div>

            <div id="recorridos" className="grid gap-px bg-[#21002f]/10 p-px lg:grid-cols-3">
              <Link href={CLIENT_REGISTER} className="group flex min-h-[420px] flex-col justify-between bg-[#21002f] p-7 text-white sm:p-9">
                <Home className="h-9 w-9 text-[#ff8f1f]" />
                <div><p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb96f]">Para vecinos</p><h3 className="text-4xl font-black uppercase leading-[.95] tracking-[-.045em]">Necesito un técnico</h3><p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Elegí el servicio, describí el problema y encontrá profesionales para resolverlo.</p></div>
                <span className="flex items-center justify-between border-t border-white/15 pt-5 text-sm font-semibold">Empezar como vecino <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></span>
              </Link>

              <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[#170021] p-7 text-white sm:p-9">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,143,31,.32),transparent_38%)]" />
                <div className="relative flex items-center justify-between text-[10px] font-black uppercase tracking-[.18em] text-white/55"><span>Oficio destacado</span><span>0{tradeIndex + 1} / 0{trades.length}</span></div>
                <div className="relative mx-auto my-4 aspect-square w-[72%] max-w-[300px]"><Image key={tradeImage} src={tradeImage} alt={tradeAlt} fill priority sizes="(max-width:1024px) 70vw, 28vw" className="ufx-trade-image object-contain drop-shadow-[0_32px_44px_rgba(0,0,0,.45)]" /></div>
                <div className="relative"><p className="text-3xl font-black uppercase tracking-[-.05em]">{tradeLabel}</p><div role="tablist" aria-label="Elegir oficio" className="mt-5 grid grid-cols-4 gap-2">{trades.map(([label], index) => <button key={label} type="button" role="tab" aria-selected={tradeIndex === index} aria-label={`Mostrar ${label}`} onClick={() => setTradeIndex(index)} className="h-1 bg-white/20"><span className={`block h-full bg-[#ff8f1f] transition-all ${tradeIndex === index ? 'w-full' : 'w-0'}`} /></button>)}</div><p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-white/65">Oficios que mantienen la ciudad en movimiento</p></div>
              </div>

              <Link href={TECH_REGISTER} className="group flex min-h-[420px] flex-col justify-between bg-[#ff8f1f] p-7 sm:p-9">
                <Wrench className="h-9 w-9" />
                <div><p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-[#21002f]/55">Para técnicos</p><h3 className="text-4xl font-black uppercase leading-[.95] tracking-[-.045em]">Quiero ofrecer mis servicios</h3><p className="mt-5 max-w-xs text-sm leading-6 text-[#21002f]/65">Recibí oportunidades y gestioná agenda, presupuestos y trabajos desde un mismo lugar.</p></div>
                <span className="flex items-center justify-between border-t border-[#21002f]/15 pt-5 text-sm font-semibold">Empezar como técnico <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Servicios de UrbanFix" className="overflow-hidden border-y border-[#21002f]/10 bg-[#ff8f1f] py-4"><div className="ufx-ticker flex w-max whitespace-nowrap">{[...services, ...services].map(([, name], index) => <span key={`${name}-${index}`} className="flex items-center text-sm font-black tracking-[.14em]">{name}<span className="mx-7 text-lg">✦</span></span>)}</div></section>

        <section id="como-funciona" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-[1500px]">
            <header className="grid border-x border-t border-[#21002f]/10 lg:grid-cols-[1.35fr_.65fr]"><div className="p-7 sm:p-10 lg:p-14"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8f1f]">Cómo funciona</p><h2 data-ufx-reveal className="ufx-reveal mt-8 text-5xl font-black uppercase leading-[.86] tracking-[-.065em] sm:text-7xl lg:text-8xl">Un lugar. Dos caminos.</h2></div><div className="flex items-end border-t border-[#21002f]/10 p-7 lg:border-l lg:border-t-0 lg:p-12"><p className="max-w-sm text-sm leading-6 text-[#21002f]/55">El recorrido cambia según lo que necesitás, pero toda la experiencia vive dentro de UrbanFix.</p></div></header>
            <Journey eyebrow="Para vecinos" title="Resolver el problema en casa" description="Explorá, publicá y elegí con la información del trabajo reunida en un solo lugar." steps={clientSteps} href={CLIENT_REGISTER} />
            <Journey dark eyebrow="Para técnicos" title="Hacer crecer el trabajo" description="Mostrá tu oficio, respondé oportunidades y mantené ordenada la operación diaria." steps={technicianSteps} href={TECH_REGISTER} />
          </div>
        </section>

        <section id="servicios" className="border-y border-[#21002f]/10 bg-white">
          <div className="mx-auto max-w-[1500px] border-x border-[#21002f]/10">
            <header className="grid border-b border-[#21002f]/10 lg:grid-cols-[1.35fr_.65fr]"><div className="p-7 sm:p-10 lg:p-14"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8f1f]">Servicios</p><h2 data-ufx-reveal className="ufx-reveal mt-8 text-5xl font-black uppercase leading-[.86] tracking-[-.065em] sm:text-7xl lg:text-8xl">Oficios para cada necesidad.</h2></div><div className="flex items-end border-t border-[#21002f]/10 p-7 lg:border-l lg:border-t-0 lg:p-12"><p className="max-w-sm text-sm leading-6 text-[#21002f]/55">Categorías claras para encontrar lo que necesitás y mostrar cada especialidad.</p></div></header>
            <div className="ufx-service-scroll grid auto-cols-[82vw] grid-flow-col overflow-x-auto snap-x snap-mandatory lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible">
              {services.map(([code, name, Icon, image, tint]) => <Link key={name} href={`/vidriera?query=${encodeURIComponent(name)}`} className={`group relative min-h-[390px] snap-start overflow-hidden border-b border-r border-white/10 bg-gradient-to-br ${tint} to-[#21002f]`}><div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" /><div className="absolute right-[-8%] top-[8%] aspect-square w-[72%] transition duration-700 group-hover:-translate-x-4 group-hover:scale-105"><Image src={image} alt={`Recurso visual de ${name}`} fill sizes="(max-width:1024px) 72vw, 30vw" className="object-contain drop-shadow-[0_30px_36px_rgba(0,0,0,.35)]" /></div><div className="relative flex min-h-[390px] flex-col justify-between p-7 text-white sm:p-9"><div className="flex justify-between"><span className="text-xs font-black tracking-[.18em] text-white/60">{code}</span><ArrowUpRight className="h-5 w-5" /></div><div><span className="mb-5 grid h-11 w-11 place-items-center bg-[#ff8f1f] text-[#21002f]"><Icon className="h-5 w-5" /></span><h3 className="text-3xl font-black uppercase leading-[.92] tracking-[-.045em] sm:text-4xl">{name}</h3></div></div></Link>)}
            </div>
          </div>
        </section>

        <section className="border-b border-[#21002f]/10">
          <div className="mx-auto max-w-[1500px] border-x border-[#21002f]/10">
            <header className="grid border-b border-[#21002f]/10 lg:grid-cols-[1.35fr_.65fr]"><div className="p-7 sm:p-10 lg:p-14"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8f1f]">Mapa de técnicos</p><h2 data-ufx-reveal className="ufx-reveal mt-8 text-5xl font-black uppercase leading-[.86] tracking-[-.065em] sm:text-7xl lg:text-8xl">El oficio que necesitás, cerca.</h2></div><div className="flex flex-col justify-end gap-7 border-t border-[#21002f]/10 p-7 lg:border-l lg:border-t-0 lg:p-12"><p className="max-w-sm text-sm leading-6 text-[#21002f]/55">La visualización explica la búsqueda. El directorio muestra los perfiles publicados actualmente.</p><Link href="/vidriera" className="inline-flex w-fit items-center gap-3 text-sm font-black uppercase">Explorar técnicos <span className="grid h-9 w-9 place-items-center bg-[#ff8f1f]"><ArrowUpRight className="h-4 w-4" /></span></Link></div></header>
            <div className="grid lg:grid-cols-[340px_1fr]">
              <aside className="border-b border-[#21002f]/10 bg-white lg:border-b-0 lg:border-r"><div className="border-b border-[#21002f]/10 p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#21002f]/40">Filtrar por oficio</p><div className="mt-4 flex flex-wrap gap-2">{[['todos','Todos'],['plomeria','Plomería'],['electricidad','Electricidad'],['gas','Gas'],['aire','Aire']].map(([id,label]) => <button key={id} type="button" onClick={() => setMapFilter(id)} className={`border px-3 py-2 text-xs font-bold ${mapFilter === id ? 'border-[#21002f] bg-[#21002f] text-white' : 'border-[#21002f]/15'}`}>{label}</button>)}</div></div><button type="button" onClick={() => setLocationActive((value) => !value)} className={`flex w-full items-center justify-between border-b border-[#21002f]/10 p-6 text-left ${locationActive ? 'bg-[#e9fffc]' : 'bg-[#fff3e5]'}`}><span><span className="block text-[10px] font-black uppercase tracking-[.18em] text-[#21002f]/40">Ubicación</span><span className="mt-2 block text-sm font-black">{locationActive ? 'Ubicación activa' : 'Usar mi ubicación'}</span></span>{locationActive ? <Check className="h-5 w-5 text-[#00a99d]" /> : <Crosshair className="h-5 w-5 text-[#ff8f1f]" />}</button><div className="p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff8f1f]">Directorio real</p><p className="mt-3 text-sm leading-6 text-[#21002f]/55">Consultá especialidad, zona y disponibilidad en cada perfil.</p></div></aside>
              <div className="relative min-h-[560px] overflow-hidden bg-[#ddd9d3] sm:min-h-[650px]"><div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(33,0,47,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(33,0,47,.08)_1px,transparent_1px)] [background-size:46px_46px]" /><svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="none"><path d="M-40 145 C180 205 220 30 490 135 S805 235 1050 105" fill="none" stroke="#f8f6f2" strokeWidth="35" /><path d="M-20 560 C170 450 320 520 460 380 S770 260 1040 360" fill="none" stroke="#f8f6f2" strokeWidth="31" /><path d="M105 760 C135 520 320 390 265 -30" fill="none" stroke="#f8f6f2" strokeWidth="29" /><path d="M610 760 C550 560 705 430 650 -40" fill="none" stroke="#f8f6f2" strokeWidth="33" /></svg>{locationActive ? <span className="absolute left-1/2 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#00a99d] shadow-[0_0_0_28px_rgba(0,169,157,.12)]" /> : null}{visibleMarkers.map(([id,,x,y,Icon]) => <button key={id} type="button" aria-label="Seleccionar marcador demostrativo" onClick={() => setSelectedMarker(id)} className="absolute z-20 -translate-x-1/2 -translate-y-full" style={{left:`${x}%`,top:`${y}%`}}><span className={`grid h-12 w-12 rotate-45 place-items-center rounded-t-full rounded-br-full border-4 border-white shadow-[0_15px_30px_-12px_rgba(33,0,47,.7)] ${selectedMarker === id ? 'scale-110 bg-[#ff8f1f] text-[#21002f]' : 'bg-[#21002f] text-white'}`}><Icon className="h-5 w-5 -rotate-45" /></span></button>)}<div className="absolute bottom-5 left-5 z-30 flex items-center gap-2 border border-[#21002f]/10 bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-[.14em] text-[#21002f]/55 backdrop-blur"><MapPin className="h-3.5 w-3.5 text-[#ff8f1f]" />Vista demostrativa · sin datos personales</div></div>
            </div>
          </div>
        </section>

        <section className="bg-[#21002f] px-4 py-24 text-white sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto grid max-w-[1500px] border border-white/15 lg:grid-cols-[1.12fr_.88fr]">
            <div><header className="border-b border-white/15 p-7 sm:p-10 lg:p-14"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8f1f]">Por qué UrbanFix</p><h2 data-ufx-reveal className="ufx-reveal mt-8 text-5xl font-black uppercase leading-[.86] tracking-[-.065em] sm:text-7xl lg:text-8xl">Un encuentro que funciona bien.</h2><p className="mt-8 max-w-md text-sm leading-6 text-white/45">Cada beneficio se traduce en una herramienta concreta de la experiencia UrbanFix.</p></header><div className="border-b border-white/15 p-8 lg:hidden"><PhoneStage featureIndex={featureIndex} /></div>{features.map(([Icon,title,text],index) => <button key={title} type="button" onClick={() => setFeatureIndex(index)} className={`relative grid min-h-[240px] w-full grid-cols-[72px_1fr] border-b border-white/15 text-left sm:grid-cols-[96px_1fr] ${featureIndex === index ? 'bg-white/[.07]' : ''}`}><span className={`absolute inset-y-0 left-0 w-1 bg-[#ff8f1f] transition-transform ${featureIndex === index ? 'scale-y-100' : 'scale-y-0'}`} /><span className="flex justify-center border-r border-white/15 pt-8"><Icon className={`h-6 w-6 ${featureIndex === index ? 'text-[#ff8f1f]' : 'text-white/25'}`} /></span><span className="flex flex-col justify-end p-7 sm:p-9"><span className={`mb-auto text-xs font-black tracking-[.18em] ${featureIndex === index ? 'text-[#ff8f1f]' : 'text-white/30'}`}>0{index+1}</span><strong className="text-2xl font-black uppercase tracking-[-.04em] sm:text-3xl">{title}</strong><span className="mt-4 max-w-lg text-sm leading-6 text-white/55">{text}</span></span></button>)}</div>
            <aside className="relative hidden border-l border-white/15 lg:block"><div className="sticky top-16 grid min-h-[820px] place-items-center p-10"><PhoneStage featureIndex={featureIndex} /></div></aside>
          </div>
        </section>

        <section id="registro" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32"><div data-ufx-reveal className="ufx-reveal mx-auto max-w-[1500px] border border-[#21002f]/10 bg-[#ff8f1f]"><div className="grid lg:grid-cols-[1.35fr_.65fr]"><div className="border-b border-[#21002f]/15 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-14"><Sparkles className="h-7 w-7" /><h2 className="mt-12 text-6xl font-black uppercase leading-[.82] tracking-[-.075em] sm:text-8xl lg:text-9xl">Tu próximo paso empieza acá.</h2></div><div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12"><p className="max-w-sm text-sm leading-6 text-[#21002f]/60">Entrá al recorrido que corresponde a lo que necesitás resolver o al oficio que querés ofrecer.</p><div className="mt-16 space-y-px bg-[#21002f]/20"><Link href={CLIENT_REGISTER} className="flex items-center justify-between bg-[#21002f] p-5 text-sm font-black uppercase text-white"><span className="flex items-center gap-3"><Home className="h-5 w-5 text-[#ff8f1f]" />Soy vecino</span><ArrowUpRight className="h-5 w-5" /></Link><Link href={TECH_REGISTER} className="flex items-center justify-between bg-white p-5 text-sm font-black uppercase"><span className="flex items-center gap-3"><Wrench className="h-5 w-5 text-[#ff8f1f]" />Soy técnico</span><ArrowUpRight className="h-5 w-5" /></Link><Link href={LOGIN} className="flex items-center justify-between bg-[#ffead4] p-5 text-sm font-black uppercase">Ya tengo cuenta <ArrowRight className="h-5 w-5" /></Link></div></div></div></div></section>
      </main>

      <footer className="bg-[#170021] px-4 pb-5 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-[1500px] border border-white/15"><div className="grid lg:grid-cols-[1.35fr_.65fr]"><div className="border-b border-white/15 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-14"><Brand dark /><p className="mt-16 max-w-3xl text-4xl font-black uppercase leading-[.92] tracking-[-.055em] sm:text-6xl">Oficios y hogares conectados en un mismo lugar.</p></div><div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12"><nav aria-label="Navegación de pie" className="grid gap-px bg-white/15">{[['Qué es UrbanFix','/urbanfix'],['Ingresar',LOGIN],['Técnicos','/vidriera'],['Valores de oficio','/precios-mano-de-obra'],['Comunidad','/comunidad'],['Soporte','/soporte']].map(([label,href]) => <Link key={label} href={href} className="bg-[#170021] px-5 py-4 text-sm font-semibold uppercase tracking-[.08em] hover:bg-white/5">{label}</Link>)}</nav><Link href="#top" className="mt-16 flex items-center justify-between border-t border-white/15 pt-5 text-sm text-white/60">Volver arriba <ArrowUp className="h-4 w-4" /></Link></div></div><div className="flex flex-col gap-4 border-t border-white/15 px-7 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} UrbanFix. Todos los derechos reservados.</p><div className="flex gap-6"><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/eliminar-cuenta">Eliminar cuenta</Link></div></div></div></footer>

      <style jsx global>{`
        html{scroll-behavior:smooth}.ufx-reveal{opacity:0;transform:translate3d(0,28px,0);filter:blur(7px);transition:opacity .72s ease,transform .72s cubic-bezier(.22,1,.36,1),filter .72s ease}.ufx-reveal.is-visible{opacity:1;transform:none;filter:none}.ufx-ticker{animation:ufxTicker 28s linear infinite}.ufx-trade-image{animation:ufxTradeIn .8s cubic-bezier(.22,1,.36,1) both}.ufx-phone-3d{transform:perspective(1100px) rotateY(-7deg) rotateX(3deg);transform-style:preserve-3d;transition:transform .55s cubic-bezier(.22,1,.36,1)}.ufx-phone-3d:hover{transform:perspective(1100px) rotateY(2deg) rotateX(-1deg) translateY(-8px) scale(1.025)}.ufx-service-scroll{scrollbar-width:thin;scrollbar-color:#ff8f1f #f2f1ef}@keyframes ufxTicker{to{transform:translateX(-50%)}}@keyframes ufxTradeIn{from{opacity:0;transform:scale(.9) translateY(18px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.ufx-reveal,.ufx-reveal.is-visible{opacity:1;transform:none;filter:none;transition:none}.ufx-ticker,.ufx-trade-image{animation:none}.ufx-phone-3d,.ufx-phone-3d:hover{transform:none;transition:none}}
      `}</style>
    </div>
  );
}

function PhoneStage({ featureIndex }: { featureIndex: number }) {
  const [Icon, title, text] = features[featureIndex];
  return (
    <div className="relative mx-auto flex w-full max-w-[560px] flex-col items-center">
      <div className="absolute left-1/2 top-[42%] h-[60%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff8f1f]/20 blur-3xl" />
      <div className="ufx-phone-3d relative w-full"><Image src="/hero/home-scroll-phone.png" alt="Mockup de la aplicación UrbanFix abierta en celulares" width={844} height={849} sizes="(max-width:1024px) 86vw, 38vw" className="h-auto w-full drop-shadow-[0_45px_55px_rgba(0,0,0,.5)]" /></div>
      <div className="relative -mt-3 flex max-w-md items-start gap-3 border border-white/15 bg-[#170021]/90 p-4 backdrop-blur"><span className="grid h-10 w-10 shrink-0 place-items-center bg-[#ff8f1f] text-[#21002f]"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase text-[#ff8f1f]">{title}</p><p className="mt-1 text-xs leading-5 text-white/50">{text}</p></div></div>
    </div>
  );
}
