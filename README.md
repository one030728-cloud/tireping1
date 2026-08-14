This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Toss Payments test setup

Online payment uses the account-specific Toss Payments API individual integration keys. Add the following values to `.env.local` for local testing; never commit the real secret key.

```env
TOSS_CLIENT_KEY=test_ck_your_account_client_key
TOSS_SECRET_KEY=test_sk_your_account_secret_key
```

`TOSS_CLIENT_KEY` is read on the server by the payment preparation API and returned to the browser for SDK initialization, so it does not need a `NEXT_PUBLIC_` prefix. `TOSS_SECRET_KEY` is used only by the server-side payment confirmation API.

The current Toss Payments SDK v2 distinguishes API individual integration keys (`test_ck_`/`test_sk_`) from payment-widget integration keys (`test_gck_`/`test_gsk_`). This implementation uses the v2 `payment().requestPayment()` flow because the account keys provided for this project are API individual integration keys; it does not use the public documentation test keys.

To test locally, start the app with `npm run dev`, sign in as a buyer, create an order, and select `결제하기` from the order list. Use the test keys from your own Toss Payments account. The payment success redirect confirms the payment on the server and changes linked orders to `입금완료`; the failure redirect returns to the order list so the payment can be retried.

## Database seeding

Database seeding is not run automatically during Render builds. To run it manually once, open the **Shell** tab in the Render dashboard and run:

```bash
npm run db:seed
```

When seeding in production, set `SEED_ADMIN_PASSWORD` before running the command.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 상품 이미지 업로드 설정

상품 이미지는 S3 호환 오브젝트 스토리지에 presigned URL로 업로드합니다. Render와 로컬 환경에 다음 변수를 설정해야 합니다.

```env
S3_BUCKET=tirezone-assets
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_PUBLIC_BASE_URL=https://cdn.example.com
S3_FORCE_PATH_STYLE=false
```

`S3_PUBLIC_BASE_URL`은 업로드된 파일을 브라우저가 읽을 수 있는 공개 도메인(Cloudflare R2 커스텀 도메인 또는 S3/CloudFront 주소)이어야 합니다. 버킷 CORS에는 앱 도메인의 `PUT` 요청과 `Content-Type` 헤더를 허용해야 합니다.
