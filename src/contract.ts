import { ContractParseError, ContractValidationError } from "./errors.js";
import { normalizeIssues } from "./issues.js";
import { parseJsonObject } from "./json.js";
import type {
  ContractIssue,
  ContractOptions,
  ContractReplay,
  ContractReplayAttempt,
  ContractResult,
  RepairPromptInput
} from "./types.js";

export async function generateContract<T>(options: ContractOptions<T>): Promise<ContractResult<T>> {
  const maxAttempts = Math.max(1, (options.retries ?? 0) + 1);
  const replay: ContractReplay = {
    prompt: options.prompt,
    attempts: [],
    createdAt: new Date().toISOString()
  };
  let prompt = options.prompt;
  let lastIssues: ContractIssue[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options.onEvent?.({ type: "attempt", attempt, prompt });

    const previous = replay.attempts.at(-1);
    const response = await options.model.generate(prompt, {
      attempt,
      signal: options.signal,
      previous
    });
    const rawText = typeof response === "string" ? response : response.text;
    const replayAttempt: ContractReplayAttempt = { attempt, prompt, rawText };
    replay.attempts.push(replayAttempt);

    let parsed: unknown;
    try {
      parsed = parseJsonObject(rawText);
      replayAttempt.parsed = parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
      replayAttempt.error = message;
      options.onEvent?.({ type: "parse_error", attempt, rawText, error: message });
      prompt = buildRepairPrompt({
        originalPrompt: options.prompt,
        lastAttempt: replayAttempt,
        issues: [{ path: "", message }]
      }, options.repairPrompt);
      continue;
    }

    try {
      const data = options.schema.parse(parsed);
      options.onEvent?.({ type: "success", attempt, rawText, data });
      return {
        data,
        attempts: attempt,
        rawText,
        replay
      };
    } catch (error) {
      const issues = normalizeIssues(error);
      lastIssues = issues;
      replayAttempt.issues = issues;
      options.onEvent?.({ type: "validation_error", attempt, rawText, parsed, issues });
      prompt = buildRepairPrompt({
        originalPrompt: options.prompt,
        lastAttempt: replayAttempt,
        issues
      }, options.repairPrompt);
    }
  }

  options.onEvent?.({ type: "failure", attempts: replay.attempts.length, replay });

  const lastAttempt = replay.attempts.at(-1);
  if (lastAttempt?.parsed === undefined) {
    throw new ContractParseError(replay);
  }

  throw new ContractValidationError(replay, lastIssues);
}

function buildRepairPrompt(
  input: RepairPromptInput,
  customRepairPrompt: ContractOptions<unknown>["repairPrompt"]
): string {
  if (customRepairPrompt) {
    return customRepairPrompt(input);
  }

  const issueText = input.issues
    .map((issue) => `- ${issue.path || "(root)"}: ${issue.message}`)
    .join("\n");

  return [
    input.originalPrompt,
    "",
    "The previous response failed the output contract.",
    "Return only corrected JSON. Do not include markdown or explanatory text.",
    "",
    "Issues:",
    issueText,
    "",
    "Previous response:",
    input.lastAttempt.rawText ?? input.lastAttempt.error ?? ""
  ].join("\n");
}
