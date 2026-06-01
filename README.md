# Contract Kit

Schema-first reliability helpers for structured AI outputs.

Contract Kit wraps model calls with the guardrails production teams usually end up rebuilding:

- JSON extraction from model responses
- schema validation with Zod or any compatible `.parse()` schema
- automatic repair retries
- replayable failure artifacts
- lightweight event hooks for observability
- provider adapters without forcing provider SDKs into your dependency tree

## Install

```sh
npm install @krishthesmart/contract-kit zod
```

## Usage

```ts
import { z } from "zod";
import { generateContract, openAIResponsesAdapter } from "@krishthesmart/contract-kit";
import OpenAI from "openai";

const client = new OpenAI();

const UserProfile = z.object({
  name: z.string(),
  role: z.string(),
  risk: z.enum(["low", "medium", "high"])
});

const result = await generateContract({
  model: openAIResponsesAdapter(client, {
    model: "gpt-4.1-mini",
    temperature: 0
  }),
  schema: UserProfile,
  prompt: "Extract the user's profile from this support ticket: ...",
  retries: 2,
  onEvent(event) {
    console.log(event.type);
  }
});

console.log(result.data);
```

`result.data` is guaranteed to be the schema output type if the call succeeds.
If every attempt fails, Contract Kit throws a typed error containing `replay`, which can be saved as a test fixture.

## Model Interface

Any model can be used by implementing one method:

```ts
const model = {
  async generate(prompt: string) {
    return callYourModel(prompt);
  }
};
```

## Why This Exists

Structured AI output is still brittle in production. Responses arrive with markdown fences, invalid JSON, changed enum values, missing fields, and provider-specific edge cases. Contract Kit gives application teams a small, auditable boundary where those failures are retried, logged, and turned into reproducible tests.

## Roadmap

- Anthropic adapter
- Vercel AI SDK adapter
- OpenTelemetry event exporter
- schema version diffing
- fixture runner for replay files
- CLI to turn production failures into regression tests
