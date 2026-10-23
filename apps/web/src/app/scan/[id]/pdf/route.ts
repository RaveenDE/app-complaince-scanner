import {
  PLAYWRIGHT_BROWSERS_DIR,
  chromiumExecutablePath,
} from "@/lib/browsers-path";
import { chromium } from "playwright";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function originFrom(request: Request): string {
  const url = new URL(request.url);
  return process.env.ACS_WEB_URL ?? url.origin;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const reportUrl = `${originFrom(request)}/scan/${id}`;
  process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_DIR;
  const executablePath = chromiumExecutablePath();
  if (!executablePath) {
    return Response.json(
      { error: "Chromium is not installed. Run pnpm browsers." },
      { status: 500 },
    );
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.goto(reportUrl, { waitUntil: "load", timeout: 60_000 });
    await page.waitForSelector("[data-report-ready], [data-scan-failed]", {
      timeout: 120_000,
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="scan-${id}.pdf"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Could not create the PDF. Try again once the report is ready." },
      { status: 500 },
    );
  } finally {
    await browser.close();
  }
}
