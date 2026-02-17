import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
// @ts-ignore
import migrations from '../drizzle/migrations';
import { getDB } from './drizzle';

let migrationPromise: Promise<void> | null = null;

// Ensure migrations run only once and reuse the shared database instance.
export async function runMigrations() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const db = await getDB();
    await migrate(db, migrations);
  })();

  return migrationPromise;
}