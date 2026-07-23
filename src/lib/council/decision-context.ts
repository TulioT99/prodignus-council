import "server-only";

import { createHash } from "node:crypto";

import { councilConfig } from "@/config/council";
import type {
  CouncilIntegrityDiagnostics,
  Decision,
  DecisionContext,
  DecisionContextAttachment,
} from "@/types/council";
import type { EvidencePackage } from "@/types/pkos";

function freezeAttachments(
  attachments: DecisionContextAttachment[],
): readonly DecisionContextAttachment[] {
  return Object.freeze(
    attachments.map((attachment) =>
      Object.freeze({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
      }),
    ),
  );
}

export function createDecisionContext(
  decision: Decision,
  options?: {
    executionId?: string;
    language?: string;
    attachments?: DecisionContextAttachment[];
    pkosEvidence?: EvidencePackage;
  },
): DecisionContext {
  const attachments = freezeAttachments(options?.attachments ?? []);

  return Object.freeze({
    executionId: options?.executionId ?? crypto.randomUUID(),
    decisionId: decision.id,
    title: decision.title,
    question: decision.question,
    language: options?.language ?? councilConfig.defaultLanguage,
    context: decision.context,
    constraints: decision.constraints,
    objectives: decision.expectedOutcome,
    attachments,
    pkosEvidence: options?.pkosEvidence,
    timestamp: decision.createdAt,
    status: decision.status,
    owner: decision.owner,
  });
}

export function attachEvidenceToDecisionContext(
  context: DecisionContext,
  evidencePackage: EvidencePackage,
): DecisionContext {
  return Object.freeze({
    executionId: context.executionId,
    decisionId: context.decisionId,
    title: context.title,
    question: context.question,
    language: context.language,
    context: context.context,
    constraints: context.constraints,
    objectives: context.objectives,
    attachments: freezeAttachments([...context.attachments]),
    pkosEvidence: evidencePackage,
    timestamp: context.timestamp,
    status: context.status,
    owner: context.owner,
  });
}

export function cloneDecisionContext(context: DecisionContext): DecisionContext {
  return Object.freeze({
    executionId: context.executionId,
    decisionId: context.decisionId,
    title: context.title,
    question: context.question,
    language: context.language,
    context: context.context,
    constraints: context.constraints,
    objectives: context.objectives,
    attachments: freezeAttachments([...context.attachments]),
    pkosEvidence: context.pkosEvidence,
    timestamp: context.timestamp,
    status: context.status,
    owner: context.owner,
  });
}

export function computeContextDigest(context: DecisionContext): string {
  const payload = JSON.stringify({
    executionId: context.executionId,
    question: context.question,
    language: context.language,
    context: context.context,
    constraints: context.constraints,
    objectives: context.objectives ?? "",
    timestamp: context.timestamp,
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildIntegrityDiagnostics(
  context: DecisionContext,
  advisorIds: readonly string[],
): CouncilIntegrityDiagnostics {
  return {
    executionId: context.executionId,
    question: context.question,
    language: context.language,
    contextDigest: computeContextDigest(context),
    advisorIds: [...advisorIds],
  };
}

export function recordDecisionContextIntegrity(
  context: DecisionContext,
  advisorIds: readonly string[],
): CouncilIntegrityDiagnostics {
  const diagnostics = buildIntegrityDiagnostics(context, advisorIds);

  console.info(
    "[Council Integrity]",
    JSON.stringify({
      executionId: diagnostics.executionId,
      language: diagnostics.language,
      contextDigest: diagnostics.contextDigest,
      advisorCount: diagnostics.advisorIds.length,
    }),
  );

  return diagnostics;
}

export function assertAdvisorPromptIntegrity(
  context: DecisionContext,
  userPrompt: string,
): void {
  if (!userPrompt.includes(context.executionId)) {
    throw new Error("Advisor prompt is missing the shared execution ID.");
  }

  if (!userPrompt.includes(context.question)) {
    throw new Error("Advisor prompt is missing the decision question.");
  }

  if (!userPrompt.includes(context.language)) {
    throw new Error("Advisor prompt is missing the execution language.");
  }
}
