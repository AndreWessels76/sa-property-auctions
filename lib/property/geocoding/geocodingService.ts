import { GeocodingProvider } from "./geocodingProvider";
import { GeocodeResult } from "./geocodingTypes";

export class GeocodingService {

    constructor(

        private provider: GeocodingProvider

    ) {}

    async geocode(

        address: string

    ): Promise<GeocodeResult | null> {

        return this.provider.geocode(address);

    }

}