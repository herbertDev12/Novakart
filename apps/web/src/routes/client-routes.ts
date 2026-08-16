export const clientRoutes = {
  storefront: {
    home: "/",
    category: (slug: string) => `/c/${slug}`,
    product: (slug: string) => `/p/${slug}`,
    search: `/search`,
  },
} as const;
