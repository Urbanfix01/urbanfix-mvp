'use client';

import { useEffect, useState, type ElementType } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  Eye,
  FilePlus,
  FileText,
  Globe2,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Search,
  Settings,
  Store,
  Tag,
  User,
  UserRound,
} from 'lucide-react';

import PublicTopNav from '../PublicTopNav';
import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';
import CommunityFeed from './CommunityFeed';

type AccountMode = 'public' | 'tecnico' | 'cliente';

type SidebarProfile = {
  label: string;
  subtitle: string;
  logoUrl: string;
};

type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: ElementType<{ className?: string }>;
};

const technicianNavItems: SidebarItem[] = [
  { key: 'lobby', label: 'Panel de control', href: '/tecnicos?tab=lobby', icon: Home },
  { key: 'operativo', label: 'Mapa operativo', href: '/tecnicos?tab=operativo', icon: Search },
  { key: 'presupuestos', label: 'Presupuestos', href: '/tecnicos?tab=presupuestos', icon: FileText },
  { key: 'visualizador', label: 'Visualizador', href: '/tecnicos?tab=visualizador', icon: Eye },
  { key: 'agenda', label: 'Agenda', href: '/tecnicos?tab=agenda', icon: Calendar },
  { key: 'notificaciones', label: 'Notificaciones', href: '/tecnicos?tab=notificaciones', icon: Bell },
  { key: 'soporte', label: 'Soporte', href: '/tecnicos?tab=soporte', icon: MessageCircle },
  { key: 'historial', label: 'Facturacion', href: '/tecnicos?tab=historial', icon: Clock },
  { key: 'perfil', label: 'Perfil', href: '/tecnicos?tab=perfil', icon: User },
  { key: 'precios', label: 'Precios', href: '/tecnicos?tab=precios', icon: Tag },
  { key: 'community', label: 'Comunidad', href: '/comunidad', icon: Globe2 },
];

const clientNavItems: SidebarItem[] = [
  { key: 'request', label: 'Solicitud', href: '/cliente?view=request', icon: FilePlus },
  { key: 'prices', label: 'Valores', href: '/cliente?view=precios', icon: Tag },
  { key: 'map', label: 'Mapa', href: '/cliente?view=map', icon: MapPin },
  { key: 'messages', label: 'Mensajes', href: '/cliente?view=messages', icon: MessageCircle },
  { key: 'showcase', label: 'Tecnicos', href: '/cliente?view=showcase', icon: Store },
  { key: 'community', label: 'Comunidad', href: '/comunidad', icon: Globe2 },
  { key: 'profile', label: 'Perfil', href: '/cliente?view=profile', icon: User },
];

const publicNavItems: SidebarItem[] = [
  { key: 'community', label: 'Muro', href: '/comunidad', icon: MessageCircle },
  { key: 'technicians', label: 'Tecnicos', href: '/vidriera', icon: Store },
  { key: 'prices', label: 'Valores', href: '/rubros', icon: Tag },
  { key: 'login', label: 'Ingresar', href: '/tecnicos', icon: UserRound },
  { key: 'home', label: 'Inicio', href: '/', icon: Home },
];

export default function CommunityShell() {
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);
  const [accountMode, setAccountMode] = useState<AccountMode>('public');
  const [sidebarProfile, setSidebarProfile] = useState<SidebarProfile>({
    label: 'Muro UrbanFix',
    subtitle: 'Comunidad',
    logoUrl: '',
  });

  useEffect(() => {
    let cancelled = false;

    if (!hasSupabaseConfig) return;

    const applySession = async (nextSession: any) => {
      const user = nextSession?.user || null;

      if (!user) {
        if (!cancelled) {
          setAccountMode('public');
          setSidebarProfile({
            label: 'Muro UrbanFix',
            subtitle: 'Comunidad',
            logoUrl: '',
          });
        }
        return;
      }

      const metadata = user.user_metadata || {};
      const userType = String(metadata.user_type || metadata.profile || '').toLowerCase();
      const nextMode: AccountMode = userType === 'cliente' ? 'cliente' : 'tecnico';
      const fallbackLabel =
        String(metadata.business_name || metadata.full_name || user.email || '').trim() ||
        (nextMode === 'cliente' ? 'Cuenta cliente' : 'Cuenta tecnica');

      if (!cancelled) {
        setAccountMode(nextMode);
        setSidebarProfile({
          label: fallbackLabel,
          subtitle: nextMode === 'cliente' ? 'Panel cliente' : 'Panel tecnico',
          logoUrl: '',
        });
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name,business_name,company_logo_url,avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (!cancelled && data) {
        const profileLabel =
          String(data.business_name || data.full_name || '').trim() || fallbackLabel;
        setSidebarProfile({
          label: profileLabel,
          subtitle: nextMode === 'cliente' ? 'Panel cliente' : 'Panel tecnico',
          logoUrl: String(data.company_logo_url || data.avatar_url || '').trim(),
        });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const navItems =
    accountMode === 'cliente'
      ? clientNavItems
      : accountMode === 'tecnico'
        ? technicianNavItems
        : publicNavItems;

  const panelMenuLabel =
    accountMode === 'cliente' ? 'Panel cliente' : accountMode === 'tecnico' ? 'Panel tecnico' : 'Comunidad';
  const settingsHref = accountMode === 'cliente' ? '/cliente?view=profile' : '/tecnicos?tab=perfil';
  const sidebarInitial = sidebarProfile.label.charAt(0).toUpperCase() || 'U';

  const topMenuItems = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    active: item.key === 'community',
    badge: null,
    icon: item.icon,
    onSelect: () => {
      window.location.href = item.href;
    },
  }));

  const handleLogout = async () => {
    if (hasSupabaseConfig) {
      await supabase.auth.signOut();
    }
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-slate-950">
      <PublicTopNav
        activeHref="/comunidad"
        sticky
        panelMenuLabel={panelMenuLabel}
        panelMenuItems={topMenuItems}
      />

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#ebe8df_0%,#f7f6f1_44%,#e9edf0_100%)]">
        <div className="absolute left-0 top-0 bottom-0 hidden w-[74px] bg-[linear-gradient(180deg,#17031f_0%,#250331_48%,#13021a_100%)] lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(42,3,56,0.10)_0%,rgba(42,3,56,0.04)_12%,rgba(255,255,255,0)_34%)]" />

        <aside
          aria-label={panelMenuLabel}
          onMouseEnter={() => setIsDesktopNavExpanded(true)}
          onMouseLeave={() => setIsDesktopNavExpanded(false)}
          className={`fixed left-0 top-[57px] z-40 hidden h-[calc(100vh-57px)] overflow-hidden border-r border-white/[0.08] bg-[linear-gradient(180deg,#17031f_0%,#250331_48%,#13021a_100%)] shadow-[14px_0_44px_-42px_rgba(0,0,0,0.9),inset_-1px_0_0_rgba(255,255,255,0.05)] transition-[width] duration-300 lg:flex ${
            isDesktopNavExpanded ? 'w-[222px]' : 'w-[74px]'
          }`}
        >
          <div className="flex h-full w-full flex-col">
            <div className={isDesktopNavExpanded ? 'px-3 pb-2 pt-4' : 'px-2 pb-2 pt-4'}>
              <div
                className={`flex items-center ${
                  isDesktopNavExpanded ? 'gap-3 rounded-[18px] px-2.5 py-2' : 'h-10 w-10 justify-center rounded-[14px]'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[#ffcf93]/25 bg-[#ff8f1f] text-sm font-black text-[#2a0338] shadow-[0_14px_28px_-22px_rgba(255,143,31,0.9)]">
                  {sidebarProfile.logoUrl ? (
                    <img src={sidebarProfile.logoUrl} alt={sidebarProfile.label} className="h-full w-full object-cover" />
                  ) : (
                    sidebarInitial
                  )}
                </span>
                {isDesktopNavExpanded && (
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{sidebarProfile.label}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-white/[0.42]">{sidebarProfile.subtitle}</p>
                  </div>
                )}
              </div>
            </div>

            <nav className={`flex-1 overflow-y-auto ${isDesktopNavExpanded ? 'px-2.5 py-2' : 'px-2 py-2'}`}>
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === 'community';
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      title={!isDesktopNavExpanded ? item.label : undefined}
                      className={`group relative flex items-center transition duration-200 ${
                        isDesktopNavExpanded
                          ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                          : 'h-10 w-10 justify-center rounded-[14px]'
                      } ${
                        isActive
                          ? 'bg-white/[0.075] text-white'
                          : 'text-white/[0.58] hover:bg-white/[0.055] hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#ff8f1f]" />
                      )}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition ${
                          isActive
                            ? 'text-[#ff9c1a]'
                            : 'bg-white/[0.055] text-white/[0.68] group-hover:bg-white/[0.09] group-hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{item.label}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            </nav>

            <div className={`${isDesktopNavExpanded ? 'px-2.5 pb-3 pt-2.5' : 'px-2 pb-3 pt-2.5'} border-t border-white/[0.08]`}>
              <div className="flex flex-col gap-0.5">
                {accountMode !== 'public' ? (
                  <>
                    <a
                      href={settingsHref}
                      title={!isDesktopNavExpanded ? 'Configuracion' : undefined}
                      className={`group relative flex items-center text-white/[0.76] transition hover:bg-white/[0.075] hover:text-white ${
                        isDesktopNavExpanded
                          ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                          : 'h-10 w-10 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.055] text-white/[0.68] transition group-hover:bg-white/[0.09] group-hover:text-white">
                        <Settings className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Configuracion</span>
                      )}
                    </a>

                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Cerrar sesion' : undefined}
                      onClick={handleLogout}
                      className={`group relative flex items-center text-white/[0.82] transition hover:bg-[#ff8f1f]/[0.12] hover:text-white ${
                        isDesktopNavExpanded
                          ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                          : 'h-10 w-10 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_24px_-18px_rgba(255,140,26,0.9)] transition group-hover:brightness-105">
                        <LogOut className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Cerrar sesion</span>
                      )}
                    </button>
                  </>
                ) : (
                  <a
                    href="/tecnicos"
                    title={!isDesktopNavExpanded ? 'Ingresar' : undefined}
                    className={`group relative flex items-center text-white/[0.82] transition hover:bg-[#ff8f1f]/[0.12] hover:text-white ${
                      isDesktopNavExpanded
                        ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                        : 'h-10 w-10 justify-center rounded-[14px]'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_24px_-18px_rgba(255,140,26,0.9)] transition group-hover:brightness-105">
                      <UserRound className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && (
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Ingresar</span>
                    )}
                  </a>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="relative px-0 pb-10 pt-0 lg:pl-[74px]">
          <CommunityFeed />
        </div>
      </div>
    </main>
  );
}
