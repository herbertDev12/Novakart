import type { ApiError } from "@/lib/types/result";

export function ErrorState({ error }: { error: ApiError }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
