import { Pool } from "pg";

declare global {
  var __curaWebPool__: Pool | undefined;
}

const pool =
  globalThis.__curaWebPool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/cura",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__curaWebPool__ = pool;
}

export { pool };
