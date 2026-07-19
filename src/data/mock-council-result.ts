import { advisorPersonas } from "@/data/advisor-personas";
import type {
  AdvisorResult,
  ChairmanResult,
  CouncilResult,
  Decision,
} from "@/types/council";

const personaById = new Map(advisorPersonas.map((persona) => [persona.id, persona]));

function getPersona(id: string) {
  const persona = personaById.get(id);

  if (!persona) {
    throw new Error(`Advisor persona not found: ${id}`);
  }

  return persona;
}

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

const MOCK_ADVISOR_ANALYSES: Omit<AdvisorResult, "persona">[] = [
  {
    status: "success",
    summary:
      "Open AI conversation creates unacceptable exposure for citizens who may follow incorrect guidance on benefits and rights.",
    analysis:
      "In CRAS operations, the highest-risk failures occur when citizens act on incomplete information about eligibility, deadlines, or required documentation. A free-form AI assistant amplifies this risk because users with low digital literacy often cannot distinguish authoritative guidance from plausible but incorrect responses. Guided journeys constrain the decision space and preserve accountability. Introducing open conversation without proven safeguards would shift liability toward Prodignus at a moment when trust is still being established.",
    assumptions: [
      "Citizens will treat AI responses as official guidance.",
      "Error rates in open conversation will exceed those in structured flows.",
      "Support teams cannot absorb increased correction workload.",
    ],
    risks: [
      "Citizens may miss deadlines after receiving incomplete AI guidance.",
      "Misinterpretation of eligibility criteria could reduce access to entitled benefits.",
      "Public incidents involving AI errors would damage institutional credibility.",
    ],
    recommendation: "do_not_proceed",
    confidence: 0.86,
    durationMs: 920,
    totalTokens: 1840,
  },
  {
    status: "success",
    summary:
      "The decision should be rebuilt from the citizen outcome: reliable access to entitled support, not the interaction modality.",
    analysis:
      "The framing assumes a binary between guided journeys and open AI conversation, but the underlying need is trustworthy navigation of complex public programs. First principles suggest decomposing the problem into information retrieval, decision support, and action completion. Open conversation optimizes flexibility but weakens verifiability. Guided journeys optimize verifiability but may under-serve edge cases. A hybrid bounded-assistance model inside journeys preserves auditability while addressing variation in citizen needs. Full open conversation fails the verifiability test without mature governance.",
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
    analysis:
      "From a product strategy lens, open AI conversation is a high-ceiling, high-risk bet for a team with constrained capacity. Guided journeys are the defensible core experience for the current market. The expansion opportunity lies in embedding AI where it reduces friction: clarifying form fields, explaining next steps, and adapting language to literacy level. This preserves the journey as the product backbone while capturing long-term value from conversational intelligence. A pilot can validate whether AI increases completion without re-architecting the entire citizen experience.",
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
    analysis:
      "Outside GovTech, successful digital products for non-expert users favor structured paths with optional help layers. Open chat is typically reserved for power users or support escalation, not primary task completion. Prodignus should adopt this pattern: guided journeys as the default product, with AI acting as a copilot that never leaves the journey context. Attempting to compete on conversational openness would misallocate a small team's resources and set expectations that the organization cannot safely meet in a high-responsibility domain.",
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
    analysis:
      "Architecturally, guided journeys provide deterministic state transitions, testable content, and clear audit trails. Open conversational interfaces require prompt management, retrieval grounding, moderation, rate limiting, session persistence, and incident replay—all before citizen-facing deployment. With a small team and limited budget, the execution path is to extend the existing journey engine with a bounded AI module sharing the same governance layer. A test-first approach allows the team to validate infrastructure, monitoring, and escalation workflows before committing to a conversational front door.",
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

const ADVISOR_PERSONA_IDS = [
  "ADV-001",
  "ADV-002",
  "ADV-003",
  "ADV-004",
  "ADV-005",
] as const;

export function createMockCouncilResult(decision: Decision): CouncilResult {
  const advisors: AdvisorResult[] = MOCK_ADVISOR_ANALYSES.map((analysis, index) => ({
    persona: getPersona(ADVISOR_PERSONA_IDS[index]),
    ...analysis,
  }));

  return {
    decision,
    status: "complete",
    advisors,
    chairman: MOCK_CHAIRMAN,
    totalDurationMs: 4820,
  };
}
