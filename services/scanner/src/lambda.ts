import { readFile } from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { scan } from "./scan.js";

const s3 = new S3Client({});

export type ScannerLambdaEvent = {
  scanId: string;
  url: string;
  allowPrivateAddresses?: boolean;
};

export async function handler(event: ScannerLambdaEvent): Promise<{
  scanId: string;
  screenshotKey: string;
  findingsJson: string;
  policyTextKey?: string;
  finalUrl: string;
  title: string;
}> {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) throw new Error("BUCKET_NAME is required.");

  const screenshotPath = "/tmp/screenshot.png";
  const result = await scan(event.url, {
    screenshotPath,
    allowPrivateAddresses: event.allowPrivateAddresses,
  });

  const screenshotKey = `scans/${event.scanId}/screenshot.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: screenshotKey,
      Body: await readFile(screenshotPath),
      ContentType: "image/png",
    }),
  );

  let policyTextKey: string | undefined;
  if (result.privacyPolicyText) {
    policyTextKey = `scans/${event.scanId}/privacy.txt`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: policyTextKey,
        Body: result.privacyPolicyText,
        ContentType: "text/plain; charset=utf-8",
      }),
    );
  }

  const publicResult = {
    ...result,
    privacyPolicyText: undefined,
    screenshotPath: undefined,
  };

  return {
    scanId: event.scanId,
    screenshotKey,
    findingsJson: JSON.stringify(publicResult),
    policyTextKey,
    finalUrl: result.finalUrl,
    title: result.title,
  };
}
