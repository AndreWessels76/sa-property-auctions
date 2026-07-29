import { downloadImage } from "./downloadImage";
import { blobToFile } from "./blobToFile";
import { uploadPropertyImage } from "./storage";
import { saveImage } from "./imageService";

export async function processImage(

    propertyId: string,

    imageUrl: string,

    source: string

){

    const blob =
        await downloadImage(imageUrl);

    const file =
        blobToFile(
            blob,
            "image.jpg"
        );

    const publicUrl =
        await uploadPropertyImage(
            file,
            propertyId
        );

    await saveImage(

        propertyId,

        publicUrl,

        false,

        source

    );

}