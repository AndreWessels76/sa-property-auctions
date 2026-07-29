import Image from "next/image";

interface Props {
  heroImage: string;
  title: string;
  isHero?: boolean;
  className?: string;
}

export default function GalleryImage({
  heroImage,
  title,
  isHero = false,
  className,
}: Props) {

  return (
    <Image
      src={heroImage}
      alt={title}
      fill
      sizes="(max-width:768px) 100vw,
             (max-width:1200px) 50vw,
             33vw"
      priority={isHero}
      className={className}
    />
  );

}
