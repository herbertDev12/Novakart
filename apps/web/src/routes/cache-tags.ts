export const CacheTags = {
  products: {
    list: "products:list",
    byId: (id: string) => `products:${id}`,
  },
  categories: {
    list: "categories:list",
    byId: (id: string) => `categories:${id}`,
  },
} as const;
