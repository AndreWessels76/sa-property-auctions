import { GalleryImage } from "./galleryTypes";

export function mapGalleryImage(

image:any

):GalleryImage{

return{

id:image.id,

imageUrl:image.image_url,

thumbnail:image.thumbnail_image,

blur:image.blur_placeholder,

type:image.image_type,

width:image.width,

height:image.height,

quality:image.quality_score,

isHero:image.is_hero

};

}