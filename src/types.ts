export type ContractEvent =
  | {
      type: "attempt";
      attempt: number;
      prompt: string;
    }
  | {
      type: "parse_error";
      attempt: number;
      rawText: string;
      error: string;
    }
  | {
      type: "validation_error";
      attempt: number;
      rawText: string;
      parsed: unknown;
      issues: ContractIssue[];
    }
  | {
      type: "success";
      attempt: number;
      rawText: string;
      data: unknown;
    }
  | {
      type: "failure";
      attempts: number;
      replay: ContractReplay;
    };

export type ContractIssue = {
  path: string;
  message: string;
  code?: string;
};

export type ContractReplay = {
  prompt: string;
  attempts: ContractReplayAttempt[];
  createdAt: string;
};

export type ContractReplayAttempt = {
  attempt: number;
  prompt: string;
  rawText?: string;
  parsed?: unknown;
  error?: string;
  issues?: ContractIssue[];
};

export type ContractSchema<T> = {
  parse(value: unknown): T;
};

export type ContractModel = {
  generate(prompt: string, context: ContractModelContext): Promise<ContractModelResponse>;
};

export type ContractModelContext = {
  attempt: number;
  signal?: AbortSignal;
  previous?: ContractReplayAttempt;
};

export type ContractModelResponse =
  | string
  | {
      text: string;
      metadata?: Record<string, unknown>;
    };

export type ContractOptions<T> = {
  model: ContractModel;
  schema: ContractSchema<T>;
  prompt: string;
  retries?: number;
  signal?: AbortSignal;
  onEvent?: (event: ContractEvent) => void;
  repairPrompt?: (input: RepairPromptInput) => string;
};

export type RepairPromptInput = {
  originalPrompt: string;
  lastAttempt: ContractReplayAttempt;
  issues: ContractIssue[];
};

export type ContractResult<T> = {
  data: T;
  attempts: number;
  rawText: string;
  replay: ContractReplay;
};
