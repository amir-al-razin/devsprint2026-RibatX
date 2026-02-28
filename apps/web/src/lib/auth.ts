/**
 * JWT helpers — client-side only (no signature verification).
 * Tokens are persisted in localStorage so they survive tab/browser restarts.
 */

const TOKEN_KEY = 'access_token'

/** Returns localStorage on the client, null on the server (SSR). */
function storage(): Storage | null {
  return typeof window !== 'undefined' ? localStorage : null
}

export function storeToken(token: string): void {
  storage()?.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null
}

export function clearToken(): void {
  storage()?.removeItem(TOKEN_KEY)
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadB64] = token.split('.')
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp * 1000 < Date.now()
}

export function getStudentId(token: string): string | null {
  const payload = decodePayload(token)
  return typeof payload?.sub === 'string' ? payload.sub : null
}

export function getStudentName(token: string): string | null {
  const payload = decodePayload(token)
  return typeof payload?.name === 'string' ? payload.name : null
}

/** Returns true when the JWT role claim equals "admin". */
export function isAdmin(token: string): boolean {
  const payload = decodePayload(token)
  return payload?.role === 'admin'
}

/**
 * Returns a non-expired token from sessionStorage, or null.
 * Evicts the token automatically if it has expired.
 */
export function getValidToken(): string | null {
  const token = getToken()
  if (!token) return null
  if (isTokenExpired(token)) {
    clearToken()
    return null
  }
  return token
}
