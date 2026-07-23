import "server-only";

export type OpenRouterCaller = "advisor" | "chairman";

export type OpenRouterExecutionContext = {
  caller: OpenRouterCaller;
  executionId: string;
  advisorId?: string;
};
