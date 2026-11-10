export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

export function dashboardUrl(): string {
  return getAppUrl()
}

export function themeUrl(themeId: string): string {
  return `${getAppUrl()}/themes/${themeId}`
}

export function mcpUrl(): string {
  return `${getAppUrl()}/api/mcp`
}
