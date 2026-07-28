import {
  AUGUST_2026_NEWSLETTER_CTA_LABEL,
  AUGUST_2026_NEWSLETTER_CTA_URL,
  AUGUST_2026_NEWSLETTER_INTRO,
  AUGUST_2026_NEWSLETTER_PARAGRAPHS,
  AUGUST_2026_NEWSLETTER_PREVIEW,
  AUGUST_2026_NEWSLETTER_QUICK_LINKS,
  AUGUST_2026_NEWSLETTER_TITLE,
} from '@/lib/newsletter-august-2026';
import { buildNewsletterPreviewHtml } from '@/lib/newsletter-preview';

export const dynamic = 'force-dynamic';

export function GET() {
  const html = buildNewsletterPreviewHtml({
    title: AUGUST_2026_NEWSLETTER_TITLE,
    previewText: AUGUST_2026_NEWSLETTER_PREVIEW,
    intro: AUGUST_2026_NEWSLETTER_INTRO,
    paragraphs: AUGUST_2026_NEWSLETTER_PARAGRAPHS,
    ctaLabel: AUGUST_2026_NEWSLETTER_CTA_LABEL,
    ctaUrl: AUGUST_2026_NEWSLETTER_CTA_URL,
    quickLinks: AUGUST_2026_NEWSLETTER_QUICK_LINKS,
    unsubscribeUrl: 'https://www.urbanfix.com.ar/newsletter/baja?preview=1',
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
