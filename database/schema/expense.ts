import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const expenses = sqliteTable('expenses', {
    id: text('id').primaryKey(),
    
    place_name: text('place_name'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    
    status: text('status')
        .notNull()
        .$type<'draft' | 'publish'>()
        .default('draft'),
        
    note: text('note'),

    currency: text('currency').default('USD'),
    total_amount: real('total_amount').default(0),

    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),

    sync_status: text('sync_status')
        .notNull()
        .$type<'pending' | 'synced' | 'failed' | 'syncing'>()
        .default('pending'),

    deleted_at: integer('deleted_at')
});