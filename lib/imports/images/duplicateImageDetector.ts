import { hashImage } from "./hashImage";
import { getImageHash } from "./imageHashService";

export async function findDuplicateImage(blob: Blob) {

    const hash = await hashImage(blob);

    const existing =
        await getImageHash(hash);

    return {

        duplicate: !!existing,

        hash,

        existing

    };

}