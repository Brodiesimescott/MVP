import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const poolConnection = mysql.createPool({
    host: "localhost",
    user: "root",
    database: "chaironQIDB",
    password:"VAWHzsNFXNRpy0ZH"
});

const db = drizzle(poolConnection);