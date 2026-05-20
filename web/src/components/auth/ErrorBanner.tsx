import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
