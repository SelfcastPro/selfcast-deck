const APIFY_BASE = "https://api.apify.com/v2";

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Build URL helper with token
export function apifyUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(APIFY_BASE + path);
  const token = requireEnv("APIFY_TOKEN");
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  return url.toString();
}
