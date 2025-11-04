// AsyncStorage shim that forwards to our SQLite-backed storage
// Ensures any library importing '@react-native-async-storage/async-storage'
// (like @instantdb/react-native) will use SQLite.

import { sqliteStorage, getStorageStats } from "./sqliteStorage";

// Mark for runtime diagnostics
const __backend = "sqlite-async-shim" as const;

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiSet(entries: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
  // marker for diagnostics (non-standard)
  __backend?: string;
  getStats?: () => ReturnType<typeof getStorageStats>;
};

const AsyncStorageShim: AsyncStorageLike = {
  async getItem(key) {
    return sqliteStorage.getItem(key);
  },
  async setItem(key, value) {
    return sqliteStorage.setItem(key, value);
  },
  async removeItem(key) {
    return sqliteStorage.removeItem(key);
  },
  async getAllKeys() {
    return sqliteStorage.getAllKeys();
  },
  async multiGet(keys) {
    return sqliteStorage.multiGet(keys);
  },
  async multiSet(entries) {
    return sqliteStorage.multiSet(entries);
  },
  async multiRemove(keys) {
    return sqliteStorage.multiRemove(keys);
  },
  async clear() {
    return sqliteStorage.clear();
  },
  __backend,
  getStats: getStorageStats,
};

export default AsyncStorageShim;
export { __backend as backendMarker, getStorageStats };
