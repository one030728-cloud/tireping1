import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { z } from "zod";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PRESIGNED_URL_EXPIRES_IN = 600;

export const imagePresignSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.coerce.number().int().min(1).max(MAX_IMAGE_BYTES),
});

const extensionByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export class StorageConfigurationError extends Error {
  constructor() {
    super("STORAGE_NOT_CONFIGURED");
    this.name = "StorageConfigurationError";
  }
}

interface StorageConfig {
  client: S3Client;
  bucket: string;
  publicBaseUrl: string;
}

function getStorageConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new StorageConfigurationError();
  }

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || "auto";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  return {
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicBaseUrl,
  };
}

function publicObjectUrl(baseUrl: string, key: string) {
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function createImagePresign(
  userId: string,
  data: z.infer<typeof imagePresignSchema>,
) {
  const config = getStorageConfig();
  const extension = extensionByContentType[data.contentType];
  const key = `listing-images/${userId}/${crypto.randomUUID()}.${extension}`;

  // A presigned PUT's ContentLength can be bound into the signature (via
  // signableHeaders) so the request must carry a matching Content-Length
  // header, but that requires an *exact* byte match end-to-end to the
  // storage backend. This bucket is Cloudflare R2 (see README's S3_ENDPOINT
  // example), fronted over the public internet rather than verified in this
  // change against a live bucket — if anything between the browser and R2
  // (a corporate proxy, an SDK/runtime that streams instead of sending a
  // fixed-length body) drops or rewrites that header, every upload would
  // 403 with a signature mismatch and sellers couldn't add photos at all.
  // A presigned POST with a `content-length-range` condition only enforces
  // a byte-count range instead of an exact match, which is both enough to
  // close the "declare size:1000, upload gigabytes" hole this exists for
  // and more tolerant of exactly that kind of transport variance.
  //
  // NOT verified against a live R2 bucket in this change (no credentials
  // available here) — manually verify with a real seller/admin account
  // before deploying: upload one listing image end-to-end and confirm it
  // succeeds and appears at the returned `url`.
  const { url: uploadUrl, fields } = await createPresignedPost(config.client, {
    Bucket: config.bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_IMAGE_BYTES],
      { "Content-Type": data.contentType },
    ],
    Fields: {
      "Content-Type": data.contentType,
    },
    Expires: PRESIGNED_URL_EXPIRES_IN,
  });

  return {
    key,
    uploadUrl,
    fields,
    url: publicObjectUrl(config.publicBaseUrl, key),
    contentType: data.contentType,
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  };
}
