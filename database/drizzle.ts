import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

let _db: ReturnType<typeof drizzle>;

export async function getDB() {
  if (_db) return _db;

  const sqlite = await SQLite.openDatabaseAsync('nomatora.db');

  _db = drizzle(sqlite);
  return _db;
}