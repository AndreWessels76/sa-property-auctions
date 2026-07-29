export interface ImageValidationResult {

    valid: boolean;

    errors: string[];

    width: number | null;

    height: number | null;

    mime: string;

    size: number;

}