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
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 2,
});

// Handle pool-level errors to prevent crashes
pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
  console.error("Connection will be retried automatically");
});

// Handle individual client errors
pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("PostgreSQL client error:", err.message);
  });
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

// Verify connection upon module load, but don't block startup on failure
verifyConnection().catch((err) => {
  console.error(
    "Initial database connection verification failed:",
    err.message,
  );
  console.log(
    "Application will continue, database operations may fail until connection is restored",
  );
});

// Export the pool to be used across the application.
export const db = drizzle(pool, { schema: schema });
