import type { CouncilRequest } from "@/types/council";

export const exampleDecisionRequest: CouncilRequest = {
  title: "Open AI conversation versus guided citizen journeys",
  question:
    "Should Prodignus allow citizens to interact freely with an AI assistant, or should the experience remain centered on guided journeys?",
  context:
    "Prodignus serves citizens who may have low digital literacy, functional illiteracy, urgent social needs, and limited understanding of public services.",
  constraints:
    "The MVP has a small team, limited budget, and a high responsibility to minimize risk to vulnerable citizens.",
};
