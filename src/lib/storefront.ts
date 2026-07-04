import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

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
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    shortDesc: item.shortDesc ?? item.description ?? '',
    categoryNames: item.categories?.map((record) => record.category.name) ?? [],
  };
}

export async function getProductFilters() {
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
      image: item.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      rating: 4.8,
    }));
  } catch {
    return [];
  }
}

export async function getCollections() {
  try {
    const collections = await prisma.collection.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    return collections.map((collection) => ({
      title: collection.name,
      description: collection.description ?? 'Curated workspace setup',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
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
  try {
  const aggregate = await prisma.review.aggregate({
    where: { productId },
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
  try {
  const reviewPage = Math.max(1, page);
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: { productId } }),
    prisma.review.findMany({
      where: { productId },
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
      verifiedPurchase: verifiedUserIds.has(review.userId),
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
    image: product.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    brand: product.brand?.name ?? 'Independent',
  }));
  } catch {
    return [];
  }
}

export async function getFrequentlyBoughtTogether(productId: string, limit = 4) {
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
      image: otherProduct.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
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
      image: product.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      brand: product.brand?.name ?? 'Independent',
    }));
  } catch {
    return [];
  }
}
