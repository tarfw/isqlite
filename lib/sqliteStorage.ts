// Use legacy API to ensure openDatabase is available on current Expo SDK
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

// Minimal AsyncStorage-like KV backed by SQLite
// Methods: getItem, setItem, removeItem, getAllKeys, multiGet, multiSet, multiRemove, clear
// Values are stored as strings (JSON strings are fine)

type SQLResult = {
  rows: { _array: any[]; length: number };
};

type DB = SQLite.WebSQLDatabase;

const DB_NAME = "instant_kv.db";
const TABLE_SQL =
  "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT)";

function openKvDb(): DB {
  // On web, expo-sqlite may not be available; callers should avoid using this on web
  return SQLite.openDatabase(DB_NAME);
}

function runSQL<T = SQLResult>(
  db: DB,
  sql: string,
  params: any[] = []
): Promise<T> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_tx, res) => resolve(res as unknown as T),
          (_tx, err) => {
            reject(err);
            return true;
          }
        );
      },
      (err) => reject(err)
    );
  });
}

let dbPromise: Promise<DB> | null = null;
async function getKvDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = new Promise<DB>((resolve, reject) => {
      try {
        const db = openKvDb();
        db.transaction(
          (tx) => {
            tx.executeSql(TABLE_SQL);
          },
          (err) => reject(err),
          () => resolve(db)
        );
      } catch (e) {
        reject(e);
      }
    });
  }
  return dbPromise;
}

/* diagnostics removed */
const stats = {
  getItem: 0,
  setItem: 0,
  removeItem: 0,
  getAllKeys: 0,
  multiGet: 0,
  multiSet: 0,
  multiRemove: 0,
  clear: 0,
};

function getStorageStats() {
  return { ...stats };
}

// storageBackend removed

async function debugPeekRaw_REMOVED(key: string): Promise<string | null> {
  const db = await getKvDb();
  const res = (await runSQL<SQLResult>(db, "SELECT value FROM kv WHERE key = ?", [
    key,
  ])) as SQLResult;
  const rows = res?.rows?._array ?? [];
  return rows.length ? (rows[0]?.value as string) ?? null : null;
}

async function debugWriteRaw_REMOVED(key: string, value: string): Promise<void> {
  const db = await getKvDb();
  await runSQL(db, "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [
    key,
    value,
  ]);
}

export const sqliteStorage = {
  // Avoid use on web; InstantDB should fall back to default storage there
  isSupported: () => Platform.OS !== "web",

  async getItem(key: string): Promise<string | null> {
    stats.getItem++;
    const db = await getKvDb();
    const res = (await runSQL<SQLResult>(db, "SELECT value FROM kv WHERE key = ?", [
      key,
    ])) as SQLResult;
    const rows = res?.rows?._array ?? [];
    return rows.length ? (rows[0]?.value as string) ?? null : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    stats.setItem++;
    const db = await getKvDb();
    await runSQL(db, "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [
      key,
      value,
    ]);
  },

  async removeItem(key: string): Promise<void> {
    stats.removeItem++;
    const db = await getKvDb();
    await runSQL(db, "DELETE FROM kv WHERE key = ?", [key]);
  },

  async getAllKeys(): Promise<string[]> {
    stats.getAllKeys++;
    const db = await getKvDb();
    const res = (await runSQL<SQLResult>(db, "SELECT key FROM kv")) as SQLResult;
    const rows = res?.rows?._array ?? [];
    return rows.map((r: any) => r.key as string);
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    stats.multiGet++;
    if (!keys.length) return [];
    const db = await getKvDb();
    const placeholders = keys.map(() => "?").join(",");
    const res = (await runSQL<SQLResult>(
      db,
      `SELECT key, value FROM kv WHERE key IN (${placeholders})`,
      keys
    )) as SQLResult;
    const map = new Map<string, string | null>();
    for (const row of res?.rows?._array ?? []) {
      map.set(row.key as string, (row.value as string) ?? null);
    }
    return keys.map((k) => [k, map.get(k) ?? null]);
  },

  async multiSet(entries: [string, string][]): Promise<void> {
    stats.multiSet++;
    if (!entries.length) return;
    const db = await getKvDb();
    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          for (const [k, v] of entries) {
            tx.executeSql("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", [k, v]);
          }
        },
        (err) => reject(err),
        () => resolve()
      );
    });
  },

  async multiRemove(keys: string[]): Promise<void> {
    stats.multiRemove++;
    if (!keys.length) return;
    const db = await getKvDb();
    const placeholders = keys.map(() => "?").join(",");
    await runSQL(db, `DELETE FROM kv WHERE key IN (${placeholders})`, keys);
  },

  async clear(): Promise<void> {
    stats.clear++;
    const db = await getKvDb();
    await runSQL(db, "DELETE FROM kv");
  },
};
