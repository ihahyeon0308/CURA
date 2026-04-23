import { Injectable, OnModuleInit } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PostgresService } from "./postgres.service";

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(private readonly postgres: PostgresService) {}

  async onModuleInit(): Promise<void> {
    const autoMigrate = (process.env.AUTO_MIGRATE ?? "true").toLowerCase() === "true";

    if (!autoMigrate) {
      return;
    }

    const migrationPath = path.resolve(process.cwd(), "libs/database/migrations/0001_init.sql");
    const seedPath = path.resolve(process.cwd(), "libs/database/seeds/0001_seed.sql");
    const migrationSql = await readFile(migrationPath, "utf8");

    await this.postgres.query(migrationSql);

    const countResult = await this.postgres.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM hospitals");
    const hasHospitals = Number(countResult.rows[0]?.count ?? "0") > 0;

    if (hasHospitals) {
      return;
    }

    const seedSql = await readFile(seedPath, "utf8");
    await this.postgres.query(seedSql);
  }
}
