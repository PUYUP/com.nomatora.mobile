import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';
// @ts-ignore
import migrations from '../drizzle/migrations';

export async function runMigrations() {
  const sqlite = await SQLite.openDatabaseAsync('nomatora.db');

  const db = drizzle(sqlite);

  await migrate(db, migrations);
}