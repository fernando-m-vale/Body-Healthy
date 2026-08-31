import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true, // exigido pelo MinIO; inofensivo em S3 real
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function ensureBucketExists(s3: S3Client, bucket: string): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export function createUploadUrl(
  s3: S3Client,
  bucket: string,
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

export interface S3Object {
  bytes: Buffer;
  contentType: string;
}

// contentType vem do próprio objeto S3 (setado no upload via PutObject
// ContentType, seção 4 passo 1) — evita depender de um campo extra no Prisma
// para saber o media type exato (ex.: image/png vs image/jpeg) na extração.
export async function getObject(s3: S3Client, bucket: string, key: string): Promise<S3Object> {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Objeto S3 vazio ou não encontrado: ${key}`);
  }
  return { bytes: Buffer.from(bytes), contentType: result.ContentType ?? "application/octet-stream" };
}
