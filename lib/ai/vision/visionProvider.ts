import { VisionResult } from "./visionTypes";

export interface VisionProvider {

    analyze(

        imageUrl: string

    ): Promise<VisionResult>;

}