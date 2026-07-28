/** Resolve Next.js StaticImageData or string imports to a URL string. */
export function assetSrc(img: string | { src: string } | { default: string | { src: string } }): string {
  if (typeof img === 'string') return img
  if ('default' in img) return assetSrc(img.default)
  return img.src
}
