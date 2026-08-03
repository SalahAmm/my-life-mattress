export function chooseLogoSrc(logoPath: string | null, bundledUri: string | null): string | null {
  return logoPath || bundledUri
}
