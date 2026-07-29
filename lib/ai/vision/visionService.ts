import { VisionProvider } from "./visionProvider";

export class VisionService {

    constructor(

        private provider: VisionProvider

    ) {}

    async analyze(

        imageUrl: string

    ) {

        return this.provider.analyze(

            imageUrl

        );

    }

}