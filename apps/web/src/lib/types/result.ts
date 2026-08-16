export type ApiError = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type Result<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
  error: null,
});
export const fail = (error: ApiError): Result<never> => ({
  success: false,
  data: null,
  error,
});
