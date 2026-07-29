export interface CalibrationRecord {

    propertyId: string;

    predictedValue: number;

    actualSalePrice: number;

    errorAmount: number;

    errorPercentage: number;

    confidence: number;

    createdAt: Date;

}
