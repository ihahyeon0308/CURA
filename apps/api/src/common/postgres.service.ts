import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import { Pool } from "pg";

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/cura",
    });
  }

  query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
