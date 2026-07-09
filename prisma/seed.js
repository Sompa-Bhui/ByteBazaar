const fs = require('fs');
const path = require('path');

async function main() {
  const seedPath = path.join(__dirname, 'seed-data.json');
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL is missing. Seed data is available in prisma/seed-data.json.');
    return;
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    for (const category of raw.categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
        },
        create: category,
      });
    }

    for (const brand of raw.brands) {
      await prisma.brand.upsert({
        where: { slug: brand.slug },
        update: {
          name: brand.name,
          website: brand.website,
        },
        create: brand,
      });
    }

    for (const product of raw.products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          title: product.title,
          shortDesc: product.shortDesc,
          description: product.description,
          price: product.price,
          brandId: product.brandId,
          isPublished: product.isPublished,
        },
        create: product,
      });
    }

    for (const link of raw.productCategories) {
      await prisma.productCategory.upsert({
        where: { id: link.id },
        update: {
          productId: link.productId,
          categoryId: link.categoryId,
        },
        create: link,
      });
    }

    for (const image of raw.productImages) {
      await prisma.productImage.upsert({
        where: { id: image.id },
        update: {
          productId: image.productId,
          url: image.url,
          altText: image.altText,
          position: image.position,
        },
        create: image,
      });
    }

    for (const variant of raw.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: variant.productId,
          title: variant.title,
          price: variant.price,
        },
        create: {
          id: variant.id,
          productId: variant.productId,
          title: variant.title,
          sku: variant.sku,
          price: variant.price,
        },
      });
    }

    for (const inventory of raw.inventories) {
      await prisma.inventory.upsert({
        where: { variantId: inventory.variantId },
        update: {
          sku: inventory.sku,
          quantityOnHand: inventory.quantityOnHand,
          safetyStock: inventory.safetyStock,
          location: inventory.location,
        },
        create: inventory,
      });
    }

    console.log('Seed complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
