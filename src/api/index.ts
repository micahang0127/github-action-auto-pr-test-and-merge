const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') as string
const REQUEST_TIMEOUT = 10_000 // 10초

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PagedData {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  statusCode: number
  data: T
  error: string[]
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ─── Security: HTTPS 강제 (프로덕션) ──────────────────────────────────────────

if (import.meta.env.PROD && BASE_URL && BASE_URL.startsWith('http://')) {
  console.warn('[Security Warning] API BASE_URL은 HTTPS를 사용해야 합니다.')
}

// ─── Token ───────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('accessToken')?.trim()

// ─── Base request ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    const json = (await res.json()) as ApiResponse<T>

    // 401 Unauthorized: 자동 로그아웃 및 로그인 페이지로 리디렉션
    if (res.status === 401) {
      localStorage.removeItem('accessToken')
      // 간단한 location.replace로 처리 (라우터 통합 필요 시 별도 처리)
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
      throw new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 401)
    }

    if (res.ok && json.statusCode === 200) {
      return json
    }

    // 에러 발생 시 에러 객체를 던짐
    const errorMessage = json.error?.[0] || '알 수 없는 오류가 발생했습니다.'
    throw new ApiError(errorMessage, json.statusCode)
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error('네트워크 오류가 발생했습니다.')
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  get: <T = PagedData>(endpoint: string) => request<T>('GET', endpoint),
  post: <T = boolean>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, body),
  patch: (endpoint: string, body?: unknown) => request<boolean>('PATCH', endpoint, body),
  delete: (endpoint: string) => request<boolean>('DELETE', endpoint),
}
