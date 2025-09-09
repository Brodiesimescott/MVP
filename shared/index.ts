import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import cron from "node-cron";
import * as schema from "./schema";

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 2,
});

/**
 * Asynchronously verifies the PostgreSQL connection.
 * Ensures that any issues are logged immediately at application startup.
 */
export async function verifyConnection(): Promise<void> {
  console.log("Testing database connection...");
  console.log("Host:", process.env.PGHOST);
  console.log("User:", process.env.PGUSER);
  console.log("Database:", process.env.PGDATABASE);
  console.log("Port:", process.env.PGPORT);
  try {
    // Attempt to acquire a client from the pool
    console.log("attempting connection");
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release(); // Release the client back to the pool
  } catch (error) {
    console.error("❌ Error connecting to the database:", error);
  }
}

// Immediately verify connection upon module load.
verifyConnection();

// Export the pool to be used across the application.
export const db = drizzle(pool, { schema: schema });
