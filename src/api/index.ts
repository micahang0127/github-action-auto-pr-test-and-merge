const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') as string

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

class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ─── Token ───────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('accessToken')

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

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    const json = (await res.json()) as ApiResponse<T>

    if (res.ok && json.statusCode === 200) {
      return json
    }

    // 에러 발생 시 에러 객체를 던짐
    const errorMessage = json.error?.[0] || '알 수 없는 오류가 발생했습니다.'
    throw new ApiError(errorMessage, json.statusCode)
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('네트워크 오류가 발생했습니다.')
  }
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  get: <T = PagedData>(endpoint: string) => request<T>('GET', endpoint),
  post: <T = boolean>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, body),
  patch: (endpoint: string, body?: unknown) => request<boolean>('PATCH', endpoint, body),
  delete: (endpoint: string) => request<boolean>('DELETE', endpoint),
}
