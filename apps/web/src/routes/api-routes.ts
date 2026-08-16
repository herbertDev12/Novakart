const base = process.env.API_URL;

export const apiRoutes = {
  products: {
    list: `${base}/products`,
    create: `${base}/products`,
    byId: (id: string) => `${base}/products/${id}`,
    update: (id: string) => `${base}/products/${id}`,
    delete: (id: string) => `${base}/products/${id}`,
  },
  categories: {
    list: `${base}/categories`,
    create: `${base}/categories`,
    byId: (id: string) => `${base}/categories/${id}`,
    update: (id: string) => `${base}/categories/${id}`,
    delete: (id: string) => `${base}/categories/${id}`,
  },
} as const;
