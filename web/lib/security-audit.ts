import type { HarEntry, SecurityFinding } from './types'

const SECURITY_HEADERS = [
  { name: 'strict-transport-security', label: 'HSTS', description: 'Enforces HTTPS connections' },
  { name: 'x-frame-options', label: 'X-Frame-Options', description: 'Prevents clickjacking' },
  { name: 'content-security-policy', label: 'CSP', description: 'Controls resource loading' },
  { name: 'x-content-type-options', label: 'X-Content-Type-Options', description: 'Prevents MIME sniffing' },
  { name: 'x-xss-protection', label: 'X-XSS-Protection', description: 'Cross-site scripting filter' },
  { name: 'referrer-policy', label: 'Referrer-Policy', description: 'Controls referrer header' },
  { name: 'permissions-policy', label: 'Permissions-Policy', description: 'Controls browser features' },
]

const SENSITIVE_PATTERNS = [
  /[?&]token=[^&\s]{4,}/i,
  /[?&]api[_-]?key=[^&\s]{4,}/i,
  /[?&]password=[^&\s]{4,}/i,
  /[?&]secret=[^&\s]{4,}/i,
  /[?&]auth[_-]?key=[^&\s]{4,}/i,
  /[?&]access[_-]?token=[^&\s]{4,}/i,
  /[?&]session[_-]?id=[^&\s]{4,}/i,
]

const SENSITIVE_PATTERN_LABELS = [
  'token',
  'API key',
  'password',
  'secret',
  'auth key',
  'access token',
  'session ID',
]

function headerValue(headers: { name: string; value: string }[], name: string): string | undefined {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
  return h?.value
}

function hasHeader(headers: { name: string; value: string }[], name: string): boolean {
  return headers.some(h => h.name.toLowerCase() === name.toLowerCase())
}

export function analyzeSecurity(entries: HarEntry[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const seen = new Set<string>()
  const valid = entries.filter((e): e is HarEntry => e != null)

  function add(finding: SecurityFinding) {
    const key = `${finding.category}|${finding.title}`
    if (!seen.has(key)) {
      seen.add(key)
      findings.push(finding)
    }
  }

  const allResponseHeaders = valid.flatMap(e => e.response.headers)
  const allCookies = valid.flatMap(e =>
    e.response.headers
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => h.value)
  )

  // Check missing security headers (on first non-redirect entry)
  const primaryEntry = valid.find(e => e.response.status && e.response.status < 400)
  const primaryResponseHeaders = primaryEntry?.response.headers ?? []

  for (const sh of SECURITY_HEADERS) {
    if (!hasHeader(primaryResponseHeaders, sh.name)) {
      const sampleEntry = valid.find(e => hasHeader(e.response.headers, sh.name))
      add({
        severity: sampleEntry ? 'medium' : 'high',
        category: 'Missing Security Header',
        title: `${sh.label} header not set`,
        detail: `${sh.description}. ${sampleEntry ? `Found on some responses (e.g., ${sampleEntry.request.url}) but not consistently.` : 'Not found on any response.'}`,
        suggestion: `Add \`${sh.name}: <value>\` to your server configuration.`,
      })
    }
  }

  // Check for sensitive data in URLs
  for (const entry of valid) {
    if (!entry?.request?.url) continue
    for (let i = 0; i < SENSITIVE_PATTERNS.length; i++) {
      if (SENSITIVE_PATTERNS[i].test(entry.request.url)) {
        add({
          severity: 'high',
          category: 'Sensitive Data in URL',
          title: `${SENSITIVE_PATTERN_LABELS[i]} exposed in URL`,
          detail: `Request to ${entry.request.url.substring(0, 120)} contains a ${SENSITIVE_PATTERN_LABELS[i]} in the query string. URLs are logged by proxies, browsers, and servers — this leaks credentials.`,
          suggestion: `Move the ${SENSITIVE_PATTERN_LABELS[i]} to a request header (e.g., Authorization: Bearer <token>).`,
        })
        break
      }
    }
  }

  // Check cookies for security flags
  const unsafeCookies = allCookies.filter(c => {
    const ck = c.trim()
    if (!ck) return false
    const parts = ck.split(';').map(p => p.trim().toLowerCase())
    const hasName = parts.length >= 1 && parts[0].length > 0
    const hasSecure = parts.some(p => p === 'secure')
    const hasHttpOnly = parts.some(p => p === 'httponly')
    return hasName && (!hasSecure || !hasHttpOnly)
  })

  if (unsafeCookies.length > 0) {
    const cookieSummary = [...new Set(unsafeCookies.map(c => c.split(';')[0].trim()).filter(Boolean))].slice(0, 5)
    const lackingFlags = unsafeCookies.some(c => !c.toLowerCase().includes('secure')) ? 'Secure, ' : ''
    const lackingHttpOnly = unsafeCookies.some(c => !c.toLowerCase().includes('httponly'))
    const flags = lackingFlags + (lackingHttpOnly ? 'HttpOnly' : '')

    add({
      severity: unsafeCookies.length > 3 ? 'high' : 'medium',
      category: 'Cookie Security',
      title: `${unsafeCookies.length} cookie(s) missing ${flags}flags`,
      detail: `Cookies without ${flags}flags can be intercepted or read by JavaScript. Affected cookies: ${cookieSummary.join(', ')}${unsafeCookies.length > 5 ? `, and ${unsafeCookies.length - 5} more` : ''}.`,
      suggestion: `Set \`Set-Cookie: <name>=<value>; Secure; HttpOnly; SameSite=Lax\``,
    })
  }

  // Check mixed content
  const hasHttps = valid.some(e => e.request?.url?.startsWith?.('https://'))
  if (hasHttps) {
    const httpEntries = valid.filter(e => e.request?.url?.startsWith?.('http://'))
    if (httpEntries.length > 0) {
      const httpHosts = [...new Set(httpEntries.map(e => {
        try { return new URL(e.request.url).hostname } catch { return e.request.url }
      }))]
      add({
        severity: 'high',
        category: 'Mixed Content',
        title: `${httpEntries.length} HTTP request(s) on HTTPS page`,
        detail: `Page loaded over HTTPS but ${httpEntries.length} resource(s) loaded over HTTP: ${httpHosts.join(', ')}. Browsers may block or degrade these requests.`,
        suggestion: `Change URLs to https:// for all resources. Use protocol-relative URLs (//example.com/...) as a migration step.`,
      })
    }
  }

  // Check for failed requests that might indicate security issues
  const failedEntries = valid.filter(e => e.response.status === 401 || e.response.status === 403)
  if (failedEntries.length > 0) {
      const failedHosts = [...new Set(failedEntries.map(e => {
        try { return new URL(e.request.url).hostname } catch { return e.request.url }
      }))]
    add({
      severity: 'medium',
      category: 'Authentication',
      title: `${failedEntries.length} unauthorized request(s) (401/403)`,
      detail: `Requests to ${failedHosts.join(', ')} returned 401 Unauthorized or 403 Forbidden. This may indicate missing/invalid auth tokens or insufficient permissions.`,
      suggestion: `Verify authentication credentials and permissions for the affected endpoints.`,
    })
  }

  // Check for missing content-type vs body size mismatch
  const largeBodies = valid.filter(e => e.response.content.size > 1024 && !hasHeader(e.response.headers, 'content-type'))
  if (largeBodies.length > 0) {
    add({
      severity: 'medium',
      category: 'Missing Content-Type',
      title: `${largeBodies.length} response(s) missing Content-Type with body > 1KB`,
      detail: `Responses with bodies > 1KB should include a Content-Type header so clients interpret them correctly.`,
      suggestion: `Ensure your server sets a Content-Type header matching the response body format.`,
    })
  }

  return findings
}

export function computeSecurityScore(findings: SecurityFinding[]): number {
  if (findings.length === 0) return 100
  const deductions: Record<string, number> = { high: 15, medium: 8, low: 3 }
  let score = 100
  for (const f of findings) score -= deductions[f.severity]
  return Math.max(0, score)
}

export function categorizeFindings(findings: SecurityFinding[]): Record<string, SecurityFinding[]> {
  const categories: Record<string, SecurityFinding[]> = {}
  for (const f of findings) {
    if (!categories[f.category]) categories[f.category] = []
    categories[f.category].push(f)
  }
  return categories
}

export function analyzeRequestEntry(entry: HarEntry): { cors: boolean; issues: string[] } {
  const issues: string[] = []
  if (!entry?.request?.url) return { cors: false, issues }
  const reqHeaders = entry.request.headers
  const resHeaders = entry.response.headers

  const cors = hasHeader(resHeaders, 'access-control-allow-origin')

  // Check CORS preflight / origin issues
  if (entry.response.status === 0 && entry.timings.wait === undefined) {
    issues.push('CORS preflight may have failed or request was blocked')
  }

  // Check response content type
  const ct = headerValue(resHeaders, 'content-type')
  if (ct && entry.response.content.mimeType && !ct.startsWith(entry.response.content.mimeType.split('/')[0])) {
    issues.push(`Content-Type mismatch: header says "${ct}" but resource type is "${entry.response.content.mimeType}"`)
  }

  // Check redirect chain without Location header
  if ((entry.response.status === 301 || entry.response.status === 302 || entry.response.status === 307 || entry.response.status === 308) && !hasHeader(resHeaders, 'location')) {
    issues.push(`Redirect (${entry.response.status}) with no Location header — browser will fail to follow`)
  }

  // Check large overhead vs body
  if (entry.response.content.size === 0 && entry.time > 500) {
    issues.push(`Request took ${entry.time}ms but returned empty body — possible server-side delay or hanging connection`)
  }

  // Check 304 Not Modified efficiency
  if (entry.response.status === 304 && !hasHeader(reqHeaders, 'if-none-match') && !hasHeader(reqHeaders, 'if-modified-since')) {
    issues.push('304 Not Modified returned but no conditional headers sent — caching is not being leveraged')
  }

  return { cors, issues }
}
