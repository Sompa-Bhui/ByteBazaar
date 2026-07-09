import type { Prisma } from '@prisma/client';
import { hasDatabaseUrl, prisma } from './prisma';
import seedData from '../../prisma/seed-data.json';

export type StorefrontProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  price: number;
  image: string;
  shortDesc?: string;
  categoryNames: string[];
};

export type StorefrontFilterOption = {
  label: string;
  value: string;
};

export type StorefrontSearchParams = {
  q?: string;
  category?: string;
  brand?: string;
  price?: string;
  sort?: string;
  page?: string;
};

export type StorefrontSearchResult = {
  products: StorefrontProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const PRODUCT_PAGE_SIZE = 12;

const DEFAULT_TECH_IMAGE = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80';

type SeedData = typeof seedData;
type SeedProduct = SeedData['products'][number] & { categoryNames?: string[]; image?: string };

const seedCategoriesById = new Map(seedData.categories.map((category) => [category.id, category]));
const seedBrandsById = new Map(seedData.brands.map((brand) => [brand.id, brand]));
const seedProductImagesByProductId = new Map<string, string>(
  seedData.productImages
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((image) => [image.productId, image.url]),
);
const seedCategoryLinksByProductId = new Map<string, string[]>();

for (const link of seedData.productCategories) {
  const category = seedCategoriesById.get(link.categoryId);
  if (!category) continue;
  const list = seedCategoryLinksByProductId.get(link.productId) ?? [];
  list.push(category.name);
  seedCategoryLinksByProductId.set(link.productId, list);
}

function mapSeedProduct(product: SeedProduct): StorefrontProduct {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: seedBrandsById.get(product.brandId)?.name ?? 'Independent',
    price: product.price,
    image: seedProductImagesByProductId.get(product.id) ?? DEFAULT_TECH_IMAGE,
    shortDesc: product.shortDesc ?? product.description ?? '',
    categoryNames: seedCategoryLinksByProductId.get(product.id) ?? [],
  };
}

function buildSeedProductWhere(params: StorefrontSearchParams) {
  const q = params.q?.trim().toLowerCase();
  const category = params.category?.trim().toLowerCase();
  const brand = params.brand?.trim().toLowerCase();
  const priceRange = parsePriceRange(params.price);

  return seedData.products
    .map((product) => mapSeedProduct(product))
    .filter((product) => {
      if (category && !seedCategoryLinksByProductId.get(product.id)?.some((categoryName) => category === categoryName.toLowerCase())) {
        return false;
      }

      if (brand) {
        const seedBrand = seedBrandsById.get(seedData.products.find((item) => item.id === product.id)?.brandId ?? '');
        if (!seedBrand || seedBrand.slug.toLowerCase() !== brand) return false;
      }

      if (q) {
        const haystack = [product.title, product.brand, product.shortDesc ?? '', ...product.categoryNames].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (priceRange) {
        if (priceRange.min !== undefined && product.price < priceRange.min) return false;
        if (priceRange.max !== undefined && product.price > priceRange.max) return false;
      }

      return true;
    });
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    images: true;
    categories: { include: { category: true } };
  };
}>;

function parsePriceRange(price?: string) {
  if (!price) return undefined;
  const [minText, maxText] = price.split('-').map((part) => part.trim());
  const min = Number.parseInt(minText, 10);
  const max = Number.parseInt(maxText, 10);
  const range: { min?: number; max?: number } = {};

  if (!Number.isNaN(min)) {
    range.min = min * 100;
  }

  if (!Number.isNaN(max)) {
    range.max = max * 100;
  }

  return range.min === undefined && range.max === undefined ? undefined : range;
}

function buildProductWhere(params: StorefrontSearchParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isPublished: true };
  const filters: Prisma.ProductWhereInput[] = [];

  if (params.category) {
    filters.push({ categories: { some: { category: { slug: params.category } } } });
  }

  if (params.brand) {
    filters.push({ brand: { slug: params.brand } });
  }

  if (params.q) {
    filters.push({
      OR: [
        { title: { contains: params.q, mode: 'insensitive' } },
        { shortDesc: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ],
    });
  }

  const priceRange = parsePriceRange(params.price);
  if (priceRange) {
    filters.push({
      price: {
        ...(priceRange.min !== undefined ? { gte: priceRange.min } : undefined),
        ...(priceRange.max !== undefined ? { lte: priceRange.max } : undefined),
      },
    });
  }

  if (filters.length) {
    where.AND = filters;
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'price-asc':
      return { price: 'asc' };
    case 'price-desc':
      return { price: 'desc' };
    case 'title-asc':
      return { title: 'asc' };
    case 'title-desc':
      return { title: 'desc' };
    case 'oldest':
      return { createdAt: 'asc' };
    default:
      return { createdAt: 'desc' };
  }
}

function mapProduct(item: ProductWithRelations): StorefrontProduct {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    brand: item.brand?.name ?? 'Independent',
    price: item.price,
    image:
      item.images?.[0]?.url ??
      DEFAULT_TECH_IMAGE,
    shortDesc: item.shortDesc ?? item.description ?? '',
    categoryNames: item.categories?.map((record) => record.category.name) ?? [],
  };
}

export async function getProductFilters() {
  if (!hasDatabaseUrl()) {
    return {
      brands: seedData.brands.map((brand) => ({ label: brand.name, value: brand.slug })),
      categories: seedData.categories.map((category) => ({ label: category.name, value: category.slug })),
    };
  }
  try {
    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return {
      brands: brands.map((brand) => ({ label: brand.name, value: brand.slug })),
      categories: categories.map((category) => ({ label: category.name, value: category.slug })),
    };
  } catch {
    return { brands: [], categories: [] };
  }
}

export async function searchProducts(params: StorefrontSearchParams) {
  if (!hasDatabaseUrl()) {
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
    const pageSize = PRODUCT_PAGE_SIZE;
    const products = buildSeedProductWhere(params);
    const total = products.length;
    const paginated = products.slice((page - 1) * pageSize, page * pageSize);

    return {
      products: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
  try {
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const pageSize = PRODUCT_PAGE_SIZE;
  const where = buildProductWhere(params);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { brand: true, images: true, categories: { include: { category: true } } },
      orderBy: buildOrderBy(params.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products: products.map(mapProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  } catch {
    return { products: [], total: 0, page: 1, pageSize: PRODUCT_PAGE_SIZE, totalPages: 1 };
  }
}

export async function getFeaturedProducts() {
  if (!hasDatabaseUrl()) return seedData.products.slice(0, 6).map((product) => mapSeedProduct(product)).map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    brand: product.brand,
    image: product.image,
    rating: 4.8,
  }));
  try {
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      include: { brand: true, images: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return products.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      brand: item.brand?.name ?? 'Workspace',
      image: item.images?.[0]?.url ?? DEFAULT_TECH_IMAGE,
      rating: 4.8,
    }));
  } catch {
    return [];
  }
}

export async function getCollections() {
  if (!hasDatabaseUrl()) {
    return seedData.categories.slice(0, 5).map((category) => ({
      title: category.name,
      description: category.description ?? 'Curated workspace setup',
      image: DEFAULT_TECH_IMAGE,
    }));
  }
  try {
    const collections = await prisma.collection.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    return collections.map((collection) => ({
      title: collection.name,
      description: collection.description ?? 'Curated workspace setup',
      image: DEFAULT_TECH_IMAGE,
    }));
  } catch {
    return [];
  }
}

export type StorefrontProductDetail = {
  id: string;
  title: string;
  slug: string;
  shortDesc?: string | null;
  description?: string | null;
  price: number;
  msrp?: number | null;
  brand?: { id: string; name: string; slug: string } | null;
  categories: { id: string; name: string; slug: string }[];
  images: { id: string; url: string; altText?: string | null; position: number }[];
  coverImageId?: string | null;
  variants: {
    id: string;
    title: string;
    sku?: string | null;
    price: number;
    compareAt?: number | null;
    attributes: Record<string, string> | null;
    inventory: { quantityOnHand: number } | null;
    images: { id: string; url: string; altText?: string | null }[];
    coverImageId?: string | null;
  }[];
};

export type StorefrontReview = {
  id: string;
  title?: string | null;
  body?: string | null;
  rating: number;
  createdAt: string;
  userName: string;
  verifiedPurchase: boolean;
};

export type StorefrontRelatedProduct = {
  id: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  brand: string;
};

export async function getProductBySlug(slug: string) {
  if (!hasDatabaseUrl()) return null;
  try {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      categories: { include: { category: true } },
      images: { orderBy: { position: 'asc' } },
      coverImage: true,
      variants: {
        include: {
          inventory: true,
          images: { orderBy: { position: 'asc' } },
        },
      },
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    shortDesc: product.shortDesc,
    description: product.description,
    price: product.price,
    msrp: product.msrp,
    brand: product.brand ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug } : null,
    categories: product.categories.map((record) => ({
      id: record.category.id,
      name: record.category.name,
      slug: record.category.slug,
    })),
    images: product.images.map((image) => ({ id: image.id, url: image.url, altText: image.altText, position: image.position })),
    coverImageId: product.coverImageId,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      compareAt: variant.compareAt,
      attributes: variant.attributes as Record<string, string> | null,
      inventory: variant.inventory ? { quantityOnHand: variant.inventory.quantityOnHand } : null,
      images: variant.images.map((image) => ({ id: image.id, url: image.url, altText: image.altText })),
      coverImageId: variant.coverImageId,
    })),
  };
  } catch {
    return null;
  }
}

export async function getProductReviewSummary(productId: string) {
  if (!hasDatabaseUrl()) return { reviewCount: 0, averageRating: 0 };
  try {
  const aggregate = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _count: { _all: true },
    _avg: { rating: true },
  });

  return {
    reviewCount: aggregate._count._all,
    averageRating: aggregate._avg.rating ?? 0,
  };
  } catch {
    return { reviewCount: 0, averageRating: 0 };
  }
}

export async function getProductReviews(productId: string, page = 1, pageSize = 4) {
  if (!hasDatabaseUrl()) return { reviews: [], total: 0, page: 1, pageSize, totalPages: 1 };
  try {
  const reviewPage = Math.max(1, page);
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: { productId, isApproved: true } }),
    prisma.review.findMany({
      where: { productId, isApproved: true },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip: (reviewPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const userIds = Array.from(new Set(reviews.map((review) => review.userId)));
  const verifiedOrders = await prisma.orderItem.findMany({
    where: {
      order: { userId: { in: userIds } },
      variant: { productId },
    },
    select: { order: { select: { userId: true } } },
  });
  const verifiedUserIds = new Set(verifiedOrders.map((item) => item.order.userId));

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      title: review.title,
      body: review.body,
      rating: review.rating,
      createdAt: review.createdAt.toISOString(),
      userName: review.user?.name ?? 'Customer',
      verifiedPurchase: review.verifiedPurchase || verifiedUserIds.has(review.userId),
    })),
    total,
    page: reviewPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  } catch {
    return { reviews: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }
}

export async function getRelatedProducts(productId: string, categorySlug?: string, brandSlug?: string) {
  if (!categorySlug && !brandSlug) return [];
  if (!hasDatabaseUrl()) return [];

  try {
  const related = await prisma.product.findMany({
    where: {
      id: { not: productId },
      isPublished: true,
      OR: [
        categorySlug ? { categories: { some: { category: { slug: categorySlug } } } } : undefined,
        brandSlug ? { brand: { slug: brandSlug } } : undefined,
      ].filter(Boolean) as Prisma.ProductWhereInput[],
    },
    include: { brand: true, images: true },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  });

  return related.map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price,
    image: product.images?.[0]?.url ?? DEFAULT_TECH_IMAGE,
    brand: product.brand?.name ?? 'Independent',
  }));
  } catch {
    return [];
  }
}

export async function getFrequentlyBoughtTogether(productId: string, limit = 4) {
  if (!hasDatabaseUrl()) return [];
  try {
  const purchasedTogether = await prisma.orderItem.findMany({
    where: {
      order: { items: { some: { variant: { productId } } } },
    },
    include: {
      variant: {
        include: {
          product: {
            include: { brand: true, images: true },
          },
        },
      },
    },
  });

  const counts = new Map<string, { count: number; product: StorefrontRelatedProduct }>();

  for (const item of purchasedTogether) {
    const otherProduct = item.variant.product;
    if (!otherProduct || otherProduct.id === productId) continue;
    const existing = counts.get(otherProduct.id);
    const productEntry = {
      id: otherProduct.id,
      title: otherProduct.title,
      slug: otherProduct.slug,
      price: otherProduct.price,
      image: otherProduct.images?.[0]?.url ?? DEFAULT_TECH_IMAGE,
      brand: otherProduct.brand?.name ?? 'Independent',
    };
    counts.set(otherProduct.id, { count: (existing?.count ?? 0) + 1, product: existing?.product ?? productEntry });
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.product);
  } catch {
    return [];
  }
}

export async function getProductsBySlugs(slugs: string[]) {
  if (!hasDatabaseUrl()) return [];
  try {
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isPublished: true },
    include: { brand: true, images: true },
  });

  const productsBySlug = new Map(products.map((product) => [product.slug, product]));

  return slugs
    .map((slug) => productsBySlug.get(slug))
    .filter((product): product is typeof products[0] => Boolean(product))
    .map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      image: product.images?.[0]?.url ?? DEFAULT_TECH_IMAGE,
      brand: product.brand?.name ?? 'Independent',
    }));
  } catch {
    return [];
  }
}
