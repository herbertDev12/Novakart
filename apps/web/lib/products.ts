import type { Product, Category, ProductQuery } from "@/types/product";
import { products, categories } from "./mock/mock-products";

export async function getProducts({
  query,
  categoryId,
}: ProductQuery): Promise<Product[]> {
  let result = products;
  if (categoryId) result = result.filter((p) => p.categoryId === categoryId);
  if (query)
    result = result.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()),
    );
  return result;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  return categories;
}
