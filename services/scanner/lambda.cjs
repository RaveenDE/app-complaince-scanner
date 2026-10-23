"use strict";

// Placeholder handler copied into the container image so `cdk synth` can
// hash the asset. The TypeScript handler in src/lambda.ts is the real scan.
exports.handler = async (event) => {
  const scanId = event && event.scanId ? String(event.scanId) : "unknown";
  return {
    scanId,
    screenshotKey: `scans/${scanId}/screenshot.png`,
    findingsJson: JSON.stringify({
      url: event?.url ?? "",
      finalUrl: event?.url ?? "",
      title: "",
      findings: [],
    }),
  };
};
