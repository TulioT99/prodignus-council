import { getAdvisorPersonaById } from "@/data/advisor-personas";
import type {
  AdvisorResult,
  ChairmanResult,
  CouncilResult,
  Decision,
} from "@/types/council";

const MOCK_CHAIRMAN: ChairmanResult = {
  decision: "test_first",
  executiveSummary:
    "The council agrees that unbounded AI conversation introduces disproportionate risk for Prodignus's core audience, but also recognizes that selective AI assistance could improve completion rates within guided journeys. A controlled pilot is the prudent path before any platform-wide conversational shift.",
  areasOfAgreement: [
    "Guided journeys remain the primary interaction model for vulnerable citizens.",
    "Any AI capability must include guardrails, escalation paths, and human oversight.",
    "Operational constraints require incremental delivery rather than a full pivot.",
  ],
  areasOfDisagreement: [
    "Whether open-ended AI should be offered as a secondary entry point at all.",
    "The scope and duration of an initial pilot versus a longer research phase.",
    "How aggressively to invest in conversational UX versus journey optimization.",
  ],
  criticalAssumptions: [
    "Frontline staff can support citizens during a pilot without added operational burden.",
    "Guardrails can reliably prevent harmful or misleading guidance at scale.",
    "Citizens with low digital literacy will still benefit from bounded AI assistance.",
  ],
  principalRisks: [
    "Pilot results may not generalize across municipalities with different support capacity.",
    "Scope creep from a limited AI feature into a full conversational product.",
    "Reputational harm if early AI responses fail in high-stakes eligibility scenarios.",
  ],
  upside: [
    "Higher journey completion rates with contextual, in-flow assistance.",
    "Reduced caseworker load for repetitive clarification questions.",
    "Evidence base for future product decisions grounded in real citizen behavior.",
  ],
  recommendedActions: [
    "Run a 12-week pilot embedding bounded AI prompts inside two high-volume guided journeys, with mandatory human escalation for eligibility decisions.",
    "Establish an evaluation framework measuring completion rate, error rate, escalation frequency, and citizen comprehension before expanding scope.",
    "Document governance requirements for prompt design, content review, and incident response before any production deployment.",
  ],
  finalRecommendation:
    "Proceed with a tightly scoped test-first pilot of AI assistance embedded within guided journeys. Do not launch open-ended citizen-facing AI conversation until pilot metrics and governance controls demonstrate safe, measurable value.",
  confidence: 0.78,
};

const MOCK_ADVISOR_ANALYSES: Omit<AdvisorResult, "persona" | "source">[] = [
  {
    status: "success",
    summary:
      "The decision should be rebuilt from the citizen outcome: reliable access to entitled support, not the interaction modality.",
    analysis: [
      {
        title: "Fundamental citizen need",
        description:
          "The framing assumes a binary between guided journeys and open AI conversation, but the underlying need is trustworthy navigation of complex public programs.",
      },
      {
        title: "Verifiability test",
        description:
          "Open conversation optimizes flexibility but weakens verifiability. Guided journeys optimize verifiability but may under-serve edge cases. A hybrid bounded-assistance model inside journeys preserves auditability while addressing variation in citizen needs.",
      },
    ],
    assumptions: [
      "Journey completion correlates with successful program access.",
      "Bounded assistance can cover the majority of citizen variation.",
      "Governance infrastructure can be designed before scale.",
    ],
    risks: [
      "Hybrid models may become politically interpreted as 'hidden' open AI.",
      "Over-indexing on structure may exclude legitimate edge-case needs.",
      "Policy teams may delay decisions while seeking perfect certainty.",
    ],
    recommendation: "proceed_with_conditions",
    confidence: 0.81,
    durationMs: 1040,
    totalTokens: 2105,
  },
  {
    status: "success",
    summary:
      "Strategic upside exists in contextual AI, but only if deployed as an accelerator within journeys rather than a parallel product surface.",
    analysis: [
      {
        title: "Strategic risk profile",
        description:
          "From a product strategy lens, open AI conversation is a high-ceiling, high-risk bet for a team with constrained capacity. Guided journeys are the defensible core experience for the current market.",
      },
      {
        title: "Expansion path",
        description:
          "The expansion opportunity lies in embedding AI where it reduces friction: clarifying form fields, explaining next steps, and adapting language to literacy level. This preserves the journey as the product backbone while capturing long-term value from conversational intelligence.",
      },
    ],
    assumptions: [
      "Completion rate is the primary near-term success metric.",
      "Embedded AI features can ship incrementally without platform rework.",
      "Citizens will accept AI assistance when it stays inside familiar flows.",
    ],
    risks: [
      "Pilot success in one journey may not transfer to others with different complexity.",
      "Stakeholders may pressure for open chat once any AI capability exists.",
      "UX debt from bolting AI onto legacy journey structures.",
    ],
    recommendation: "test_first",
    confidence: 0.77,
    durationMs: 880,
    totalTokens: 1762,
  },
  {
    status: "success",
    summary:
      "Consumer platforms rarely expose unconstrained AI to vulnerable users; they use guided flows with intelligent assistance behind the scenes.",
    analysis: [
      {
        title: "Cross-industry pattern",
        description:
          "Outside GovTech, successful digital products for non-expert users favor structured paths with optional help layers. Open chat is typically reserved for power users or support escalation, not primary task completion.",
      },
      {
        title: "Resource allocation",
        description:
          "Prodignus should adopt this pattern: guided journeys as the default product, with AI acting as a copilot that never leaves the journey context. Attempting to compete on conversational openness would misallocate a small team's resources.",
      },
    ],
    assumptions: [
      "Citizens compare Prodignus implicitly to banking and health portals, not ChatGPT.",
      "Perceived safety matters more than perceived innovation.",
      "Competitive pressure for 'AI features' can be managed through bounded pilots.",
    ],
    risks: [
      "Under-investing in AI may slow modernization relative to peer platforms.",
      "External vendors may oversell conversational capabilities.",
      "Internal teams may underestimate integration complexity.",
    ],
    recommendation: "proceed_with_conditions",
    confidence: 0.74,
    durationMs: 960,
    totalTokens: 1920,
  },
  {
    status: "success",
    summary:
      "Open AI conversation requires a separate safety, logging, and content pipeline that the current team cannot responsibly operate at launch scale.",
    analysis: [
      {
        title: "Architectural contrast",
        description:
          "Guided journeys provide deterministic state transitions, testable content, and clear audit trails. Open conversational interfaces require prompt management, retrieval grounding, moderation, rate limiting, session persistence, and incident replay.",
      },
      {
        title: "Execution path",
        description:
          "With a small team and limited budget, the execution path is to extend the existing journey engine with a bounded AI module sharing the same governance layer. A test-first approach allows the team to validate infrastructure before committing to a conversational front door.",
      },
    ],
    assumptions: [
      "Existing journey infrastructure can host an AI module without full rewrite.",
      "Pilot traffic will be sufficient to stress-test operational tooling.",
      "Human escalation can be integrated into current service workflows.",
    ],
    risks: [
      "Underestimated effort in grounding AI responses to authoritative content.",
      "Operational on-call burden during pilot may exceed team capacity.",
      "Technical debt if pilot code bypasses established release controls.",
    ],
    recommendation: "test_first",
    confidence: 0.83,
    durationMs: 1020,
    totalTokens: 2040,
  },
];

const MOCK_ADVISOR_PERSONA_IDS = ["ADV-002", "ADV-003", "ADV-004", "ADV-005"] as const;

export function createMockAdvisorResults(): AdvisorResult[] {
  return MOCK_ADVISOR_ANALYSES.map((analysis, index) => ({
    persona: getAdvisorPersonaById(MOCK_ADVISOR_PERSONA_IDS[index]),
    source: "mock" as const,
    ...analysis,
  }));
}

function sortAdvisors(advisors: AdvisorResult[]): AdvisorResult[] {
  return [...advisors].sort((left, right) => left.persona.id.localeCompare(right.persona.id));
}

export function createFailedContrarianResult(errorMessage: string): AdvisorResult {
  return {
    persona: getAdvisorPersonaById("ADV-001"),
    source: "live",
    status: "failed",
    summary: "",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "insufficient_information",
    confidence: 0,
    durationMs: 0,
    totalTokens: 0,
    errorMessage,
  };
}

export function createCouncilResult(
  decision: Decision,
  contrarian: AdvisorResult,
): CouncilResult {
  const mockAdvisors = createMockAdvisorResults();
  const advisors = sortAdvisors([contrarian, ...mockAdvisors]);
  const successfulAdvisors = advisors.filter((advisor) => advisor.status === "success");
  const totalDurationMs = advisors.reduce((total, advisor) => total + advisor.durationMs, 0);

  let status: CouncilResult["status"] = "complete";

  if (contrarian.status === "failed") {
    status = successfulAdvisors.length >= 3 ? "partial" : "failed";
  }

  return {
    decision,
    status,
    advisors,
    chairman: MOCK_CHAIRMAN,
    totalDurationMs,
  };
}
