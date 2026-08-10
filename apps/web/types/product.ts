export type Product = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  categoryId: string;
};

export type Category = {
  id: string;
  name: string;
};

export type ProductQuery = {
  query?: string;
  categoryId?: string;
};
