import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { allowPrivateFromEnv, handleRequest } from "../app.js";
import {
  AwsScanStore,
  createAwsClientsFromEnv,
} from "../storage-aws.js";
import type { ScanStore } from "../storage.js";

export type StepFunctionsStarter = {
  start(scanId: string): Promise<void> | void;
};

let store: ScanStore | undefined;
let startExecution: StepFunctionsStarter = {
  start() {
    throw new Error("Step Functions starter is not configured.");
  },
};

function getStore(): ScanStore {
  store ??= new AwsScanStore(createAwsClientsFromEnv());
  return store;
}

export function setLambdaDependencies(deps: {
  store?: ScanStore;
  starter?: StepFunctionsStarter;
}): void {
  if (deps.store) store = deps.store;
  if (deps.starter) startExecution = deps.starter;
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const path = event.path ?? "/";
  const response = await handleRequest(
    {
      method: event.httpMethod,
      path,
      body: event.body ?? undefined,
      headers: Object.fromEntries(
        Object.entries(event.headers ?? {}).map(([key, value]) => [
          key,
          value ?? undefined,
        ]),
      ),
      clientIp: event.requestContext.identity?.sourceIp ?? "0.0.0.0",
    },
    getStore(),
    {
      start(scanId: string) {
        void startExecution.start(scanId);
      },
    },
    { allowPrivateAddresses: allowPrivateFromEnv() },
  );

  return {
    statusCode: response.status,
    headers: response.headers,
    body: response.body,
  };
}
