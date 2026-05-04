import path from "node:path";
import { Readable } from "node:stream";

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
  ...(env.awsAccessKeyId && env.awsSecretAccessKey
    ? {
        credentials: {
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey
        }
      }
    : {})
});

const SEED_ASSET_PREFIX = "seed-assets/";
const SEED_ASSET_CACHE_LIMIT = 64;
const seedAssetBufferCache = new Map<string, Buffer>();

const createSeedAudioBuffer = (storageKey: string) => {
  const sampleRate = 16_000;
  const durationSeconds = 8;
  const channelCount = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * channelCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  const hash = [...storageKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const frequency = 180 + (hash % 320);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(index / 4000, (sampleCount - index) / 4000, 1);
    const sample =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.42 +
      Math.sin((2 * Math.PI * frequency * 2 * index) / sampleRate) * 0.08;
    buffer.writeInt16LE(Math.round(sample * envelope * 32767), 44 + index * 2);
  }

  return buffer;
};

const createSeedMidiBuffer = () => {
  return Buffer.from([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
    0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x16, 0x00, 0xff, 0x51, 0x03, 0x07, 0xa1,
    0x20, 0x00, 0xc0, 0x00, 0x00, 0x90, 0x3c, 0x50, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff,
    0x2f, 0x00
  ]);
};

const createSeedPdfBuffer = (storageKey: string) => {
  const escapedStorageKey = storageKey.replace(/[\\()]/g, (character) => `\\${character}`);
  const contentStream = [
    "BT",
    "/F1 14 Tf",
    "72 720 Td",
    "(StemBridge seed asset) Tj",
    "0 -24 Td",
    `(${escapedStorageKey}) Tj`,
    "ET"
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  ];
  const header = "%PDF-1.4\n";
  const offsets: number[] = [];
  let body = "";
  let currentOffset = Buffer.byteLength(header, "utf8");

  for (const object of objects) {
    offsets.push(currentOffset);
    body += object;
    currentOffset += Buffer.byteLength(object, "utf8");
  }

  const xrefOffset = currentOffset;
  const xrefEntries = offsets
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    xrefEntries.trimEnd(),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    "%%EOF\n"
  ].join("\n");

  return Buffer.from(`${header}${body}${xref}`, "utf8");
};

const createSeedFileBuffer = (storageKey: string) => {
  if (/\.midi?$/i.test(storageKey)) {
    return createSeedMidiBuffer();
  }

  if (/\.pdf$/i.test(storageKey)) {
    return createSeedPdfBuffer(storageKey);
  }

  if (/\.(wav|mp3|aiff?)$/i.test(storageKey)) {
    return createSeedAudioBuffer(storageKey);
  }

  return Buffer.from(`StemBridge seed asset\n${storageKey}\n`, "utf8");
};

const cacheSeedAssetBuffer = (storageKey: string, buffer: Buffer) => {
  seedAssetBufferCache.set(storageKey, buffer);

  if (seedAssetBufferCache.size <= SEED_ASSET_CACHE_LIMIT) {
    return;
  }

  const oldestStorageKey = seedAssetBufferCache.keys().next().value;

  if (oldestStorageKey) {
    seedAssetBufferCache.delete(oldestStorageKey);
  }
};

export const isSeedAssetStorageKey = (storageKey: string) => {
  return storageKey.startsWith(SEED_ASSET_PREFIX);
};

export const getSeedAssetBuffer = (storageKey: string) => {
  if (!isSeedAssetStorageKey(storageKey)) {
    return null;
  }

  const cachedBuffer = seedAssetBufferCache.get(storageKey);

  if (cachedBuffer) {
    seedAssetBufferCache.delete(storageKey);
    seedAssetBufferCache.set(storageKey, cachedBuffer);
    return cachedBuffer;
  }

  const buffer = createSeedFileBuffer(storageKey);
  cacheSeedAssetBuffer(storageKey, buffer);

  return buffer;
};

export const getSeedAssetSizeBytes = (storageKey: string) => {
  return getSeedAssetBuffer(storageKey)?.length ?? null;
};

export const getSeedAssetContentType = (storageKey: string) => {
  const extension = path.extname(storageKey).toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".mid" || extension === ".midi") {
    return "audio/midi";
  }

  if (extension === ".mp3") {
    return "audio/mpeg";
  }

  if (extension === ".wav") {
    return "audio/wav";
  }

  if (extension === ".aif" || extension === ".aiff") {
    return "audio/aiff";
  }

  return "application/octet-stream";
};

export const encodeObjectKeyForUrl = (objectKey: string) => {
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
  return `${buildVersionFileStoragePrefix(projectId, versionId)}${timestamp}-${safeFileName}`;
};

export const buildVersionFileStoragePrefix = (projectId: string, versionId: string) => {
  return `projects/${projectId}/versions/${versionId}/`;
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

export const getSignedUploadUrl = async (params: {
  storageKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) => {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: params.storageKey,
      ContentType: params.contentType
    }),
    {
      expiresIn: params.expiresInSeconds ?? 900
    }
  );
};

export const getFileStream = async (storageKey: string): Promise<Readable> => {
  const seedAssetBuffer = getSeedAssetBuffer(storageKey);

  if (seedAssetBuffer) {
    return Readable.from([seedAssetBuffer]);
  }

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey
    })
  );

  if (!response.Body) {
    throw new Error(`S3 object body was empty for key ${storageKey}.`);
  }

  return response.Body as Readable;
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
