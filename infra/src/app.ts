import { App } from "aws-cdk-lib";
import { AppComplianceStack } from "./stack.js";

const app = new App();
new AppComplianceStack(app, "AppComplianceScanner", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
