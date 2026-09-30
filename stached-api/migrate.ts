// Applies stached-api/migrations/*.sql in filename order, each exactly once
// and each in its own transaction, recording what ran in schema_migrations.
// A shipped migration is never edited: add a new, higher-numbered file.
// The server runs this on boot; `bun --env-file=… migrate.ts` runs it alone.
import { readdirSync } from "node:fs";
import { sql } from "bun";

const DIR = new URL("./migrations/", import.meta.url);

export async function migrate() {
  await sql`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )`;
  const applied = new Set(
    (await sql`select version from schema_migrations`).map(
      (row: { version: string }) => row.version,
    ),
  );
  const files = readdirSync(DIR)
    .filter((file) => /^\d{4}_[\w-]+\.sql$/.test(file))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await Bun.file(new URL(file, DIR)).text();
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into schema_migrations (version) values (${file})`;
    });
    console.log(`Applied migration ${file}`);
  }
}

if (import.meta.main) {
  await migrate();
  await sql.close();
}
