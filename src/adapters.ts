import type { ContractModel, ContractModelContext } from "./types.js";

export type OpenAIResponsesLikeClient = {
  responses: {
    create(input: {
      model: string;
      input: string;
      temperature?: number;
      signal?: AbortSignal;
    }): Promise<{ output_text?: string }>;
  };
};

export function openAIResponsesAdapter(
  client: OpenAIResponsesLikeClient,
  options: { model: string; temperature?: number }
): ContractModel {
  return {
    async generate(prompt: string, context: ContractModelContext) {
      const response = await client.responses.create({
        model: options.model,
        input: prompt,
        temperature: options.temperature,
        signal: context.signal
      });

      if (typeof response.output_text !== "string") {
        throw new Error("OpenAI response did not include output_text.");
      }

      return response.output_text;
    }
  };
}

export function staticModel(responses: string[]): ContractModel {
  let index = 0;

  return {
    async generate() {
      const response = responses[index];
      index = Math.min(index + 1, responses.length - 1);

      if (response === undefined) {
        throw new Error("No static model responses configured.");
      }

      return response;
    }
  };
}
