export async function downloadImage(url: string): Promise<Blob> {

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error("Unable to download image.");

    }

    return await response.blob();

}