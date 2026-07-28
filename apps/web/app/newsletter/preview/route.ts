import { buildNewsletterPreviewHtml } from '@/lib/newsletter-preview';

export const dynamic = 'force-dynamic';

export function GET() {
  const html = buildNewsletterPreviewHtml({
    title: 'Valores de mano de obra actualizados',
    previewText: 'Base de precios UrbanFix actualizada para Julio / Agosto 2026.',
    intro: 'Base de precios para tecnicos y presupuestos UrbanFix.',
    paragraphs: [
      'Hola, Elias. Este es un envio de prueba antes de notificar a todos los tecnicos registrados.',
      'Actualizamos la base de mano de obra UrbanFix correspondiente a Julio / Agosto 2026.',
      'Esta actualizacion ayuda a presupuestar con valores mas cercanos al mercado y mantener las cotizaciones al dia.',
      'Si el contenido se ve correcto, despues podemos ejecutar el envio general a los tecnicos registrados.',
    ],
    ctaLabel: 'Ver valores actualizados',
    ctaUrl: 'https://www.urbanfix.com.ar/tecnicos?tab=precios',
    quickLinks: [{ label: 'Crear presupuesto', url: 'https://www.urbanfix.com.ar/tecnicos?tab=presupuestos' }],
    unsubscribeUrl: 'https://www.urbanfix.com.ar/newsletter/baja?preview=1',
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
