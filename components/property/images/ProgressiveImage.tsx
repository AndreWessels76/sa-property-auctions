"use client";

import Image from "next/image";
import { useProgressiveImage } from "./useProgressiveImage";

interface Props {
  large: string;
  medium: string;
  thumbnail: string;
  blur: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function ProgressiveImage({
  large,
  medium,
  thumbnail,
  blur,
  alt,
  className,
  sizes,
  priority,
}: Props) {

  const loaded = useProgressiveImage(large);

  return (
    <Image
      src={loaded ? large : medium || thumbnail}
      alt={alt}
      fill
      sizes={
        sizes ??
        `(max-width:768px) 100vw,
         (max-width:1200px) 50vw,
         33vw`
      }
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      placeholder={blur ? "blur" : "empty"}
      blurDataURL={blur || undefined}
      className={className}
    />
  );

}
