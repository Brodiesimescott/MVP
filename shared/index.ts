import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import * as schema from "./schema";
import * as fs from "fs";

async function createGoogleCloudSQLPool(): Promise<Pool> {
  console.log("Configuring Google Cloud SQL connection...");
  
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "/tmp/gcp_service_account.json";
  if (!fs.existsSync(serviceAccountPath) && process.env.GCP_SERVICE_ACCOUNT_KEY) {
    fs.writeFileSync(serviceAccountPath, process.env.GCP_SERVICE_ACCOUNT_KEY);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
  }

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.GCP_INSTANCE_CONNECTION_NAME!,
    ipType: IpAddressTypes.PUBLIC,
  });

  return new Pool({
    ...clientOpts,
    user: process.env.GCP_DATABASE_USER,
    password: process.env.GCP_DATABASE_PASSWORD,
    database: process.env.GCP_DATABASE_NAME,
    max: 10,
    min: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
}

function createReplitPool(): Pool {
  console.log("Using Replit PostgreSQL connection...");
  return new Pool({
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
}

async function createDatabasePool(): Promise<Pool> {
  const useGoogleCloudSQL = process.env.GCP_INSTANCE_CONNECTION_NAME;

  if (useGoogleCloudSQL) {
    try {
      const pool = await createGoogleCloudSQLPool();
      console.log("✅ Google Cloud SQL pool created successfully");
      return pool;
    } catch (error: any) {
      console.error("⚠️ Failed to connect to Google Cloud SQL:", error.message);
      console.log("⚠️ Falling back to Replit PostgreSQL...");
      return createReplitPool();
    }
  }

  return createReplitPool();
}

const pool = await createDatabasePool();

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
  console.error("Connection will be retried automatically");
});

pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("PostgreSQL client error:", err.message);
  });
});

export async function verifyConnection(): Promise<void> {
  console.log("Testing database connection...");
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (error) {
    console.error("❌ Error connecting to the database:", error);
  }
}

verifyConnection().catch((err) => {
  console.error(
    "Initial database connection verification failed:",
    err.message,
  );
  console.log(
    "Application will continue, database operations may fail until connection is restored",
  );
});

export const db = drizzle(pool, { schema: schema });
