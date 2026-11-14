const productionHeaders: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'report-sample'",
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-src 'self'",
    'upgrade-insecure-requests'
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Strict-Transport-Security': 'max-age=300',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()'
}

export const getSecurityHeaders = (isProduction: boolean): Record<string, string> => {
  if (isProduction) return {...productionHeaders}

  const developmentHeaders = {...productionHeaders}
  delete developmentHeaders['Content-Security-Policy']
  delete developmentHeaders['Strict-Transport-Security']
  return {...developmentHeaders}
}
