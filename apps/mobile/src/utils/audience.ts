import AsyncStorage from '@react-native-async-storage/async-storage';

export type MobileAudience = 'tecnico' | 'cliente';

const AUDIENCE_STORAGE_KEY = 'urbanfix.mobile.audience';

const isValidAudience = (value: string | null): value is MobileAudience =>
  value === 'tecnico' || value === 'cliente';

export const getStoredAudience = async (): Promise<MobileAudience | null> => {
  try {
    const raw = await AsyncStorage.getItem(AUDIENCE_STORAGE_KEY);
    return isValidAudience(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const setStoredAudience = async (audience: MobileAudience) => {
  try {
    await AsyncStorage.setItem(AUDIENCE_STORAGE_KEY, audience);
  } catch {
    // Non-blocking storage helper.
  }
};

