import "dotenv/config";
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL;
const isNeon = dbUrl.includes("neon.tech");

let poolInstance: any;
let dbInstance: any;

if (isNeon) {
  neonConfig.webSocketConstructor = ws;
  poolInstance = new NeonPool({ connectionString: dbUrl });
  dbInstance = drizzleNeon({ client: poolInstance, schema });
} else {
  poolInstance = new pg.Pool({ connectionString: dbUrl });
  dbInstance = drizzlePg({ client: poolInstance, schema });
}

export const pool = poolInstance;
export const db = dbInstance;
