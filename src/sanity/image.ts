/* Images from Sanity's image CDN.

   Every picture is asked for at the width the hand-written pages served
   (1600), never scaled up past the original, in the best format the browser
   accepts. The width/height attributes come from the asset's own dimensions
   after any crop an editor set, so the page reserves the right box before the
   image arrives, as the fixed attributes on the old pages did. */
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { sanityClient } from './client';

const builder = createImageUrlBuilder(sanityClient);

/** The shape the queries in queries.ts return for an image field. */
export interface SanityImage {
  asset?: {
    _id: string;
    metadata?: { dimensions?: { width?: number | null; height?: number | null } | null } | null;
  } | null;
  crop?: { top?: number | null; bottom?: number | null; left?: number | null; right?: number | null } | null;
  hotspot?: { x?: number | null; y?: number | null; height?: number | null; width?: number | null } | null;
  alt?: string | null;
}

export const urlFor = (image: SanityImage) =>
  builder.image(image as SanityImageSource).auto('format').fit('max');

/** src, width and height for an <img>, at the given display width. */
export function imageAttrs(image: SanityImage, width = 1600) {
  const dimensions = image.asset?.metadata?.dimensions;
  const crop = image.crop ?? {};
  const w = (dimensions?.width ?? 1) * (1 - (crop.left ?? 0) - (crop.right ?? 0));
  const h = (dimensions?.height ?? 1) * (1 - (crop.top ?? 0) - (crop.bottom ?? 0));
  return {
    src: urlFor(image).width(width).url(),
    width,
    height: Math.round((width * h) / w),
  };
}
