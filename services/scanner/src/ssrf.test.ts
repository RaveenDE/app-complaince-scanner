import { describe, expect, it } from "vitest";
import { assertSafeUrl, SsrfError } from "./ssrf.js";

describe("assertSafeUrl", () => {
  it("rejects non-http schemes", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("rejects loopback addresses", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("rejects private IPv4 addresses", async () => {
    await expect(assertSafeUrl("http://192.168.1.10/")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("allows loopback when allowPrivateAddresses is set", async () => {
    const url = await assertSafeUrl("http://127.0.0.1:3456/", {
      allowPrivateAddresses: true,
    });
    expect(url.hostname).toBe("127.0.0.1");
  });

  it("accepts a public https URL", async () => {
    const url = await assertSafeUrl("https://example.com/");
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("example.com");
  });
});
