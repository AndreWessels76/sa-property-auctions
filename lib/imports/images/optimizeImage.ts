import sharp from "sharp";
import { IMAGE_PRESETS } from "./imagePresets";

export async function optimizeImage(
    buffer: Buffer
) {

    const original = sharp(buffer)
        .rotate()
        .withMetadata({});

    const large =
        await original
            .clone()
            .resize({
                width: IMAGE_PRESETS.large.width,
                withoutEnlargement: true
            })
            .webp({
                quality: IMAGE_PRESETS.large.quality
            })
            .toBuffer();

    const medium =
        await original
            .clone()
            .resize({
                width: IMAGE_PRESETS.medium.width,
                withoutEnlargement: true
            })
            .webp({
                quality: IMAGE_PRESETS.medium.quality
            })
            .toBuffer();

    const thumbnail =
        await original
            .clone()
            .resize({
                width: IMAGE_PRESETS.thumbnail.width,
                withoutEnlargement: true
            })
            .webp({
                quality: IMAGE_PRESETS.thumbnail.quality
            })
            .toBuffer();

    return {

        large,

        medium,

        thumbnail

    };

}
