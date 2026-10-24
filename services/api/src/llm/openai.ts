import type { z } from "zod";
import type { JsonProvider } from "./provider.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
};

export class OpenAiJsonProvider implements JsonProvider {
  readonly id = "openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_MODEL,
  ) {}

  async generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model || DEFAULT_MODEL,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Return only JSON matching the requested object. Do not add commentary.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("The language model request failed.");
      }
      const payload = (await response.json()) as ChatCompletion;
      const text = payload.choices?.[0]?.message?.content;
      if (!text) throw new Error("The language model returned an empty response.");
      return schema.parse(JSON.parse(text));
    } finally {
      clearTimeout(timer);
    }
  }
}
