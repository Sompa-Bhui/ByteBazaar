# ByteBazaar — Developer Workspace Marketplace

Developer-focused premium marketplace for complete desk setups.

Milestone 1: Project scaffold with Next.js 15, TypeScript, Tailwind, Prisma, Clerk, Cloudinary.

Setup (local):

1. Copy environment variables:

```bash
cp .env.example .env
# Fill in values
```

2. Install dependencies (using pnpm recommended):

```bash
pnpm install
pnpm run dev
```

3. Prisma:

```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
```

Files created: root configs, `src/app` layout, basic components, Prisma schema, README.
