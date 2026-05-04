import { afterEach, describe, expect, it, vi } from "vitest";

const originalAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const originalSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

type ClientConfig = {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

type CommandInput = {
  Bucket?: string;
  Key?: string;
  ContentType?: string;
};

const importStorageWithMockedAws = async () => {
  const clientConfigs: ClientConfig[] = [];

  vi.resetModules();
  vi.doMock("dotenv", () => {
    return {
      default: {
        config: vi.fn()
      },
      config: vi.fn()
    };
  });
  vi.doMock("@aws-sdk/client-s3", () => {
    class S3Client {
      public readonly config: ClientConfig;

      constructor(config: ClientConfig) {
        this.config = config;
        clientConfigs.push(config);
      }

      send = vi.fn();
    }

    class GetObjectCommand {
      public readonly input: CommandInput;

      constructor(input: CommandInput) {
        this.input = input;
      }
    }

    class PutObjectCommand {
      public readonly input: CommandInput;

      constructor(input: CommandInput) {
        this.input = input;
      }
    }

    class DeleteObjectCommand {
      public readonly input: CommandInput;

      constructor(input: CommandInput) {
        this.input = input;
      }
    }

    return {
      DeleteObjectCommand,
      GetObjectCommand,
      PutObjectCommand,
      S3Client
    };
  });
  vi.doMock("@aws-sdk/s3-request-presigner", () => {
    return {
      getSignedUrl: vi.fn(async (_client: unknown, command: { input: CommandInput }) => {
        return `https://signed.test/${command.input.Key ?? ""}`;
      })
    };
  });

  const storage = await import("../../../src/lib/storage/s3");

  return {
    storage,
    clientConfigs
  };
};

afterEach(() => {
  process.env.AWS_ACCESS_KEY_ID = originalAccessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = originalSecretAccessKey;
  vi.doUnmock("dotenv");
  vi.doUnmock("@aws-sdk/client-s3");
  vi.doUnmock("@aws-sdk/s3-request-presigner");
  vi.resetModules();
});

describe("s3 storage helpers", () => {
  it("uses the default AWS credential provider chain when static keys are omitted", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const { clientConfigs } = await importStorageWithMockedAws();

    expect(clientConfigs[0]).toMatchObject({
      region: "us-west-2"
    });
    expect(clientConfigs[0]?.credentials).toBeUndefined();
  });

  it("uses explicit static credentials when both AWS key env vars are set", async () => {
    process.env.AWS_ACCESS_KEY_ID = "test-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

    const { clientConfigs } = await importStorageWithMockedAws();

    expect(clientConfigs[0]?.credentials).toEqual({
      accessKeyId: "test-key",
      secretAccessKey: "test-secret"
    });
  });

  it("creates presigned upload and download URLs without sending S3 requests", async () => {
    const { storage } = await importStorageWithMockedAws();

    const uploadUrl = await storage.getSignedUploadUrl({
      storageKey: "projects/project-1/versions/version-1/file.wav",
      contentType: "audio/wav"
    });
    const downloadUrl = await storage.getSignedFileUrl(
      "projects/project-1/versions/version-1/file.wav"
    );

    expect(uploadUrl).toBe("https://signed.test/projects/project-1/versions/version-1/file.wav");
    expect(downloadUrl).toBe("https://signed.test/projects/project-1/versions/version-1/file.wav");
  });
});
