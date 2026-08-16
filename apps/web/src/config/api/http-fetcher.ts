import "server-only";
import { getLocale } from "next-intl/server";
import { ok, fail, type Result } from "@/lib/types/result";
import { RETRY, TERMINAL_STATUSES, RETRYABLE_STATUSES } from "./retry";
import { toApiError, toNetworkError } from "./errors";

type FetcherOptions = RequestInit & {
  next?: { tags?: string[]; revalidate?: number | false };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function httpFetcher<T>(
  url: string,
  options: FetcherOptions = {},
): Promise<Result<T>> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", await getLocale());

  for (let attempt = 0; attempt <= RETRY.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });

      if (response.ok) {
        return ok((await response.json()) as T);
      }

      if (TERMINAL_STATUSES.has(response.status)) {
        return fail(await toApiError(response));
      }

      if (
        attempt < RETRY.maxAttempts &&
        RETRYABLE_STATUSES.has(response.status)
      ) {
        await sleep(RETRY.baseDelayMs * RETRY.multiplier ** attempt);
        continue;
      }

      return fail(await toApiError(response));
    } catch (cause) {
      if (attempt >= RETRY.maxAttempts) {
        return fail(toNetworkError(cause));
      }
      await sleep(RETRY.baseDelayMs * RETRY.multiplier ** attempt);
    }
  }

  return fail({ status: 0, code: "UNKNOWN", message: "Unreachable" });
}
