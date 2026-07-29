import { PropertyModel } from "../normalizer/PropertyModel";
import { AIDuplicateDecision } from "./duplicateTypes";

export async function aiDuplicateReview(

  incoming: PropertyModel,

  existing: PropertyModel

): Promise<AIDuplicateDecision> {

  /*
    Future AI integration:

    - OpenAI
    - Azure OpenAI
    - Local LLM

  */

  return {

    duplicate: false,

    confidence: 0,

    reason: "AI review not yet connected.",

    recommendedAction: "MANUAL_REVIEW",

  };

}