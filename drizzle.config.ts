import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './database/schema',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'durable-sqlite',
});