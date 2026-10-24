import type { z } from "zod";
import { OpenAiJsonProvider } from "./openai.js";

export type JsonProvider = {
  readonly id: "openai" | "template" | "mock";
  generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
};

export class TemplateJsonProvider implements JsonProvider {
  readonly id = "template" as const;

  async generateJson<T>(_prompt: string, _schema: z.ZodType<T>): Promise<T> {
    throw new Error("Template provider does not call a model.");
  }
}

export const TEMPLATE_PROVIDER = new TemplateJsonProvider();

export function createJsonProvider(
  env: Record<string, string | undefined> = process.env,
): JsonProvider {
  const key = env.OPENAI_API_KEY?.trim();
  if (key) {
    return new OpenAiJsonProvider(key, env.OPENAI_MODEL?.trim());
  }
  return TEMPLATE_PROVIDER;
}
