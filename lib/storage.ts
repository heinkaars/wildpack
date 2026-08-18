import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  entries: 'wildpack.lifelist.entries',
  profile: 'wildpack.lifelist.profile',
  streak: 'wildpack.lifelist.streak',
  lastActivityDate: 'wildpack.lifelist.lastActivityDate',
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  keys: KEYS,
  readJson,
  writeJson,
};
