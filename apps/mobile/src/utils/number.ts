const parseLocaleNumber = (value: string) => {
  const trimmed = value.replace(/\s+/g, '').trim();
  if (!trimmed) return 0;

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');
  let normalized = trimmed;

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3) {
      normalized = parts.join('');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNumber = (value: number | string) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') return parseLocaleNumber(value);
  return 0;
};

export const formatCurrency = (value: number | string, locale = 'es-AR') => {
  const safeNumber = toNumber(value);
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(safeNumber);
  } catch (_err) {
    const n = Math.round(safeNumber);
    return n
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
};
