export type QueueState =
    | "pending"
    | "reserved"
    | "processing"
    | "completed"
    | "failed"
    | "retry_waiting";
