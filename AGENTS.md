<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# tirezone (타이어존)

B2B tire marketplace. Buyers and sellers both require admin approval; sellers list
tires, buyers order and pay via Toss Payments, admins approve/suspend and settle
payouts. Next.js App Router + Prisma 6 + PostgreSQL + NextAuth v4 (JWT).

## Environment

- Shell is **Windows PowerShell**. `&&` chaining, heredocs, and `rm -rf` are parse
  errors there — use PowerShell syntax, or the Bash tool for POSIX syntax.
- Verify with `npx tsc --noEmit` and `npx eslint .`. Both must be clean.
- **There is no test suite and no test runner.** Do not invent one for a single fix;
  if a change needs proof, reason through the code path and say so explicitly.
- Never commit to `main` — branch first. Never push unless asked.

## Architecture

- `src/app/api/**/route.ts` — thin handlers. Every one declares
  `export const runtime = "nodejs"` (all 74 do). Parse with zod, delegate to
  `src/lib/server/*`, map errors to responses. No business logic here.
- `src/lib/server/*.ts` — one module per domain (orders, cart, settlement, payout…).
  Owns its zod schemas, its `XxxDomainError` class, and its `validationResponse` /
  `domainErrorResponse` / `serverErrorResponse` helpers. This trio is duplicated per
  module on purpose; follow the local file's pattern rather than importing another
  domain's copy.
- Auth guards: `requireRole([...])` (`guard.ts`), `requireSeller()` (`seller.ts`),
  `requireAdmin()` (`admin.ts`). **Every route handler starts with one.** They return
  `{ response }` — return it immediately when set.
- `getSession()` in `server/auth.ts` re-reads the DB on every call to reject
  withdrawn/suspended users. Never call `getServerSession` directly.
- `src/proxy.ts` is this Next version's middleware equivalent (matcher: `/seller/*`,
  `/admin/*`). It only checks the JWT role — it is not a substitute for the
  server-side guards.

## Database

- Changing `prisma/schema.prisma` requires a **new** file under `prisma/migrations/`.
  Never edit an existing migration.
- **Adding a nullable column does not fix existing rows.** Every migration that
  changes behavior must state what happens to rows already in the table, and
  backfill them when the answer isn't "nothing". This has been shipped wrong here
  more than once.
- `Order.status` is a **Korean string**, not an enum — `입금대기`, `입금완료`,
  `입금전취소`… Values live in `src/lib/order-status.ts`; never hardcode the literals.
  `ShippingStatus` *is* a Prisma enum (ASCII names, `@map`ped to Korean DB values).
- Orders are shown to users by `orderNo`, never by the raw cuid `id`.

## Money — non-negotiable invariants

- **Never call an external API inside `prisma.$transaction`.** Postgres cannot roll
  back an HTTP call. Commit the durable record first ("a refund is owed"), then make
  the call outside the transaction and write the outcome separately. `cancelOrder`
  in `orders.ts` is the reference implementation, including its idempotency key.
- The server decides prices. Never persist a price, amount, or surcharge from the
  request body — read it from `Listing`/`Seller` inside the transaction. Shipping
  surcharges come from `server/pricing.ts`, the single source of truth.
- State transitions use `updateMany` with the expected current state in `where`, then
  assert the returned `count`. A bare `update` on a status field is a race.
- Any code path that takes money without delivering the order must record it
  (`Payment.refundRequiredAt` / `refundReason` / `refundAmount`) before anything else.

## Seeding

`prisma/seed.ts` also loads the tire catalog, so there is a real reason to run it
against a live database. Destructive and account-creating behavior is therefore
opt-in and refused under `NODE_ENV=production`: `SEED_DEMO_USERS` for demo accounts,
`SEED_RESET_NON_CANONICAL` for deleting non-canonical users. Keep any new destructive
seed behavior behind the same pattern.

## Agent workflow on this repo

Work is split by role, at the user's direction: **Opus designs and reviews, Sonnet
implements.** Design produces a written spec (작업 대상 / 수정 항목 / 검증 / 보고,
each item with file:line and the concrete failure scenario); implementation may run
as parallel Sonnet agents for speed; Opus reviews **once, after all implementation
is finished** — not per step. Raise reasoning effort for a step when it warrants it.

If you are an implementation session: execute the spec exactly and completely.
Do not widen scope, refactor beyond the spec, or "improve" adjacent code — a
separate review pass will judge the diff, and out-of-scope changes have caused
real regressions here. If the spec conflicts with what you find in the code, say
so in your report instead of silently deviating. Report failures and skipped
items as such; do not present a partial result as complete.

## Recurring failure modes here

1. **Existing rows ignored** — see the migration rule above.
2. **Over-applying an instruction** — told never to show a partial refund as
   complete, an agent made *successful* partial refunds read as "처리중" forever.
   When a rule says "never show X as Y", check the success path still renders.
3. **Green checks that mean nothing** — `tsc`, `eslint`, and `next build` have all
   passed on changes that were wrong against real data. Passing them is the floor,
   not the evidence.
