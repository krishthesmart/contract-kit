import type { ContractIssue } from "./types.js";

type ZodLikeIssue = {
  path?: Array<string | number>;
  message?: string;
  code?: string;
};

type ZodLikeError = {
  issues: ZodLikeIssue[];
};

export function normalizeIssues(error: unknown): ContractIssue[] {
  if (isZodLikeError(error)) {
    return error.issues.map((issue) => ({
      path: issue.path?.map(String).join(".") ?? "",
      message: issue.message ?? "Invalid value.",
      code: issue.code
    }));
  }

  return [
    {
      path: "",
      message: error instanceof Error ? error.message : "Schema validation failed."
    }
  ];
}

function isZodLikeError(error: unknown): error is ZodLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues)
  );
}
