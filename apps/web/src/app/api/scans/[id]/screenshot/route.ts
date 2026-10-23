import { apiBaseUrl } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  try {
    const response = await fetch(`${apiBaseUrl()}/scans/${id}/screenshot`, {
      cache: "no-store",
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "image/png",
      },
    });
  } catch {
    return Response.json(
      { error: "The scan API is not running." },
      { status: 502 },
    );
  }
}
