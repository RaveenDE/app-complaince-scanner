import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Alarm, ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import {
  DockerImageCode,
  DockerImageFunction,
  Function as LambdaFunction,
  Runtime,
  Architecture,
  Code,
} from "aws-cdk-lib/aws-lambda";
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Chain, DefinitionBody, JsonPath, StateMachine, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Construct } from "constructs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export class AppComplianceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "Artifacts", {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{ expiration: Duration.days(30) }],
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [HttpMethods.GET],
          allowedOrigins: ["http://localhost:3000"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const table = new Table(this, "Scans", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiFn = new LambdaFunction(this, "ApiHandler", {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.X86_64,
      handler: "index.handler",
      timeout: Duration.seconds(29),
      memorySize: 512,
      code: Code.fromAsset(join(repoRoot, "infra/lambda-assets/api")),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        STATE_MACHINE_ARN: "",
      },
    });

    const workerFn = new LambdaFunction(this, "WorkerHandler", {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.X86_64,
      handler: "index.handler",
      timeout: Duration.seconds(120),
      memorySize: 1024,
      code: Code.fromAsset(join(repoRoot, "infra/lambda-assets/worker")),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        RULES_DIR: "/var/task/rules",
      },
    });

    const scannerFn = new DockerImageFunction(this, "Scanner", {
      code: DockerImageCode.fromImageAsset(join(repoRoot, "services/scanner"), {
        file: "Dockerfile",
        cmd: ["lambda.handler"],
      }),
      memorySize: 3008,
      timeout: Duration.minutes(5),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    table.grantReadWriteData(apiFn);
    table.grantReadWriteData(workerFn);
    bucket.grantReadWrite(apiFn);
    bucket.grantRead(workerFn);
    bucket.grantPut(scannerFn, "scans/*");

    const safety = new LambdaInvoke(this, "SafetyCheck", {
      lambdaFunction: workerFn,
      payload: TaskInput.fromObject({
        action: "safety",
        scanId: JsonPath.stringAt("$.scanId"),
        url: JsonPath.stringAt("$.url"),
      }),
      outputPath: "$.Payload",
    });

    const scanTask = new LambdaInvoke(this, "Scan", {
      lambdaFunction: scannerFn,
      payload: TaskInput.fromObject({
        scanId: JsonPath.stringAt("$.scanId"),
        url: JsonPath.stringAt("$.url"),
      }),
      resultPath: "$.scanResult",
    });
    scanTask.addRetry({ maxAttempts: 2, interval: Duration.seconds(5) });

    const evaluate = new LambdaInvoke(this, "Evaluate", {
      lambdaFunction: workerFn,
      payload: TaskInput.fromObject({
        action: "evaluate",
        scanId: JsonPath.stringAt("$.scanId"),
        findingsJson: JsonPath.stringAt("$.scanResult.Payload.findingsJson"),
        screenshotKey: JsonPath.stringAt("$.scanResult.Payload.screenshotKey"),
        policyTextKey: JsonPath.stringAt("$.scanResult.Payload.policyTextKey"),
      }),
      outputPath: "$.Payload",
    });

    const explain = new LambdaInvoke(this, "Explain", {
      lambdaFunction: workerFn,
      payload: TaskInput.fromObject({
        action: "explain",
        scanId: JsonPath.stringAt("$.scanId"),
        issues: JsonPath.objectAt("$.issues"),
        findingsJson: JsonPath.stringAt("$.findingsJson"),
        screenshotKey: JsonPath.stringAt("$.screenshotKey"),
        policyTextKey: JsonPath.stringAt("$.policyTextKey"),
      }),
      outputPath: "$.Payload",
    });

    const finalize = new LambdaInvoke(this, "Finalize", {
      lambdaFunction: workerFn,
      payload: TaskInput.fromObject({
        action: "finalize",
        scanId: JsonPath.stringAt("$.scanId"),
        issues: JsonPath.objectAt("$.issues"),
        screenshotKey: JsonPath.stringAt("$.screenshotKey"),
        policyTextKey: JsonPath.stringAt("$.policyTextKey"),
      }),
      outputPath: "$.Payload",
    });

    const machine = new StateMachine(this, "ScanPipeline", {
      definitionBody: DefinitionBody.fromChainable(
        Chain.start(safety).next(scanTask).next(evaluate).next(explain).next(finalize),
      ),
      timeout: Duration.minutes(6),
    });

    machine.grantStartExecution(apiFn);
    apiFn.addEnvironment("STATE_MACHINE_ARN", machine.stateMachineArn);

    new Alarm(this, "PipelineFailedAlarm", {
      metric: machine.metricFailed(),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: "A scan pipeline execution failed.",
    });

    const api = new RestApi(this, "ScanApi", {
      restApiName: "AppComplianceScanner",
      deployOptions: { throttlingBurstLimit: 10, throttlingRateLimit: 5 },
    });
    const scans = api.root.addResource("scans");
    scans.addMethod("POST", new LambdaIntegration(apiFn));
    scans.addResource("{id}").addMethod("GET", new LambdaIntegration(apiFn));
  }
}
