import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { AppComplianceStack } from "./stack.js";

describe("AppComplianceStack", () => {
  const template = Template.fromStack(new AppComplianceStack(new App(), "Test"));

  it("encrypts the artifacts bucket and expires objects after 30 days", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
          }),
        ]),
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({ ExpirationInDays: 30, Status: "Enabled" }),
        ]),
      },
    });
  });

  it("uses on-demand DynamoDB", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  it("does not let the scanner role read DynamoDB or secrets", () => {
    const policies = template.findResources("AWS::IAM::Policy");
    const scannerPolicies = Object.entries(policies).filter(([id]) =>
      id.includes("Scanner"),
    );
    expect(scannerPolicies.length).toBeGreaterThan(0);
    for (const [, resource] of scannerPolicies) {
      const blob = JSON.stringify(resource);
      expect(blob).not.toContain("dynamodb:GetItem");
      expect(blob).not.toContain("secretsmanager");
    }
  });

  it("defines a state machine and a failed-execution alarm", () => {
    template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      Threshold: 1,
    });
  });
});
