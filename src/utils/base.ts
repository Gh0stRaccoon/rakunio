/**
 * Utility function to prepend the base URL for static assets and links.
 * Works seamlessly with Astro's import.meta.env.BASE_URL (e.g. '/rakunio/').
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
}
