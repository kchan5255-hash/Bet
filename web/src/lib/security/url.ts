function normalizeAppUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getAppUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return normalizeAppUrl(configured);
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("Missing APP_URL");
}

export function sanitizeNextPath(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const parsed = new URL(value, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAppUrl(pathname: string): string {
  return new URL(pathname, `${getAppUrl()}/`).toString();
}

export function buildAuthCallbackUrl(next = "/account"): string {
  const safeNext = sanitizeNextPath(next);
  return buildAppUrl(`/auth/callback?next=${encodeURIComponent(safeNext)}`);
}
