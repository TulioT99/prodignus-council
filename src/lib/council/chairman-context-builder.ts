import "server-only";

import { councilConfig } from "@/config/council";
import { ChairmanContextBuildError } from "@/lib/council/chairman-context.errors";
import type {
  ChairmanAdvisorContext,
  ChairmanContext,
  ChairmanContextBuildInput,
  ChairmanContextBuilder,
  ChairmanRequestContext,
  Clock,
} from "@/lib/council/chairman-context.types";
import { systemClock } from "@/lib/council/chairman-context.types";
import type { AdvisorResult, DecisionContext } from "@/types/council";

function freezeRequestContext(
  decisionContext: DecisionContext,
): ChairmanRequestContext {
  return Object.freeze({
    executionId: decisionContext.executionId,
    decisionId: decisionContext.decisionId,
    title: decisionContext.title,
    question: decisionContext.question,
    language: decisionContext.language,
    context: decisionContext.context,
    constraints: decisionContext.constraints,
    objectives: decisionContext.objectives,
    attachments: Object.freeze([...decisionContext.attachments]),
    timestamp: decisionContext.timestamp,
    status: decisionContext.status,
    owner: decisionContext.owner,
  });
}

function mapAdvisor(advisor: AdvisorResult): ChairmanAdvisorContext {
  const advisorId = advisor.persona.id?.trim();

  if (!advisorId) {
    throw new ChairmanContextBuildError(
      "MISSING_ADVISOR_ID",
      "An advisor result is missing a stable persona identifier.",
    );
  }

  return Object.freeze({
    advisorId,
    advisorName: advisor.persona.displayName,
    thinkingLens: advisor.persona.thinkingLens,
    result: advisor,
    execution: Object.freeze({
      status: advisor.status,
      source: advisor.source,
      executionId: advisor.executionId,
      durationMs: advisor.durationMs,
      totalTokens: advisor.totalTokens,
      configuredModel: advisor.persona.model,
      errorMessage: advisor.errorMessage,
    }),
  });
}

function validateInput(input: ChairmanContextBuildInput | undefined): void {
  if (!input) {
    throw new ChairmanContextBuildError(
      "INVALID_BUILD_INPUT",
      "Chairman context build input is required.",
    );
  }

  if (!input.decisionContext) {
    throw new ChairmanContextBuildError(
      "MISSING_DECISION_CONTEXT",
      "Decision context is required to build Chairman context.",
    );
  }

  if (!input.decisionContext.question?.trim()) {
    throw new ChairmanContextBuildError(
      "MISSING_QUESTION",
      "The decision question is required to build Chairman context.",
    );
  }

  if (!input.advisors) {
    throw new ChairmanContextBuildError(
      "MISSING_ADVISORS",
      "Advisor results are required to build Chairman context.",
    );
  }
}

export class DefaultChairmanContextBuilder implements ChairmanContextBuilder {
  private readonly clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.clock = clock;
  }

  build(input: ChairmanContextBuildInput): ChairmanContext {
    validateInput(input);

    const { decisionContext, advisors } = input;
    const request = freezeRequestContext(decisionContext);
    const mappedAdvisors = Object.freeze(advisors.map((advisor) => mapAdvisor(advisor)));

    return Object.freeze({
      schemaVersion: "1.0",
      request,
      advisors: mappedAdvisors,
      metadata: Object.freeze({
        executionId: decisionContext.executionId,
        decisionId: decisionContext.decisionId,
        advisorCount: advisors.length,
        createdAt: decisionContext.timestamp,
        contextBuiltAt: this.clock.now(),
        pipelineVersion: councilConfig.version,
        language: decisionContext.language,
      }),
      collectiveIntelligence: Object.freeze({}),
    });
  }
}

export const defaultChairmanContextBuilder = new DefaultChairmanContextBuilder();
