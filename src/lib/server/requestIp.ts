// Render (and most PaaS reverse proxies) sit in front of this app and forward the
// original client address via `x-forwarded-for`. That header is a comma-separated
// hop list; every entry except the one appended by the proxy closest to this
// process can be set by the client or by any untrusted intermediary. Only the
// *last* entry is safe to trust — never the first.
export function getClientIp(headers: Headers | Record<string, unknown> | null | undefined): string {
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const lastHop = hops[hops.length - 1];
    if (lastHop) return lastHop;
  }

  const realIp = readHeader(headers, "x-real-ip");
  if (realIp) return realIp.trim();

  // No proxy header at all (e.g. local dev) — bucket every such request together
  // rather than skipping rate limiting entirely.
  return "unknown";
}

function readHeader(
  headers: Headers | Record<string, unknown> | null | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const value = (headers as Record<string, unknown>)[name];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
}
