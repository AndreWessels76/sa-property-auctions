import sharp from "sharp";

export async function generateBlurPlaceholder(

    buffer: Buffer

): Promise<string> {

    const resized = await sharp(buffer)

        .resize(20, 20, {

            fit: "inside"

        })

        .blur()

        .webp({

            quality: 35

        })

        .toBuffer();

    return `data:image/webp;base64,${resized.toString("base64")}`;

}