import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import { createS3Client, ensureBucketExists } from "../lib/s3";

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
    s3Bucket: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET não configurado no ambiente");
  }

  const s3 = createS3Client();
  await ensureBucketExists(s3, bucket);

  app.decorate("s3", s3);
  app.decorate("s3Bucket", bucket);
});
