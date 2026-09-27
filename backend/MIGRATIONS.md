# Database Migrations — READ BEFORE TOUCHING PRODUCTION

## ⚠️ `document_chunks` is NOT in `schema.prisma`

The `document_chunks` table (pgvector-backed, with an HNSW index for RAG
similarity search) is created and altered entirely through **raw SQL** in
`prisma/migrations/`. It is intentionally **not** declared as a `model` in
`schema.prisma`, because Prisma's support for the `vector` column type and
`hnsw` index type is limited/unsupported in the schema DSL.

This has one critical consequence:

> **Prisma does not know `document_chunks` exists.**

Any Prisma command that reconciles the database against `schema.prisma`
will treat `document_chunks` as drift it doesn't recognize — and depending
on the command, that can mean **silently dropping the table** or **failing
to recreate it**.

## Commands you must NEVER run against production

- ❌ `prisma db push` — diffs the DB directly against `schema.prisma` and
  will attempt to make the DB match the schema, which does not include
  `document_chunks`. This can drop the table and its HNSW index outright.
- ❌ `prisma migrate reset` — drops the entire database and replays
  migration history from scratch based on Prisma's own bookkeeping. Do not
  run this against production under any circumstance.
- ❌ `prisma migrate dev` — intended for local development only; it can
  generate a new migration by diffing against `schema.prisma`, which again
  does not "see" `document_chunks`, risking an unintended drop/recreate
  migration being generated and applied.

## The only safe way to apply migrations in production

- ✅ `npm run prisma:migrate:deploy` (`prisma migrate deploy`)

  This applies the existing, already-written migration files in
  `prisma/migrations/` **in order**, without diffing against
  `schema.prisma` and without generating new migrations. It is the only
  Prisma command that is safe to run unattended against a production
  database in this project.

## If you ever need to change `document_chunks`

Write the raw SQL migration by hand (following the pattern in
`prisma/migrations/20260925120000_phase11_rag/migration.sql`), place it in
a new `prisma/migrations/<timestamp>_<name>/migration.sql` folder, and
apply it with `prisma migrate deploy`. Do not attempt to model the table
in `schema.prisma` — doing so risks Prisma "taking ownership" of the table
and altering it unexpectedly on a future `db push` or `migrate dev`.

## Summary

| Command                       | Safe in production? |
|--------------------------------|----------------------|
| `prisma migrate deploy`        | ✅ Yes — the only one |
| `prisma db push`               | ❌ No — can drop `document_chunks` |
| `prisma migrate reset`         | ❌ No — wipes the database |
| `prisma migrate dev`           | ❌ No — dev-only, can misdiff |
