import { describe, expect, it, vi } from "vitest";
import { AwsScanStore } from "./storage-aws.js";
import { sampleAnswers } from "./test-answers.js";

describe("AwsScanStore", () => {
  it("puts scan records and objects through the SDK clients", async () => {
    const docSend = vi.fn(async (command: { input?: { Item?: unknown; Key?: { id: string } } }) => {
      if (command.input?.Key) {
        return {
          Item: {
            id: "scan-1",
            url: "https://example.com",
            answers: sampleAnswers(),
            status: "queued",
            createdAt: "2026-01-01T00:00:00.000Z",
            ownerConfirmed: true,
          },
        };
      }
      return {};
    });
    const dynamoSend = vi.fn(async () => ({}));
    const s3Send = vi.fn(async () => ({}));

    const store = new AwsScanStore({
      doc: { send: docSend } as never,
      dynamo: { send: dynamoSend } as never,
      s3: { send: s3Send } as never,
      tableName: "scans",
      bucket: "artifacts",
    });

    await store.putScan({
      id: "scan-1",
      url: "https://example.com",
      answers: sampleAnswers(),
      status: "queued",
      createdAt: "2026-01-01T00:00:00.000Z",
      ownerConfirmed: true,
    });
    const key = await store.putObject("scans/scan-1/shot.png", "bytes", "image/png");
    expect(key).toBe("scans/scan-1/shot.png");
    expect(s3Send).toHaveBeenCalled();
    const loaded = await store.getScan("scan-1");
    expect(loaded?.id).toBe("scan-1");
  });
});
