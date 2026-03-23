# 🔒 Security - Phase 1 구현 현황

**업데이트 날짜:** 2026-03-23
**상태:** ✅ Phase 1 (즉시 적용 항목) 완료

---

## 📋 개요

본 프로젝트는 React 19 + Vite 7 + TypeScript 스택으로 구성된 프론트엔드 애플리케이션입니다.
보안을 강화하기 위해 백엔드 연동 없이도 즉시 적용 가능한 Phase 1 항목들을 구현했습니다.

---

## ✅ 구현 완료 항목

### 1. 토큰 유효성 검증 강화

**파일:** `src/utils/requireAuth.ts`, `src/stores/authStore.ts`

#### 변경 사항
- ✅ 공백 문자열 토큰 차단 (`token.trim()` 추가)
- ✅ JWT 형식 검증 (3개 부분 구조 확인)
- ✅ 토큰 만료 시간 체크 (JWT payload exp claim 검증)
- ✅ 유효성 검증 실패 시 localStorage에서 자동 제거

#### 코드 예시
```typescript
// requireAuth.ts
const token = localStorage.getItem('accessToken')?.trim()
if (!token) {
  throw redirect({ to: '/login' })
}
if (!isValidTokenFormat(token)) {
  localStorage.removeItem('accessToken')
  throw redirect({ to: '/login' })
}
if (isTokenExpired(token)) {
  localStorage.removeItem('accessToken')
  throw redirect({ to: '/login' })
}
```

#### 효과
- **XSS 탈취 토큰:** 형식 검증으로 유효하지 않은 토큰 차단
- **만료된 토큰:** 자동 정리로 stale 토큰 제거
- **Whitespace 버그:** 공백 토큰 인증 통과 방지

---

### 2. API 클라이언트 강화

**파일:** `src/api/index.ts`

#### 변경 사항
- ✅ Request Timeout 추가 (10초, AbortController 사용)
- ✅ 401 Unauthorized 자동 처리 (로그아웃 + 로그인 페이지 리디렉션)
- ✅ HTTPS 강제 (프로덕션 환경에서 경고 출력)
- ✅ 토큰 trim 처리 (공백 제거)
- ✅ ApiError export (테스트 및 외부에서 사용 가능)

#### 코드 예시
```typescript
// Timeout 구현
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

// 401 처리
if (res.status === 401) {
  localStorage.removeItem('accessToken')
  window.location.replace('/login')
  throw new ApiError('인증이 만료되었습니다.', 401)
}

// HTTPS 강제 (프로덕션)
if (import.meta.env.PROD && BASE_URL.startsWith('http://')) {
  console.warn('[Security Warning] API BASE_URL은 HTTPS를 사용해야 합니다.')
}
```

#### 효과
- **무한 대기 방지:** 10초 이상 응답 없는 요청 자동 중단
- **인증 만료 대응:** 401 응답 시 자동 로그아웃으로 상태 동기화
- **HTTPS 미적용 감지:** 프로덕션에서 HTTP 사용 경고

---

### 3. ESLint 보안 규칙 강화

**파일:** `eslint.config.js`

#### 변경 사항
- ✅ `@typescript-eslint/no-floating-promises` → error (비동기 미처리 감지)
- ✅ `@typescript-eslint/no-misused-promises` → error (Promise 오용 감지)
- ✅ `@typescript-eslint/only-throw-error` → error (Error 객체만 throw)
- ✅ `no-eval` → error (eval() 금지)
- ✅ `no-implied-eval` → error (간접 eval 금지)
- ✅ `@typescript-eslint/no-explicit-any` → error (any 타입 금지)

#### 효과
- **Promise 오류:** 미처리된 비동기 함수 감지
- **코드 주입 방지:** eval() 사용 금지로 동적 코드 실행 차단
- **타입 안정성:** any 타입 사용 금지로 타입 검증 강제

---

### 4. HTTP 보안 헤더 (프론트엔드)

**파일:** `index.html`

#### 추가된 메타 태그
```html
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<meta http-equiv="X-Frame-Options" content="DENY" />
```

#### 효과
- **MIME 타입 스니핑 방지:** 악의적 콘텐츠 실행 차단
- **Referrer 노출 방지:** 외부 사이트로 현재 URL 전달 차단
- **Clickjacking 방지:** iframe으로 콘텐츠 임베딩 차단

#### 주의
- **CSP (Content-Security-Policy):** 프로덕션 배포 시 서버에서 설정 권장
  - 개발 환경에서는 Vite HMR이 CSP에 의해 차단될 수 있음
  - `index.html`에 주석 처리된 CSP 메타 태그 존재

---

### 5. 의존성 보안 점검 (CI/CD)

**파일:** `.github/workflows/pr-test.yml`

#### 추가된 체크
- ✅ `pnpm audit --audit-level=high` 단계 추가
- ✅ High 심각도 이상 취약점 발견 시 PR 자동 종료
- ✅ Discord 알림에 Security Audit 상태 포함
- ✅ 실패 시 에러 요약 메시지 포함

#### 동작 흐름
```
1. 의존성 설치 (pnpm install)
2. Security Audit 실행 (HIGH 이상 심각도 확인)
   → FAIL: PR 자동 종료, Discord 알림 전송
   → PASS: 다음 단계 계속
3. Format, Lint, Test, Build 순차 실행
```

#### 효과
- **공급망 공격 방지:** 악성 또는 취약한 의존성 조기 감지
- **자동 처리:** 수동 검증 불필요, CI에서 자동 차단

---

## 🔍 검증 방법

### 로컬 환경에서 테스트

```bash
# ESLint 규칙 확인
pnpm lint

# 의존성 취약점 스캔
pnpm audit

# 빌드 테스트
pnpm build

# 모든 검사 실행
pnpm ci:check
```

### 브라우저 DevTools 확인

1. **Network 탭**
   - API 호출 시 timeout 적용 확인 (10초 이상 응답 없는 요청 중단)
   - 401 응답 시 로그인 페이지로 리디렉션 확인

2. **Console 탭**
   - `[Security Warning]` 메시지 확인 (HTTPS 미적용 시)
   - Promise 관련 에러 없음 확인

3. **Application 탭**
   - localStorage의 accessToken 값 확인
   - 토큰 만료 시 자동 제거 확인

### 테스트 추가 권장

```typescript
// requireAuth.test.ts
describe('requireAuth', () => {
  it('공백 토큰으로 리디렉션', () => { /* ... */ })
  it('만료된 토큰 제거 및 리디렉션', () => { /* ... */ })
})

// api/index.test.ts
describe('API timeout', () => {
  it('10초 초과 요청 중단', () => { /* ... */ })
})

describe('401 handling', () => {
  it('401 응답 시 자동 로그아웃', () => { /* ... */ })
})
```

---

## 📊 현재 보안 상태

### 개선된 항목 (✅)
| 항목 | 이전 | 현재 | 위험도 감소 |
|------|------|------|-----------|
| 공백 토큰 | 통과 | 차단 | 중간 |
| 만료 토큰 | 미검증 | 검증 | 높음 |
| API timeout | 없음 | 10초 | 낮음 |
| 401 처리 | 에러만 throw | 자동 로그아웃 | 중간 |
| 의존성 점검 | 수동 | 자동 (CI) | 중간 |
| ESLint 규칙 | 느슨함 | 엄격함 | 낮음 |

### 남은 문제 (⚠️)
| 항목 | 현황 | 대응 |
|------|------|-----|
| localStorage에 JWT 저장 | XSS 취약 | Phase 2: httpOnly Cookie로 전환 |
| Refresh Token | 미구현 | Phase 2: 백엔드 협의 후 구현 |
| CSP 미설정 | XSS 2차 방어 없음 | Phase 3: 배포 시 서버 헤더 추가 |
| 보안 HTTP 헤더 | 서버에만 의존 | Phase 3: CloudFront 설정 필요 |

---

## 🚀 다음 단계

### Phase 2 - 백엔드 협의 필요 ([future-work.md](./future-work.md) 참조)
- 토큰 저장 방식 변경 (localStorage → httpOnly Cookie)
- Refresh Token 자동 갱신 구현
- CORS 정책 협의

### Phase 3 - 배포 시 진행
- AWS CloudFront 보안 헤더 설정 (HSTS, CSP 등)
- Secret 스캔 자동화 (Gitleaks)
- 빌드 결과물 최적화 (소스맵 제어)

---

## 📞 참고 문서

- 🔐 [전체 보안 로드맵](../../.claude/plans/magical-strolling-barto.md)
- 📋 [추후 진행 항목](./future-work.md)
- 🛠 ESLint 규칙: `eslint.config.js`
- 🔑 API 클라이언트: `src/api/index.ts`
- 🔐 인증 유틸: `src/utils/requireAuth.ts`, `src/stores/authStore.ts`
