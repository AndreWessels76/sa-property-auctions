export async function downloadImage(

    url:string

){

    const response=

        await fetch(url);

    if(!response.ok){

        throw new Error(

            "Image download failed"

        );

    }

    const blob=

        await response.blob();

    return blob;

}