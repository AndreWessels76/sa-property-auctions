import { VisionResult } from "./visionTypes";

export function hasWatermark(

    result: VisionResult

) {

    return result.watermark;

}