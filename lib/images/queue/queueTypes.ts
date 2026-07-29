export type ImageJobStatus =
    | "pending"
    | "processing"
    | "completed"
    | "failed";

export interface ImageJob {

    id: string;

    propertyId: string;

    imageUrl: string;

    retries: number;

    status: ImageJobStatus;

    createdAt: Date;

}