import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:3000'

export const handlers = [
  // 로그인 성공 핸들러
  http.post(`${BASE_URL}/auth/login`, () =>
    HttpResponse.json({
      statusCode: 200,
      data: { accessToken: 'mock-token-success' },
      error: [],
    })
  ),

  // 테스트 GET 요청 (API 클라이언트 테스트용)
  http.get(`${BASE_URL}/test`, () =>
    HttpResponse.json({
      statusCode: 200,
      data: null,
      error: [],
    })
  ),
]
