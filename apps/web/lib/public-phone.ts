import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

import { getCountryCode } from './location-catalog';

const toDigits = (value: string) => value.replace(/\D/g, '');

const normalizeExplicitInternationalPrefix = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('00')) {
    return `+${toDigits(trimmed.slice(2))}`;
  }
  return trimmed;
};

const normalizeLegacyArgentinaMobile = (value: string) => {
  let digits = toDigits(value);
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 11 && digits.slice(2, 4) === '15') {
    digits = `${digits.slice(0, 2)}${digits.slice(4)}`;
  }
  return digits.length >= 8 ? `54${digits}` : '';
};

export const normalizePublicWhatsappPhone = (
  phone: string | null | undefined,
  country: string | null | undefined
) => {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  const normalizedInput = normalizeExplicitInternationalPrefix(raw);
  const countryCode = getCountryCode(country).toUpperCase() as CountryCode;
  const parsed = parsePhoneNumberFromString(
    normalizedInput,
    normalizedInput.startsWith('+') ? undefined : countryCode
  );

  if (parsed?.isPossible()) {
    return toDigits(parsed.number);
  }

  if (countryCode === 'AR') {
    return normalizeLegacyArgentinaMobile(raw);
  }

  return '';
};

export const buildPublicWhatsappHref = (
  phone: string | null | undefined,
  country: string | null | undefined
) => {
  const normalizedPhone = normalizePublicWhatsappPhone(phone, country);
  return normalizedPhone ? `https://wa.me/${normalizedPhone}` : '';
};
