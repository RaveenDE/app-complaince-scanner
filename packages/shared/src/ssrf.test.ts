import { describe, expect, it } from "vitest";
import {
  assertSafeRedirectChain,
  assertSafeUrl,
  decodeEncodedIPv4,
  SsrfError,
} from "./ssrf.js";

describe("decodeEncodedIPv4", () => {
  it("decodes decimal, hex, octal, and short forms of loopback", () => {
    expect(decodeEncodedIPv4("2130706433")).toBe("127.0.0.1");
    expect(decodeEncodedIPv4("0x7f000001")).toBe("127.0.0.1");
    expect(decodeEncodedIPv4("0177.0.0.1")).toBe("127.0.0.1");
    expect(decodeEncodedIPv4("127.1")).toBe("127.0.0.1");
  });

  it("leaves hostnames alone", () => {
    expect(decodeEncodedIPv4("example.com")).toBeNull();
  });
});

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

  it("rejects the cloud metadata address", async () => {
    await expect(
      assertSafeUrl("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects IPv6 loopback", async () => {
    await expect(assertSafeUrl("http://[::1]/")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("rejects decimal and hex encodings of loopback", async () => {
    await expect(assertSafeUrl("http://2130706433/")).rejects.toBeInstanceOf(
      SsrfError,
    );
    await expect(assertSafeUrl("http://0x7f000001/")).rejects.toBeInstanceOf(
      SsrfError,
    );
    await expect(assertSafeUrl("http://127.1/")).rejects.toBeInstanceOf(
      SsrfError,
    );
  });

  it("rejects a hostname that resolves to a private IP", async () => {
    await expect(
      assertSafeUrl("http://evil.example/", {
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
    ).rejects.toBeInstanceOf(SsrfError);
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

describe("assertSafeRedirectChain", () => {
  it("rejects a hop to the metadata IP", async () => {
    await expect(
      assertSafeRedirectChain([
        "https://example.com/",
        "http://169.254.169.254/latest/meta-data/",
      ]),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects too many hops", async () => {
    await expect(
      assertSafeRedirectChain(
        [
          "https://example.com/a",
          "https://example.com/b",
          "https://example.com/c",
          "https://example.com/d",
          "https://example.com/e",
          "https://example.com/f",
          "https://example.com/g",
        ],
        {
          lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        },
      ),
    ).rejects.toMatchObject({ message: "Too many redirects." });
  });
});
