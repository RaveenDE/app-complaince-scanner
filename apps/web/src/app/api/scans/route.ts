import { apiBaseUrl } from "@/lib/api";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  try {
    const response = await fetch(`${apiBaseUrl()}/scans`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for":
          request.headers.get("x-forwarded-for") ?? "127.0.0.1",
      },
      body,
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { error: "The scan API is not running." },
      { status: 502 },
    );
  }
}
