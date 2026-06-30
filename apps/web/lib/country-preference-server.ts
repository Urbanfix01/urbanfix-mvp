import { cookies } from 'next/headers';

import { USER_COUNTRY_COOKIE_KEY, normalizeCountryPreference } from './country-preference';
import { DEFAULT_COUNTRY_NAME } from './location-catalog';

const decodeCookieValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getServerCountryPreference = async () => {
  const cookieStore = await cookies();
  const rawCountry = cookieStore.get(USER_COUNTRY_COOKIE_KEY)?.value || '';
  return normalizeCountryPreference(decodeCookieValue(rawCountry)) || DEFAULT_COUNTRY_NAME;
};
