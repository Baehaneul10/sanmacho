/**
 * API 요청 시 앞에 붙는 베이스.
 * - `VITE_API_BASE` 예: `http://127.0.0.1:3000` (별도 도메인 API)
 * - 비어 있으면 `''` → 브라우저 기준 `/api/...` (nginx 동일 출처 또는 Vite dev proxy)
 */
export function apiBaseForFetch(): string {
  const explicit = import.meta.env.VITE_API_BASE?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return ''
}

export function apiUrl(path: string): string {
  const base = apiBaseForFetch()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
