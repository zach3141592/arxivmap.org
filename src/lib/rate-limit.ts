const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;  // per window

export function rateLimit(userId: string): { ok: boolean } {
  const now = Date.now();
  const timestamps = requests.get(userId) ?? [];

  // Drop entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requests.set(userId, recent);
    return { ok: false };
  }

  recent.push(now);
  requests.set(userId, recent);
  return { ok: true };
}
