import path from "node:path";
import { Readable } from "node:stream";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../config/env";
import { ApiError } from "../errors/api-error";

const credentials =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN
      }
    : undefined;

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.AWS_S3_ENDPOINT,
  forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
  credentials
});

export const sanitizeFileName = (input: string) => {
  const baseName = path.basename(input).replace(/\s+/g, "-");
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "");

  return sanitized.length > 0 ? sanitized : "file";
};

export const buildVersionFileStorageKey = (
  projectId: string,
  versionId: string,
  fileId: string,
  originalFileName: string
) => {
  return `projects/${projectId}/versions/${versionId}/${fileId}-${sanitizeFileName(originalFileName)}`;
};

export const createSignedUploadUrl = async (storageKey: string, contentType: string) => {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      ContentType: contentType
    }),
    { expiresIn: 900 }
  );
};

export const getStoredObjectStream = async (storageKey: string) => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey
    })
  );

  if (!response.Body) {
    throw new ApiError(404, "Stored file could not be found in S3.");
  }

  return response.Body as Readable;
};

