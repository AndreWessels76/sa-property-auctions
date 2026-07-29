import { QueueState } from "./queueState";

export const VALID_TRANSITIONS: Record<QueueState, QueueState[]> = {

    pending: [

        "reserved"

    ],

    reserved: [

        "processing",

        "pending"

    ],

    processing: [

        "completed",

        "failed"

    ],

    failed: [

        "retry_waiting"

    ],

    retry_waiting: [

        "reserved"

    ],

    completed: []

};
