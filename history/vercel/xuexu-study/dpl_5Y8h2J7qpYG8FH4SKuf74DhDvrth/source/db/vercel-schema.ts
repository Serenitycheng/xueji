import {pgTable,text,integer,doublePrecision,bigint,index} from 'drizzle-orm/pg-core';
export const profiles=pgTable('study_profiles',{userId:text('user_id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(0)});
export const secrets=pgTable('study_secrets',{userId:text('user_id').primaryKey(),cipher:text('cipher').notNull()});
export const calls=pgTable('study_ai_calls',{id:text('id').primaryKey(),userId:text('user_id').notNull(),month:text('month').notNull(),createdAt:text('created_at').notNull(),cost:doublePrecision('cost').notNull().default(0),input:integer('input').notNull().default(0),output:integer('output').notNull().default(0),kind:text('kind').notNull(),result:text('result'),status:text('status').notNull()},t=>[index('idx_ai_user_month').on(t.userId,t.month)]);
export const locks=pgTable('study_ai_locks',{userId:text('user_id').primaryKey(),expires:bigint('expires',{mode:'number'}).notNull()});
export const loginAttempts=pgTable('study_login_attempts',{id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expires:bigint('expires',{mode:'number'}).notNull()});
