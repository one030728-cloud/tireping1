import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: data.contentType,
    ContentLength: data.size,
  });
  // Binding ContentLength into the signature (via signableHeaders) means the
  // browser's PUT request must carry a matching Content-Length header or S3
  // rejects it with a signature mismatch. Browsers compute that header from
  // the actual request body they send, so this is what makes the declared
  // `size` enforceable — without it, `size` only fed the MAX_IMAGE_BYTES
  // check on this endpoint and the client could still upload a body of any
  // length to the presigned URL.
  const uploadUrl = await getSignedUrl(config.client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
    signableHeaders: new Set(["content-length"]),
  });

  return {
    key,
    uploadUrl,
    url: publicObjectUrl(config.publicBaseUrl, key),
    contentType: data.contentType,
    contentLength: data.size,
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  };
}
