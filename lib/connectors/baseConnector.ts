export interface PropertyImportResult {

    success: boolean;

    properties: any[];

    errors: string[];

}

export interface ImportConnector {

    name: string;

    import(): Promise<PropertyImportResult>;

}