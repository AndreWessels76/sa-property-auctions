export interface SafetyArea{

    suburb:string;

    province:string;

    safetyScore:number;

    violentCrime:number;

    propertyCrime:number;

    burglary:number;

    vehicleCrime:number;

    trend:"Improving"|"Stable"|"Declining";

}
