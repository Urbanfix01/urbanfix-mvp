export type NewsletterWhatsappQuickLink = {
  label: string;
  url: string;
};

const getNewsletterWhatsappBaseUrl = () => 'https://www.urbanfix.com.ar';

export const normalizeNewsletterWhatsappUrl = (value: string | null | undefined) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    if (raw.startsWith('/')) {
      return `${getNewsletterWhatsappBaseUrl()}${raw}`;
    }

    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const splitParagraphs = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const collapseWhitespace = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

export const buildNewsletterWhatsappCopy = (params: {
  subject?: string | null;
  introText?: string | null;
  bodyText?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  quickLinks?: NewsletterWhatsappQuickLink[];
}) => {
  const lines: string[] = [];
  const subject = collapseWhitespace(params.subject);
  const introText = collapseWhitespace(params.introText);
  const bodyParagraphs = splitParagraphs(params.bodyText).slice(0, 3).map(collapseWhitespace).filter(Boolean);
  const ctaLabel = collapseWhitespace(params.ctaLabel);
  const ctaUrl = normalizeNewsletterWhatsappUrl(params.ctaUrl);
  const quickLinks = (params.quickLinks || [])
    .map((link) => ({
      label: collapseWhitespace(link.label),
      url: normalizeNewsletterWhatsappUrl(link.url),
    }))
    .filter((link) => link.label && link.url);

  if (subject) {
    lines.push(`*${subject}*`, '');
  }

  if (introText) {
    lines.push(introText, '');
  }

  bodyParagraphs.forEach((paragraph) => {
    lines.push(paragraph, '');
  });

  if (ctaLabel && ctaUrl) {
    lines.push(`*${ctaLabel}*`, ctaUrl, '');
  }

  if (quickLinks.length) {
    lines.push('*Links directos*');
    quickLinks.forEach((link) => {
      lines.push(`${link.label}: ${link.url}`);
    });
  }

  return lines.join('\n').trim();
};
