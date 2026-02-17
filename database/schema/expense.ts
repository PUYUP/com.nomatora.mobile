import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const expenses = sqliteTable('expenses', {
    id: text('id').primaryKey(),
    
    placeName: text('place_name'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    
    status: text('status')
        .notNull()
        .$type<'draft' | 'published'>()
        .default('draft'),
        
    note: text('note'),

    currency: text('currency').default('USD'),
    totalAmount: real('total_amount').default(0),

    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),

    syncStatus: text('sync_status')
        .notNull()
        .$type<'pending' | 'synced' | 'failed' | 'syncing'>()
        .default('pending'),

    deletedAt: integer('deleted_at')
});