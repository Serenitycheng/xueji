import {sqliteTable,text,integer,real,index} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('study_profiles',{userId:text('user_id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(0)});
export const secrets=sqliteTable('study_secrets',{userId:text('user_id').primaryKey(),cipher:text('cipher').notNull()});
export const calls=sqliteTable('study_ai_calls',{id:text('id').primaryKey(),userId:text('user_id').notNull(),month:text('month').notNull(),createdAt:text('created_at').notNull(),cost:real('cost').notNull().default(0),input:integer('input').notNull().default(0),output:integer('output').notNull().default(0),kind:text('kind').notNull(),result:text('result'),status:text('status').notNull()},t=>[index('idx_ai_user_month').on(t.userId,t.month)]);
export const locks=sqliteTable('study_ai_locks',{userId:text('user_id').primaryKey(),expires:integer('expires').notNull()});
