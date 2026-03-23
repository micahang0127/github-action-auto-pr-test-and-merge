import { redirect } from '@tanstack/react-router'

/**
 * JWT 토큰 형식 검증 (구조만 확인, 서명 검증 아님)
 * - 3개 부분으로 구성 (header.payload.signature)
 * - 각 부분이 비어있지 않아야 함
 */
function isValidTokenFormat(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

/**
 * 저장된 토큰의 만료 시간 추출 (JWT payload 디코딩)
 * @returns Unix timestamp (초) 또는 null (파싱 실패 시)
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ?? null
  } catch {
    return null
  }
}

/**
 * 토큰 만료 여부 확인
 * - exp claim이 없으면 만료된 것으로 간주
 * - 현재 시간이 exp보다 크면 만료됨
 */
function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token)
  if (!exp) return true
  return Math.floor(Date.now() / 1000) > exp
}

export function requireAuth() {
  const token = localStorage.getItem('accessToken')?.trim()

  // 토큰 없음 또는 공백
  if (!token) {
    throw redirect({ to: '/login' })
  }

  // 토큰 형식 검증 실패
  if (!isValidTokenFormat(token)) {
    localStorage.removeItem('accessToken')
    throw redirect({ to: '/login' })
  }

  // 토큰 만료 확인
  if (isTokenExpired(token)) {
    localStorage.removeItem('accessToken')
    throw redirect({ to: '/login' })
  }
}
