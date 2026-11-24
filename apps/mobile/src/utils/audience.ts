import AsyncStorage from '@react-native-async-storage/async-storage';

export type MobileAudience = 'tecnico' | 'cliente';

const AUDIENCE_STORAGE_KEY = 'urbanfix.mobile.audience';
const ownerPreferences = new Map<string, MobileAudience>();
let signInIntent: MobileAudience | null = null;
const ownerKey = (owner: string) => `${AUDIENCE_STORAGE_KEY}:${encodeURIComponent(owner)}`;

const isValidAudience = (value: string | null): value is MobileAudience =>
  value === 'tecnico' || value === 'cliente';

export const getStoredAudience = async (owner?: string): Promise<MobileAudience | null> => {
  if (owner && ownerPreferences.has(owner)) return ownerPreferences.get(owner)!;
  try {
    const raw = await AsyncStorage.getItem(owner ? ownerKey(owner) : AUDIENCE_STORAGE_KEY);
    return isValidAudience(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const setStoredAudience = async (audience: MobileAudience, owner?: string) => {
  if (owner) ownerPreferences.set(owner, audience);
  try {
    await AsyncStorage.setItem(owner ? ownerKey(owner) : AUDIENCE_STORAGE_KEY, audience);
  } catch {
    // Non-blocking storage helper.
  }
};

export const beginAudienceSignIn = async (audience: MobileAudience) => {
  signInIntent = audience;
  await setStoredAudience(audience);
};
export const cancelAudienceSignIn = () => { signInIntent = null; };
export const claimAudienceSignIn = (owner: string) => {
  const audience = signInIntent;
  signInIntent = null;
  if (audience) void setStoredAudience(audience, owner);
};

