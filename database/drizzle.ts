import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<ReturnType<typeof drizzle>> | null = null;

// Lazily open the SQLite database once and reuse the same Drizzle instance.
export async function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const sqlite = SQLite.openDatabaseSync('nomatora.db');
    return drizzle(sqlite);
  })();

  return dbPromise;
}