import { PropertyModel } from "../normalizer/PropertyModel";

export function buildDuplicatePrompt(

  incoming: PropertyModel,

  existing: PropertyModel

) {

return `

Compare these two South African properties.

Property A

${JSON.stringify(incoming, null, 2)}

Property B

${JSON.stringify(existing, null, 2)}

Determine:

1. Are they the same property?

2. Confidence 0-100

3. Explain why.

4. Recommend:

MERGE

INSERT

MANUAL_REVIEW

Return JSON only.

`;

}