// Lightweight seed scaffold for ByteBazaar
// - If DATABASE_URL is not set, this writes `prisma/seed-data.json` (already present)
// - If DATABASE_URL is set and Prisma client is available, it will attempt to insert minimal data

const fs = require('fs');
const path = require('path');

const seedDataPath = path.join(__dirname, 'seed-data.json');
const hasDb = Boolean(process.env.DATABASE_URL);

async function run() {
  if (!hasDb) {
    console.log('No DATABASE_URL configured. Development seed data is available at prisma/seed-data.json');
    console.log('When a database is available, set DATABASE_URL and run this script to seed the DB.');
    const data = fs.readFileSync(seedDataPath, 'utf-8');
    console.log('Sample data preview:\n', data);
    return;
  }

  let PrismaClient;
  try {
    PrismaClient = require('@prisma/client').PrismaClient;
  } catch (e) {
    console.error('Could not load @prisma/client. Run `pnpm prisma generate` first.');
    return;
  }

  const prisma = new PrismaClient();
  const raw = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

  try {
    console.log('Seeding categories...');
    for (const c of raw.categories) {
      await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { id: c.id, name: c.name, slug: c.slug, description: c.description } });
    }

    console.log('Seeding brands...');
    for (const b of raw.brands) {
      await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: { id: b.id, name: b.name, slug: b.slug, website: b.website } });
    }

    console.log('Seeding products and variants...');
    for (const p of raw.products) {
      await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: { id: p.id, title: p.title, slug: p.slug, shortDesc: p.shortDesc, price: p.price, brandId: p.brandId } });
    }

    for (const v of raw.variants) {
      await prisma.productVariant.upsert({ where: { sku: v.sku }, update: {}, create: { id: v.id, productId: v.productId, title: v.title, sku: v.sku, price: v.price } });
    }

    console.log('Seed complete.');
  } catch (e) {
    console.error('Seeding failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
