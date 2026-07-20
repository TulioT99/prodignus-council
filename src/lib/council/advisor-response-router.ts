import "server-only";

import { buildDeliveryEngineeringPrompts } from "@/lib/council/advisors/delivery-engineering-prompt";
import { parseDeliveryEngineeringResponseContent } from "@/lib/council/advisors/delivery-engineering-response-parser";
import { buildHumanImpactPrompts } from "@/lib/council/advisors/human-impact-prompt";
import { parseHumanImpactResponseContent } from "@/lib/council/advisors/human-impact-response-parser";
import { buildProductStrategyPrompts } from "@/lib/council/advisors/product-strategy-prompt";
import { parseProductStrategyResponseContent } from "@/lib/council/advisors/product-strategy-response-parser";
import { buildUxAccessibilityPrompts } from "@/lib/council/advisors/ux-accessibility-prompt";
import { parseUxAccessibilityResponseContent } from "@/lib/council/advisors/ux-accessibility-response-parser";
import { buildAdvisorPrompts } from "@/lib/council/advisor-prompt";
import { parseAdvisorResponseContent } from "@/lib/council/response-parser";
import type {
  AdvisorPersona,
  AdvisorResponseContent,
  DecisionContext,
  DeliveryEngineeringResponseContent,
  HumanImpactResponseContent,
  ProductStrategyResponseContent,
  UxAccessibilityResponseContent,
} from "@/types/council";

export function buildAdvisorPromptsForPersona(
  decisionContext: DecisionContext,
  persona: AdvisorPersona,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  if (persona.id === "ADV-002") {
    return buildProductStrategyPrompts(decisionContext);
  }

  if (persona.id === "ADV-003") {
    return buildUxAccessibilityPrompts(decisionContext);
  }

  if (persona.id === "ADV-004") {
    return buildDeliveryEngineeringPrompts(decisionContext);
  }

  if (persona.id === "ADV-005") {
    return buildHumanImpactPrompts(decisionContext);
  }

  return buildAdvisorPrompts(decisionContext, persona);
}

export function parseAdvisorResponseForPersona(
  advisorId: string,
  content: string,
): AdvisorResponseContent | ProductStrategyResponseContent | UxAccessibilityResponseContent | DeliveryEngineeringResponseContent | HumanImpactResponseContent {
  if (advisorId === "ADV-002") {
    return parseProductStrategyResponseContent(content);
  }

  if (advisorId === "ADV-003") {
    return parseUxAccessibilityResponseContent(content);
  }

  if (advisorId === "ADV-004") {
    return parseDeliveryEngineeringResponseContent(content);
  }

  if (advisorId === "ADV-005") {
    return parseHumanImpactResponseContent(content);
  }

  return parseAdvisorResponseContent(content);
}

export function mapAdvisorResponseToResultFields(
  advisorId: string,
  content:
    | AdvisorResponseContent
    | ProductStrategyResponseContent
    | UxAccessibilityResponseContent
    | DeliveryEngineeringResponseContent
    | HumanImpactResponseContent,
): Pick<
  AdvisorResponseContent,
  "summary" | "analysis" | "assumptions" | "risks" | "recommendation" | "confidence"
> & {
  keyArguments?: string[];
  unknowns?: string[];
  accessibilityConcerns?: string[];
  journeyBarriers?: string[];
  engineeringConcerns?: string[];
  operationalConcerns?: string[];
  technicalAlternatives?: string[];
  humanImpact?: string[];
  ethicalConcerns?: string[];
  inclusionConcerns?: string[];
  longTermEffects?: string[];
} {
  if (advisorId === "ADV-002") {
    const productContent = content as ProductStrategyResponseContent;

    return {
      summary: productContent.summary,
      analysis: productContent.analysis,
      assumptions: productContent.assumptions,
      risks: productContent.risks,
      recommendation: productContent.recommendation,
      confidence: productContent.confidence,
      keyArguments: productContent.keyArguments,
      unknowns: productContent.unknowns,
    };
  }

  if (advisorId === "ADV-003") {
    const uxContent = content as UxAccessibilityResponseContent;

    return {
      summary: uxContent.summary,
      analysis: uxContent.analysis,
      assumptions: [],
      risks: uxContent.risks,
      recommendation: uxContent.recommendation,
      confidence: uxContent.confidence,
      keyArguments: uxContent.keyArguments,
      unknowns: uxContent.unknowns,
      accessibilityConcerns: uxContent.accessibilityConcerns,
      journeyBarriers: uxContent.journeyBarriers,
    };
  }

  if (advisorId === "ADV-004") {
    const engineeringContent = content as DeliveryEngineeringResponseContent;

    return {
      summary: engineeringContent.summary,
      analysis: engineeringContent.analysis,
      assumptions: [],
      risks: engineeringContent.risks,
      recommendation: engineeringContent.recommendation,
      confidence: engineeringContent.confidence,
      keyArguments: engineeringContent.keyArguments,
      unknowns: engineeringContent.unknowns,
      engineeringConcerns: engineeringContent.engineeringConcerns,
      operationalConcerns: engineeringContent.operationalConcerns,
      technicalAlternatives: engineeringContent.technicalAlternatives,
    };
  }

  if (advisorId === "ADV-005") {
    const humanImpactContent = content as HumanImpactResponseContent;

    return {
      summary: humanImpactContent.summary,
      analysis: humanImpactContent.analysis,
      assumptions: [],
      risks: humanImpactContent.risks,
      recommendation: humanImpactContent.recommendation,
      confidence: humanImpactContent.confidence,
      keyArguments: humanImpactContent.keyArguments,
      unknowns: humanImpactContent.unknowns,
      humanImpact: humanImpactContent.humanImpact,
      ethicalConcerns: humanImpactContent.ethicalConcerns,
      inclusionConcerns: humanImpactContent.inclusionConcerns,
      longTermEffects: humanImpactContent.longTermEffects,
    };
  }

  const standardContent = content as AdvisorResponseContent;

  return {
    summary: standardContent.summary,
    analysis: standardContent.analysis,
    assumptions: standardContent.assumptions,
    risks: standardContent.risks,
    recommendation: standardContent.recommendation,
    confidence: standardContent.confidence,
  };
}
