// Centralised Railway API base URL.
// To switch environments (e.g. staging), set VITE_AUDIT_API_URL in the environment
// or change the fallback string below — no other files need to be touched.
export const API_BASE_URL =
  import.meta.env.VITE_AUDIT_API_URL ??
  "https://auditron-server-production.up.railway.app";