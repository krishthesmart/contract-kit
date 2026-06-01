import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ContractParseError,
  ContractValidationError,
  generateContract,
  staticModel
} from "../src/index.js";

const Profile = z.object({
  name: z.string(),
  seniority: z.enum(["junior", "mid", "senior"]),
  skills: z.array(z.string()).min(1)
});

describe("generateContract", () => {
  it("returns validated data from strict JSON", async () => {
    const result = await generateContract({
      model: staticModel([
        JSON.stringify({ name: "Mira", seniority: "senior", skills: ["infra"] })
      ]),
      schema: Profile,
      prompt: "Extract the profile."
    });

    expect(result.data.name).toBe("Mira");
    expect(result.attempts).toBe(1);
  });

  it("extracts JSON from a fenced response", async () => {
    const result = await generateContract({
      model: staticModel([
        "```json\n{\"name\":\"Lee\",\"seniority\":\"mid\",\"skills\":[\"ml\"]}\n```"
      ]),
      schema: Profile,
      prompt: "Extract the profile."
    });

    expect(result.data).toEqual({
      name: "Lee",
      seniority: "mid",
      skills: ["ml"]
    });
  });

  it("repairs validation failures using a retry prompt", async () => {
    const prompts: string[] = [];

    const result = await generateContract({
      model: {
        async generate(prompt) {
          prompts.push(prompt);
          if (prompts.length === 1) {
            return JSON.stringify({ name: "Ari", seniority: "principal", skills: [] });
          }

          return JSON.stringify({ name: "Ari", seniority: "senior", skills: ["platform"] });
        }
      },
      schema: Profile,
      prompt: "Extract the profile.",
      retries: 1
    });

    expect(result.data.seniority).toBe("senior");
    expect(result.attempts).toBe(2);
    expect(prompts[1]).toContain("Return only corrected JSON");
    expect(result.replay.attempts[0]?.issues).toHaveLength(2);
  });

  it("emits useful events", async () => {
    const events: string[] = [];

    await generateContract({
      model: staticModel([
        JSON.stringify({ name: "Noor", seniority: "junior", skills: ["ops"] })
      ]),
      schema: Profile,
      prompt: "Extract the profile.",
      onEvent(event) {
        events.push(event.type);
      }
    });

    expect(events).toEqual(["attempt", "success"]);
  });

  it("throws validation errors with replay data", async () => {
    await expect(
      generateContract({
        model: staticModel([JSON.stringify({ name: "Kai", seniority: "staff", skills: [] })]),
        schema: Profile,
        prompt: "Extract the profile."
      })
    ).rejects.toMatchObject({
      name: "ContractValidationError",
      replay: {
        attempts: [
          expect.objectContaining({
            attempt: 1,
            rawText: expect.any(String)
          })
        ]
      }
    } satisfies Partial<ContractValidationError>);
  });

  it("throws parse errors after retries are exhausted", async () => {
    await expect(
      generateContract({
        model: staticModel(["not json", "still not json"]),
        schema: Profile,
        prompt: "Extract the profile.",
        retries: 1
      })
    ).rejects.toBeInstanceOf(ContractParseError);
  });
});
