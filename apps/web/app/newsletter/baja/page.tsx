import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { adminSupabase as supabase } from '@/app/api/admin/_shared/auth';
import PublicTopNav from '@/components/PublicTopNav';
import { normalizeNewsletterEmail, verifyNewsletterUnsubscribeToken } from '@/lib/newsletter';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Baja de newsletter | UrbanFix',
  description: 'Gestiona la baja de novedades por correo de UrbanFix.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{
    email?: string | string[];
    token?: string | string[];
    user?: string | string[];
  }>;
};

const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

export default async function NewsletterUnsubscribePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const email = normalizeNewsletterEmail(Array.isArray(resolved.email) ? resolved.email[0] : resolved.email);
  const token = String(Array.isArray(resolved.token) ? resolved.token[0] : resolved.token || '').trim();
  const userId = String(Array.isArray(resolved.user) ? resolved.user[0] : resolved.user || '').trim();

  let title = 'No pudimos procesar la baja';
  let description = 'El enlace no es valido o ya no se puede verificar.';
  let toneClass = 'border-rose-300/35 bg-rose-500/10 text-rose-100';

  if (!supabase) {
    title = 'Falta configuracion del servidor';
    description = 'No se pudo conectar la gestion de newsletter en este momento.';
  } else if (!email || !token || !verifyNewsletterUnsubscribeToken(email, token, userId || null)) {
    title = 'Enlace de baja invalido';
    description = 'Pide un correo nuevo de UrbanFix y vuelve a intentarlo desde ese enlace.';
  } else {
    const payload = {
      newsletter_opt_in: false,
      newsletter_unsubscribed_at: new Date().toISOString(),
    };

    const scopedUpdate = userId
      ? supabase.from('profiles').update(payload).eq('id', userId).eq('email', email)
      : supabase.from('profiles').update(payload).eq('email', email);

    const { data, error } = await scopedUpdate.select('id');

    if (error) {
      if (isMissingColumnError(error, 'newsletter_opt_in') || isMissingColumnError(error, 'newsletter_unsubscribed_at')) {
        title = 'Falta la migracion de newsletter';
        description = 'La app todavia no tiene aplicadas las columnas de baja del newsletter.';
      } else {
        title = 'No pudimos registrar la baja';
        description = error.message || 'Intentalo nuevamente en unos minutos.';
      }
    } else if (!data?.length) {
      title = 'No encontramos ese suscriptor';
      description = 'Es posible que la cuenta ya no tenga perfil cargado o que el correo no coincida.';
    } else {
      title = 'Baja confirmada';
      description = 'Tu correo ya no recibira newsletters de UrbanFix hasta que vuelvas a suscribirte.';
      toneClass = 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100';
    }
  }

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav sticky />
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <section className={`rounded-3xl border p-8 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] ${toneClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-current/75">Newsletter UrbanFix</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/84">{description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#fff0dc]"
              >
                Volver al inicio
              </Link>
              <Link
                href="/contacto"
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Contacto
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
