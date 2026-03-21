import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import {
  buildAdminClientRequestTicketHref,
  buildAdminClientRequestZoneHref,
  type AdminClientRequestRecord,
} from '../../../lib/client-requests-share';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

type RequestRow = {
  id: string;
  title: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  urgency: string | null;
  mode: string | null;
  status: string | null;
  preferred_window: string | null;
  target_technician_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const toText = (value: unknown) => String(value || '').trim();

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR');
};

const formatUrgencyLabel = (value: string | null | undefined) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'alta') return 'Alta';
  if (normalized === 'baja') return 'Baja';
  return 'Media';
};

const formatStatusLabel = (value: string | null | undefined) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'matched') return 'Matcheada';
  if (normalized === 'quoted') return 'Cotizada';
  if (normalized === 'direct_sent') return 'Directa enviada';
  if (normalized === 'selected') return 'Tecnico elegido';
  if (normalized === 'scheduled') return 'Agendada';
  if (normalized === 'in_progress') return 'En curso';
  if (normalized === 'completed') return 'Completada';
  if (normalized === 'cancelled') return 'Cancelada';
  return 'Publicada';
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const buildRequestRecord = (row: RequestRow): AdminClientRequestRecord => ({
  id: String(row.id || ''),
  title: toText(row.title) || 'Solicitud UrbanFix',
  category: toText(row.category) || 'General',
  address: toText(row.address),
  city: toText(row.city) || null,
  description: toText(row.description),
  urgency: toText(row.urgency) || 'media',
  mode: toText(row.mode) || 'marketplace',
  status: toText(row.status) || 'published',
  preferredWindow: toText(row.preferred_window) || null,
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || row.created_at || ''),
  targetTechnicianName: toText(row.target_technician_name) || null,
});

const loadRequest = async (id: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('client_requests')
    .select('id,title,category,address,city,description,urgency,mode,status,preferred_window,target_technician_name,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return buildRequestRecord(data as RequestRow);
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolved = await params;
  const requestId = toText(resolved?.id);
  const request = requestId ? await loadRequest(requestId) : null;

  if (!request) {
    return {
      title: 'Ticket de trabajo | UrbanFix',
      description: 'Detalle de solicitud en UrbanFix.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${request.title} | Ticket de trabajo | UrbanFix`;
  const description = `${request.category} en ${request.city || 'tu zona'}. ${request.description}`.slice(0, 160);

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: buildAdminClientRequestTicketHref(request),
    },
    openGraph: {
      title,
      description,
      url: buildAdminClientRequestTicketHref(request),
      siteName: 'UrbanFix',
      type: 'article',
    },
  };
}

export default async function ClientRequestTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const request = await loadRequest(toText(resolved?.id));

  if (!request) {
    notFound();
  }

  const zoneHref = buildAdminClientRequestZoneHref(request);
  const ticketHref = buildAdminClientRequestTicketHref(request);

  return (
    <div className={sora.className}>
      <main className="min-h-screen bg-[#21002f] text-white">
        <PublicTopNav sticky />
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-[34px] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.9)] sm:p-8">
            <p className="inline-flex rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
              Ticket de trabajo
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl">{request.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
              {request.category} | {request.city || 'Sin ciudad'} | {request.address}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/84">
                Estado: {formatStatusLabel(request.status)}
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/84">
                Urgencia: {formatUrgencyLabel(request.urgency)}
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/84">
                Modo: {request.mode === 'direct' ? 'Asignacion directa' : 'Marketplace'}
              </span>
              {request.preferredWindow && (
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/84">
                  Franja: {request.preferredWindow}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={zoneHref}
                className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
              >
                Ver tecnicos de la zona
              </Link>
              <a
                href={ticketHref}
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Link del ticket
              </a>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[30px] border border-white/12 bg-black/20 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Descripcion</p>
              <p className="mt-4 text-sm leading-8 text-white/82 sm:text-base">{request.description}</p>
            </article>

            <aside className="space-y-6">
              <article className="rounded-[30px] border border-white/12 bg-black/20 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Resumen</p>
                <div className="mt-4 space-y-3 text-sm text-white/82">
                  <div>
                    <p className="text-white/55">Trabajo</p>
                    <p className="mt-1 font-semibold text-white">{request.title}</p>
                  </div>
                  <div>
                    <p className="text-white/55">Rubro</p>
                    <p className="mt-1 font-semibold text-white">{request.category}</p>
                  </div>
                  <div>
                    <p className="text-white/55">Zona</p>
                    <p className="mt-1 font-semibold text-white">{request.city || 'Sin ciudad'}</p>
                  </div>
                  <div>
                    <p className="text-white/55">Direccion</p>
                    <p className="mt-1 font-semibold text-white">{request.address}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[30px] border border-white/12 bg-black/20 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Seguimiento</p>
                <div className="mt-4 space-y-3 text-sm text-white/82">
                  <p>
                    <span className="text-white/55">Creada:</span> <span className="font-semibold text-white">{formatDateTime(request.createdAt)}</span>
                  </p>
                  <p>
                    <span className="text-white/55">Actualizada:</span>{' '}
                    <span className="font-semibold text-white">{formatDateTime(request.updatedAt)}</span>
                  </p>
                  {request.targetTechnicianName && (
                    <p>
                      <span className="text-white/55">Tecnico objetivo:</span>{' '}
                      <span className="font-semibold text-white">{request.targetTechnicianName}</span>
                    </p>
                  )}
                </div>
              </article>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
