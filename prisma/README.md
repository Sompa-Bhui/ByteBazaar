Prisma migration & seed instructions

1. Create your `.env` from `.env.example` and set `DATABASE_URL`.

2. Generate Prisma client and create migration (development):

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

3. Seed (local development):

If you don't have a DB yet, `prisma/seed-data.json` contains sample objects you can inspect.

To seed into a live DB (after `DATABASE_URL` set and `prisma generate`):

```bash
node prisma/seed.js
```

Notes:
- The seed script will write a preview and exit when `DATABASE_URL` is missing.
- Production migrations should be created with `pnpm prisma migrate deploy` in CI.
