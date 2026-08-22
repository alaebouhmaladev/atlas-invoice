export function isSameOriginRequestUrl(value: string, expectedHost: string): boolean {
  try {
    return new URL(value).host === expectedHost
  } catch {
    return false
  }
}
