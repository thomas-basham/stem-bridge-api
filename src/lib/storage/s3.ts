import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../config/env";

const s3Client = new S3Client({
  region: env.s3Region,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey
  }
});

const encodeObjectKeyForUrl = (objectKey: string) => {
  return objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

export const sanitizeFileName = (fileName: string) => {
  const baseName = path.basename(fileName).trim();
  const normalized = baseName.replace(/\s+/g, "-");
  const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, "");

  if (!sanitized) {
    return "file";
  }

  return sanitized;
};

export const buildVersionFileStorageKey = (
  projectId: string,
  versionId: string,
  fileName: string,
  timestamp = Date.now()
) => {
  const safeFileName = sanitizeFileName(fileName);
  return `projects/${projectId}/versions/${versionId}/${timestamp}-${safeFileName}`;
};

export const uploadFileBuffer = async (params: {
  buffer: Buffer;
  storageKey: string;
  contentType: string;
}) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: params.storageKey,
      Body: params.buffer,
      ContentType: params.contentType
    })
  );
};

export const getPublicFileUrl = (storageKey: string) => {
  const encodedKey = encodeObjectKeyForUrl(storageKey);
  return `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com/${encodedKey}`;
};

export const getSignedFileUrl = async (storageKey: string, expiresInSeconds = 900) => {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey
    }),
    {
      expiresIn: expiresInSeconds
    }
  );
};

export const deleteFileObject = async (storageKey: string) => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey
    })
  );
};

export { s3Client };
