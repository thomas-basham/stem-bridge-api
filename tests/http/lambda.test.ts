import { describe, expect, it } from "vitest";

import { handler } from "../../src/lambda";
import { getSeedAssetSizeBytes } from "../../src/lib/storage/s3";

describe("lambda adapter", () => {
  it("returns audio responses as base64-encoded binary payloads", async () => {
    const storageKey = "seed-assets/project-1/version-1/mix.wav";
    const response = (await handler(
      {
        version: "2.0",
        routeKey: "GET /seed-assets/{proxy+}",
        rawPath: `/${storageKey}`,
        rawQueryString: "",
        headers: {
          host: "example.test"
        },
        requestContext: {
          requestId: "request-1",
          http: {
            method: "GET",
            path: `/${storageKey}`,
            protocol: "HTTP/1.1",
            sourceIp: "127.0.0.1",
            userAgent: "vitest"
          }
        },
        body: "",
        isBase64Encoded: false
      },
      {}
    )) as {
      statusCode: number;
      isBase64Encoded: boolean;
      body: string;
      headers: Record<string, string>;
    };

    const body = Buffer.from(response.body, "base64");

    expect(response.statusCode).toBe(200);
    expect(response.isBase64Encoded).toBe(true);
    expect(response.headers["content-type"]).toBe("audio/wav");
    expect(body.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(body.length).toBe(getSeedAssetSizeBytes(storageKey));
  });
});
