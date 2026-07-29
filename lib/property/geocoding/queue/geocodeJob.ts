export interface GeocodeJob {

    id: string;

    propertyId: string;

    address: string;

    retries: number;

    status:
        | "pending"
        | "processing"
        | "completed"
        | "failed";

}
