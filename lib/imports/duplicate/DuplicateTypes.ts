import { PropertyModel } from "../normalizer/PropertyModel";

export interface DuplicateResult {

    duplicate: boolean;

    confidence: number;

    existing?: PropertyModel;

}