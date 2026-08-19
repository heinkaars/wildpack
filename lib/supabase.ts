import 'react-native-get-random-values';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient, SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env, then restart the dev server.',
  );
}

/**
 * Expo pre-renders web pages in Node, where `Platform.OS` still reports 'web'
 * but there is no `window` for AsyncStorage to read. Nothing is signed in
 * during a server render, so hand the client a store that always comes up empty.
 */
const isServerRender = typeof window === 'undefined';

const noopStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

/**
 * The device keychain rejects values much over 2KB and a Supabase session can
 * exceed that, so values are split across numbered keys with a small header
 * recording the chunk count. Web has no keychain and falls back to AsyncStorage.
 */
const CHUNK_SIZE = 1800;

const chunkedSecureStore: SupportedStorage = {
  getItem: async (key) => {
    const header = await SecureStore.getItemAsync(key);
    if (header === null) return null;

    const count = Number(header);
    if (!Number.isInteger(count) || count < 1) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    // A partially written value is unusable; treat it as absent.
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },

  setItem: async (key, value) => {
    await chunkedSecureStore.removeItem(key);

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
    await SecureStore.setItemAsync(key, String(chunks.length));
  },

  removeItem: async (key) => {
    const header = await SecureStore.getItemAsync(key);
    const count = Number(header);
    if (Number.isInteger(count) && count > 0) {
      await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
      );
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isServerRender ? noopStorage : Platform.OS === 'web' ? AsyncStorage : chunkedSecureStore,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    // Only a real browser can receive a session in the page URL.
    detectSessionInUrl: !isServerRender && Platform.OS === 'web',
  },
});

// Refresh tokens only while the app is actually on screen.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
