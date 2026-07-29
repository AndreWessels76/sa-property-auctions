import { QueueState } from "./queueState";
import { VALID_TRANSITIONS } from "./queueTransitions";

export function canTransition(

    from: QueueState,

    to: QueueState

) {

    return VALID_TRANSITIONS[from].includes(to);

}
