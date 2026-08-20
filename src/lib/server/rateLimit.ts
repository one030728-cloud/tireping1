// In-memory sliding-window rate limiter.
//
// LIMITATION: state lives in this process's memory only. If this app ever runs
// as more than one instance (e.g. Render autoscaling, multiple dynos), each
// instance enforces its own limit independently — an attacker spread across N
// instances effectively gets N times the allowance. That's an accepted
// trade-off for now to avoid adding an external dependency (Redis etc.) for a
// platform-agnostic fix; if/when a shared store is introduced, swap it in by
// implementing the same record/isBlocked/reset shape as InMemorySlidingWindowLimiter
// below and constructing the limiter instances with it instead.

interface LimiterConfig {
  /** How far back failed attempts still count against the limit. */
  windowMs: number;
  /** Failed attempts allowed within `windowMs` before blocking. */
  max: number;
  /** How long a key stays blocked once it exceeds `max`. */
  blockMs: number;
}

interface KeyState {
  failureTimestamps: number[];
  blockedUntil: number;
}

export class InMemorySlidingWindowLimiter {
  private readonly store = new Map<string, KeyState>();

  constructor(private readonly config: LimiterConfig) {}

  /** True if `key` is currently locked out (call this before doing any expensive work). */
  isBlocked(key: string, now = Date.now()): boolean {
    const state = this.store.get(key);
    if (!state) return false;

    if (state.blockedUntil > now) return true;

    if (state.blockedUntil !== 0) {
      // Lockout expired: start the key fresh instead of leaving stale failures
      // around, so the next window isn't pre-loaded with old attempts.
      state.blockedUntil = 0;
      state.failureTimestamps = [];
    }
    return false;
  }

  /**
   * Record an attempt against `key`; blocks the key if it pushes the count over
   * `max`. For login, call this only on a failed attempt (reset() on success).
   * For signup flood protection, call this on every attempt regardless of
   * outcome — the thing being limited is submission volume, not failures.
   */
  record(key: string, now = Date.now()): void {
    let state = this.store.get(key);
    if (!state) {
      state = { failureTimestamps: [], blockedUntil: 0 };
      this.store.set(key, state);
    }

    this.prune(state, now);
    state.failureTimestamps.push(now);
    if (state.failureTimestamps.length > this.config.max) {
      state.blockedUntil = now + this.config.blockMs;
    }

    // Occasionally sweep stale entries so the map doesn't grow without bound
    // when many distinct keys (loginIds / IPs) are seen over time.
    if (Math.random() < 0.01) this.sweep(now);
  }

  /** Clear all tracked failures for `key` (call on a successful attempt). */
  reset(key: string): void {
    this.store.delete(key);
  }

  private prune(state: KeyState, now: number): void {
    const cutoff = now - this.config.windowMs;
    while (state.failureTimestamps.length > 0 && state.failureTimestamps[0] < cutoff) {
      state.failureTimestamps.shift();
    }
  }

  private sweep(now: number): void {
    for (const [key, state] of this.store) {
      this.prune(state, now);
      const idle = state.blockedUntil <= now && state.failureTimestamps.length === 0;
      if (idle) this.store.delete(key);
    }
  }
}

// Login brute-force protection: two independent axes, either one can block the
// attempt. loginId-scoped stops credential stuffing against one account;
// IP-scoped stops one source spraying attempts across many accounts.
export const loginIdLimiter = new InMemorySlidingWindowLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  blockMs: 10 * 60 * 1000,
});

export const loginIpLimiter = new InMemorySlidingWindowLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  blockMs: 15 * 60 * 1000,
});

// Signup flood protection: caps how many PENDING applications one source can
// create, independent of whether each individual submission is valid.
export const signupIpLimiter = new InMemorySlidingWindowLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  blockMs: 60 * 60 * 1000,
});
