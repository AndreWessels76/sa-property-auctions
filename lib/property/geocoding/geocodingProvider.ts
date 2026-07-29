
import { GeocodeResult } from "./geocodingTypes";

export interface GeocodingProvider {

    geocode(

        address: string

    ): Promise<GeocodeResult | null>;

}
