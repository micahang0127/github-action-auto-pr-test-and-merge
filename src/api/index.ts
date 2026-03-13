const BASE_URL = import.meta.env.VITE_API_BASE_URL

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
    return (await res.json()) as ApiResponse<T>
  } catch {
    return { statusCode: 500, data: {} as T, error: ['네트워크 오류가 발생했습니다.'] }
  }
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  get: <T = PagedData>(endpoint: string) => request<T>('GET', endpoint),
  post: <T = boolean>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, body),
  patch: (endpoint: string, body?: unknown) => request<boolean>('PATCH', endpoint, body),
  delete: (endpoint: string) => request<boolean>('DELETE', endpoint),
}
