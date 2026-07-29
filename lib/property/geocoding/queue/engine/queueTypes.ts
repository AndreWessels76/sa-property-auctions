export type QueueType =
    | "IMPORT"
    | "IMAGE"
    | "GEOCODE"
    | "AI"
    | "EMAIL"
    | "NOTIFICATION"
    | "REPORT"
    | "CLEANUP";

export type QueueStatus =
    | "pending"
    | "reserved"
    | "processing"
    | "completed"
    | "failed"
    | "retry_waiting";

export interface QueueJob {

    id: string;

    type: QueueType;

    payload: Record<string, unknown>;

    retries: number;

    priority: number;

    status: QueueStatus;

}
