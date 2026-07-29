import { loadWeights } from "./weightRepository";
import { setWeights } from "./weightCache";
import { DEFAULT_WEIGHTS } from "./defaultWeights";

export async function initializeWeights() {

    const rows = await loadWeights();

    if (!rows?.length) {

        return;

    }

    const weights = { ...DEFAULT_WEIGHTS };

    for (const row of rows) {

        if (row.name in weights) {

            weights[row.name as keyof typeof weights] = row.value;

        }

    }

    setWeights(weights);

}
