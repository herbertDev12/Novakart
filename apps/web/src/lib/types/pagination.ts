export type Paginated<T> = {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type SearchParams = {
  page?: number;
  perPage?: number;
  sort?: string;
  q?: string;
};
