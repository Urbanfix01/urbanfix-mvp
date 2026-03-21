export type NewsletterPreviewQuickLink = {
  label: string;
  url: string;
};

export const getNewsletterPreviewBaseUrl = () => 'https://www.urbanfix.com.ar';

export const normalizeNewsletterPreviewUrl = (value: string | null | undefined) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    if (raw.startsWith('/')) {
      return `${getNewsletterPreviewBaseUrl()}${raw}`;
    }

    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

export const buildNewsletterPreviewBodyText = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildNewsletterPreviewHtml = (params: {
  title: string;
  previewText?: string | null;
  intro?: string | null;
  paragraphs: string[];
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  quickLinks?: NewsletterPreviewQuickLink[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
}) => {
  const title = escapeHtml(params.title);
  const previewText = escapeHtml(String(params.previewText || '').trim());
  const intro = escapeHtml(String(params.intro || '').trim());
  const heroImageUrl = normalizeNewsletterPreviewUrl(params.heroImageUrl);
  const heroImageAlt = escapeHtml(String(params.heroImageAlt || params.title || 'UrbanFix').trim());
  const quickLinks = (params.quickLinks || []).filter((item) => item.label && item.url);
  const ctaLabel = String(params.ctaLabel || '').trim();
  const ctaUrl = normalizeNewsletterPreviewUrl(params.ctaUrl);

  const paragraphsHtml = params.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#f3e9ff;">${escapeHtml(paragraph)}</p>`
    )
    .join('');

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
          <tr>
            <td style="border-radius:999px;background:#ff8f1f;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#2a0338;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
            </td>
          </tr>
        </table>`
      : '';

  const heroImageHtml = heroImageUrl
    ? `<tr>
        <td style="padding:0 32px 8px;">
          <img src="${escapeHtml(heroImageUrl)}" alt="${heroImageAlt}" style="display:block;width:100%;height:auto;border-radius:24px;border:1px solid rgba(255,255,255,0.12);" />
        </td>
      </tr>`
    : '';

  const quickLinksHtml = quickLinks.length
    ? `<div style="margin:28px 0 0;">
         <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#ffd6a6;">Enlaces directos</p>
         ${quickLinks
           .map(
             (item) =>
               `<a href="${escapeHtml(item.url)}" style="display:block;margin:0 0 10px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);text-decoration:none;">
                  <span style="display:block;font-size:15px;font-weight:700;line-height:1.5;color:#ffffff;">${escapeHtml(item.label)}</span>
                  <span style="display:block;margin-top:4px;font-size:12px;line-height:1.5;color:#d8c8e6;">${escapeHtml(item.url)}</span>
                </a>`
           )
           .join('')}
       </div>`
    : '';

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#180022;font-family:Arial,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#180022;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;border:1px solid rgba(255,255,255,0.12);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#2c083c 0%,#240432 100%);box-shadow:0 24px 80px rgba(0,0,0,0.35);">
              <tr>
                <td style="padding:32px 32px 12px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#ffd6a6;">UrbanFix newsletter</p>
                  <h1 style="margin:0;font-size:34px;line-height:1.08;color:#ffffff;">${title}</h1>
                </td>
              </tr>
              ${heroImageHtml}
              <tr>
                <td style="padding:12px 32px 8px;">
                  ${
                    intro
                      ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#ffffff;">${intro}</p>`
                      : ''
                  }
                  ${paragraphsHtml}
                  ${ctaHtml}
                  ${quickLinksHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:24px 32px 32px;">
                  <div style="height:1px;background:rgba(255,255,255,0.12);margin-bottom:16px;"></div>
                  <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#d8c8e6;">
                    Recibiste este correo por tu relacion con UrbanFix.
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#d8c8e6;">
                    Si no quieres seguir recibiendo novedades,
                    <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#ffd6a6;text-decoration:underline;">darte de baja aqui</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};
