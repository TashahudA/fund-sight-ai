/**
 * Sanitize a file name for Supabase Storage.
 * Keeps only letters, numbers, hyphens, underscores, and dots.
 * Replaces spaces with underscores and strips everything else.
 */
export function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : "";

  const sanitized = base
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");

  return (sanitized || "file") + ext.toLowerCase();
}
