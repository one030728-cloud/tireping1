import type { NextConfig } from "next";

// Security response headers.
//
// API shape verified against the bundled docs before writing this (this Next
// version has breaking changes vs. training data, per AGENTS.md):
//   node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md
//   node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
// `headers()` is an async function returning `{ source, headers: [{ key, value }] }[]`,
// same shape as legacy Next.js. `source: "/(.*)"` applies to every route.

const isProduction = process.env.NODE_ENV === "production";

// --- Content-Security-Policy -------------------------------------------
//
// This app loads the Toss Payments SDK (@tosspayments/tosspayments-sdk) for
// the checkout flow at /orders/pay. Inspecting the installed package
// (node_modules/@tosspayments/tosspayments-sdk/dist/index.esm.js) shows that
// the npm package itself does NOT embed the payment UI: `loadTossPayments()`
// just injects a single <script src="https://js.tosspayments.com/v2/standard">
// tag (see `SCRIPT_URL` in that file) and calls the global it exposes. That
// remote script is fetched fresh from Toss's CDN at runtime and is not
// present anywhere in this repository, so its actual behavior (which
// additional script/frame/connect origins it in turn loads for card
// input, 3-D Secure/ARS popups, bank-app deep links, etc.) cannot be
// determined by reading the package - only https://js.tosspayments.com
// itself is confirmed from evidence gathered here.
//
// Guessing at the rest of the Toss origin list and shipping it as an
// enforcing policy risks silently breaking the payment flow, which is worse
// than shipping no CSP at all - a buyer who can't complete checkout because
// of a wrong `frame-src`/`connect-src` value has no visible error to act on.
// So this ships as `Content-Security-Policy-Report-Only`: browsers evaluate
// it and log violations without blocking anything, so it can be observed
// against a real Toss test payment and tightened into an enforcing
// `Content-Security-Policy` once that's verified. This could not be done in
// this change (no Toss credentials or browser session available here).
//
// - `js.tosspayments.com` is allowed for scripts and (conservatively) frames,
//   based on the evidence above.
// - `api.tosspayments.com` is only ever called from the server
//   (src/app/api/payments/toss/*/route.ts), never from the browser, so it is
//   intentionally left out of `connect-src`.
// - `img-src` allows `https:` broadly (in addition to `'self'` and `data:`)
//   because listing photos are served from an operator-configured
//   `S3_PUBLIC_BASE_URL` (Cloudflare R2 or any CDN, see README) that is not
//   knowable at config-authoring time and can differ per deployment.
// - `style-src`/`script-src` allow `'unsafe-inline'` because Tailwind v4 and
//   Next's inline runtime bootstrap script both rely on it; adopting nonces
//   would require dynamic rendering everywhere (see the CSP guide above) and
//   is out of scope for this pass.
// - `'unsafe-eval'` is added only in development, matching the documented
//   guidance that React's dev-mode error reconstruction needs it and that
//   neither React nor Next.js need it in production.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.tosspayments.com${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://js.tosspayments.com",
  "frame-src 'self' https://js.tosspayments.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
];
const contentSecurityPolicy = cspDirectives.join("; ");

const securityHeaders = [
  // HSTS only makes sense once the app is actually served over HTTPS in
  // production (Render terminates TLS in front of it); sending it in local
  // dev over plain http:// would just be ignored by browsers but there's no
  // reason to emit it there at all.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Superseded by CSP's `frame-ancestors 'none'` above in modern browsers,
  // but kept for older browsers that don't support that CSP directive -
  // clickjacking on top of the payment flow is worth the belt-and-suspenders.
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Strict-but-not-silent: same-origin navigations still get the full path,
  // cross-origin ones only get the origin, and nothing is sent over plain
  // http. Avoids leaking order/listing IDs in the URL path to third parties
  // (e.g. via an outbound link on a product page) while not breaking
  // same-origin analytics/referrer checks.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Deny every browser feature this app doesn't use. Left off the deny list:
  // `payment`, since the Toss Payments checkout iframe needs the Payment
  // Request-adjacent APIs some card/bank flows rely on.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), usb=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
