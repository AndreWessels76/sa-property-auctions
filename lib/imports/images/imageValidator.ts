import { IMAGE_CONFIG } from "./imageConfig";
import { ImageValidationResult } from "./imageValidationTypes";

export async function validateImage(

    blob: Blob

): Promise<ImageValidationResult> {

    const errors: string[] = [];

    const mime = blob.type;

    const size = blob.size;

    if (

        !IMAGE_CONFIG.allowedMimeTypes.includes(mime)

    ) {

        errors.push("Unsupported MIME type");

    }

    if (

        size >

        IMAGE_CONFIG.maxSizeMB *

        1024 *

        1024

    ) {

        errors.push("Image exceeds size limit");

    }

    let width: number | null = null;
    let height: number | null = null;

    try {

        const bitmap =
            await createImageBitmap(blob);

        width = bitmap.width;
        height = bitmap.height;

        bitmap.close();

    } catch {

        errors.push("Image is corrupted");

    }

    if (

        width !== null &&
        width < IMAGE_CONFIG.minWidth

    ) {

        errors.push("Image width too small");

    }

    if (

        height !== null &&
        height < IMAGE_CONFIG.minHeight

    ) {

        errors.push("Image height too small");

    }

    if (

        width !== null &&
        width > IMAGE_CONFIG.maxWidth

    ) {

        errors.push("Image width too large");

    }

    if (

        height !== null &&
        height > IMAGE_CONFIG.maxHeight

    ) {

        errors.push("Image height too large");

    }

    return {

        valid: errors.length === 0,

        errors,

        width,

        height,

        mime,

        size

    };

}