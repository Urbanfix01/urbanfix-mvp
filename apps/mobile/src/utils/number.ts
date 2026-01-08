export const formatCurrency = (value: number, locale = 'es-AR') => {
  const safeNumber = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(safeNumber);
  } catch (_err) {
    const n = Math.round(safeNumber);
    return n
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
};
