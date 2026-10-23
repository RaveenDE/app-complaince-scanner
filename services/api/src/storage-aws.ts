import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ScanSchema, type Scan } from "@acs/shared";
import {
  RATE_MAX,
  RATE_WINDOW_MS,
  type ScanStore,
} from "./storage.js";

export type AwsScanStoreClients = {
  doc: DynamoDBDocumentClient;
  dynamo: DynamoDBClient;
  s3: S3Client;
  tableName: string;
  bucket: string;
};

export function createAwsClientsFromEnv(): AwsScanStoreClients {
  const tableName = process.env.TABLE_NAME;
  const bucket = process.env.BUCKET_NAME;
  if (!tableName || !bucket) {
    throw new Error("TABLE_NAME and BUCKET_NAME are required for AWS storage.");
  }
  const dynamo = new DynamoDBClient({});
  return {
    dynamo,
    doc: DynamoDBDocumentClient.from(dynamo),
    s3: new S3Client({}),
    tableName,
    bucket,
  };
}

export class AwsScanStore implements ScanStore {
  constructor(private readonly clients: AwsScanStoreClients) {}

  async putScan(scan: Scan): Promise<void> {
    await this.clients.doc.send(
      new PutCommand({
        TableName: this.clients.tableName,
        Item: scan,
      }),
    );
  }

  async getScan(id: string): Promise<Scan | null> {
    const result = await this.clients.doc.send(
      new GetCommand({
        TableName: this.clients.tableName,
        Key: { id },
      }),
    );
    if (!result.Item) return null;
    return ScanSchema.parse(result.Item);
  }

  async updateScan(id: string, patch: Partial<Scan>): Promise<Scan> {
    const current = await this.getScan(id);
    if (!current) throw new Error("Scan not found.");
    const next = ScanSchema.parse({
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString(),
    });
    await this.putScan(next);
    return next;
  }

  async putObject(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<string> {
    await this.clients.s3.send(
      new PutObjectCommand({
        Bucket: this.clients.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async tryAcquireIpLock(ip: string): Promise<boolean> {
    try {
      await this.clients.dynamo.send(
        new PutItemCommand({
          TableName: this.clients.tableName,
          Item: {
            id: { S: `LOCK#${ip}` },
            lock: { S: "1" },
          },
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return false;
      }
      throw error;
    }
  }

  async releaseIpLock(ip: string): Promise<void> {
    await this.clients.dynamo.send(
      new DeleteItemCommand({
        TableName: this.clients.tableName,
        Key: { id: { S: `LOCK#${ip}` } },
      }),
    );
  }

  async rateLimit(ip: string): Promise<boolean> {
    const windowId = `RATE#${ip}#${String(Math.floor(Date.now() / RATE_WINDOW_MS))}`;
    try {
      await this.clients.dynamo.send(
        new UpdateItemCommand({
          TableName: this.clients.tableName,
          Key: { id: { S: windowId } },
          UpdateExpression: "ADD #c :one",
          ConditionExpression: "attribute_not_exists(#c) OR #c < :max",
          ExpressionAttributeNames: { "#c": "count" },
          ExpressionAttributeValues: {
            ":one": { N: "1" },
            ":max": { N: String(RATE_MAX) },
          },
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return false;
      }
      throw error;
    }
  }
}
