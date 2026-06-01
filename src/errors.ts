import type { ContractIssue, ContractReplay } from "./types.js";

export class ContractError extends Error {
  readonly replay: ContractReplay;
  readonly issues: ContractIssue[];

  constructor(message: string, replay: ContractReplay, issues: ContractIssue[] = []) {
    super(message);
    this.name = "ContractError";
    this.replay = replay;
    this.issues = issues;
  }
}

export class ContractParseError extends ContractError {
  constructor(replay: ContractReplay) {
    super("Model response was not valid JSON.", replay);
    this.name = "ContractParseError";
  }
}

export class ContractValidationError extends ContractError {
  constructor(replay: ContractReplay, issues: ContractIssue[]) {
    super("Model response did not satisfy the contract schema.", replay, issues);
    this.name = "ContractValidationError";
  }
}
