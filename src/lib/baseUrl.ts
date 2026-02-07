export function getBaseUrl() {
  // Prefer explicit APP URL if you set it (like https://eazyclaw.com)
  if (process.env.APP_URL) return process.env.APP_URL

  // Vercel provides VERCEL_URL without protocol https:// (docs confirm no scheme)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return "http://localhost:3000"
}
