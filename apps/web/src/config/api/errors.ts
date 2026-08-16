import type { ApiError } from "@/lib/types/result";

export async function toApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    code: body?.code ?? "UNKNOWN_ERROR",
    message: body?.message ?? response.statusText,
    details: body?.details,
  };
}

export function toNetworkError(cause: unknown): ApiError {
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: cause instanceof Error ? cause.message : "Network request failed",
  };
}
