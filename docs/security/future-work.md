# 🔐 Security - Phase 2 & 3 (추후 진행 항목)

**마지막 업데이트:** 2026-03-23
**배포 환경:** AWS CloudFront (예정)

---

## 📌 개요

Phase 1에서 즉시 적용 가능한 보안 항목들을 완료했습니다.
이제 백엔드 협의와 배포 인프라 설정이 필요한 Phase 2, 3 항목들을 정리합니다.

---

## Phase 2️⃣ - 백엔드 협의 필요

### 2-1. 인증 토큰 저장 방식 변경 (핵심)

**현황:**
- 현재: `localStorage`에 JWT Access Token 저장 (XSS 취약)
- 문제: XSS 공격 시 토큰 직접 탈취 가능

**권장 방식:**

#### Option A: httpOnly Cookie + Memory (권장) ✅
```
Access Token
  ├─ 저장 위치: 브라우저 메모리 (변수)
  ├─ 특징: XSS로 탈취 불가능
  └─ 단점: 페이지 새로고침 시 초기화 → Refresh Token으로 복구

Refresh Token
  ├─ 저장 위치: httpOnly + Secure 쿠키
  ├─ 특징: JavaScript에서 접근 불가 (자동 전송)
  └─ SameSite=Strict로 CSRF 방어
```

**백엔드에서 구현할 사항:**
```
1. POST /auth/refresh 엔드포인트 (필수)
   - Request: Refresh Token (쿠키 자동 전송)
   - Response: 새 Access Token + 200 OK

2. 로그인 응답에 Refresh Token 설정
   Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800

3. 로그아웃 시 서버 측 Refresh Token 무효화
   - 데이터베이스에서 토큰 제거 또는 blacklist 처리

4. Access Token 만료 시간
   - 짧게 설정 (15분 ~ 1시간) → 탈취 시 피해 최소화
   - Refresh Token은 길게 설정 (7일 ~ 30일)
```

**프론트엔드 구현 계획:**
```typescript
// src/stores/authStore.ts 수정
interface AuthState {
  accessToken: string | null  // 메모리에만 저장 (localStorage 제거)
  refreshAccessToken: () => Promise<void>  // 자동 갱신 함수
}

// src/api/index.ts 수정
// 401 응답 시 자동으로 refresh → 원래 요청 재시도
async function request<T>(...) {
  try {
    const res = await fetch(...)
  } catch (err) {
    if (res.status === 401) {
      await refreshAccessToken()  // 토큰 갱신
      return request<T>(method, endpoint, body)  // 재시도
    }
  }
}
```

**예상 일정:**
- 백엔드 API 설계: 1주
- 프론트엔드 구현: 3일
- 통합 테스트: 2일

---

#### Option B: httpOnly Cookie만 사용 (간단)
```
Access Token
  ├─ 저장 위치: httpOnly + Secure 쿠키
  ├─ 특징: 자동 전송, JS 접근 불가
  └─ 장점: 단순 구현

단점:
  - CSRF 방어 필요 (CSRF Token 추가 또는 SameSite=Strict)
  - 토큰 갱신 로직 복잡도 증가
```

**권장하지 않음** (Option A가 더 안전)

---

### 2-2. CORS 정책 협의

**현황:**
- 프론트엔드: 특정 도메인으로 API 호출 예정
- 백엔드: CORS 설정 필요

**백엔드에서 설정할 사항:**
```javascript
// Express.js 예시
const cors = require('cors');

app.use(cors({
  origin: 'https://yourdomain.com',  // 프로덕션 도메인만
  credentials: true,  // 쿠키/인증 정보 포함
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // preflight 캐시 시간 (1일)
}));
```

**프론트엔드 설정:**

#### 개발 환경 (Vite proxy)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // 쿠키 자동 전송
        credentials: 'include'
      }
    }
  }
})
```

**효과:**
- 개발 환경: CORS 에러 없음
- API 호출: `fetch('/api/users')` → `http://localhost:3000/users`
- 실제 백엔드 URL 소스 코드에 노출 최소화

---

### 2-3. Silent Refresh 구현

**개념:**
```
API 요청
  ↓
401 응답 (만료된 토큰)
  ↓
/auth/refresh 호출 (Refresh Token 사용)
  ↓
새 Access Token 획득
  ↓
원래 요청 자동 재시도
  ↓
성공 응답
```

**프론트엔드 구현:**
```typescript
// src/api/index.ts
async function request<T>(method: string, endpoint: string, body?: unknown) {
  const res = await fetch(...)

  if (res.status === 401) {
    // 토큰 갱신 시도
    const refreshed = await refreshAccessToken()

    if (refreshed) {
      // 새 토큰으로 원래 요청 재시도
      return request<T>(method, endpoint, body)
    } else {
      // Refresh 실패 → 로그아웃
      logout()
      throw redirect({ to: '/login' })
    }
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'  // 쿠키 자동 전송
    })

    if (response.ok) {
      const data = await response.json()
      useAuthStore.getState().setAccessToken(data.accessToken)
      return true
    }
    return false
  } catch {
    return false
  }
}
```

**효과:**
- **사용자 경험 개선:** 인증 만료로 인한 에러 화면 표시 안 함
- **자동 갱신:** 사용자 액션 없이 백그라운드에서 처리
- **보안:** Refresh Token은 httpOnly이므로 JS에서 접근 불가

---

### 2-4. PortOne 보안 설정 (현재)

**현황:**
- `VITE_PORTONE_STORE_ID`, `VITE_PORTONE_CHANNEL_KEY` 브라우저 노출
- VITE_ 접두사 변수는 빌드 번들에 포함되므로 불가피

**필수 조치:**
```
PortOne 대시보드 설정
  1. 결제 도메인 허용 목록 (Domain Whitelist)
     → https://yourdomain.com 등록
  2. 생성된 결제 건만 승인
     → 타사이트에서의 키 오용 방지
  3. 결제 금액 한도 설정 (선택)
```

---

## Phase 3️⃣ - 배포 인프라 설정 (AWS CloudFront)

### 3-1. HTTP 보안 응답 헤더 (CloudFront)

**AWS CloudFront의 원본 응답 헤더 정책 (Origin Custom Headers):**

```
HTTP/1.1
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**설정 방법:**
1. CloudFront 배포 생성
2. 원본 요청 정책 추가 → 사용자 정의 헤더 정책 생성
3. 각 헤더를 "응답 헤더 정책"으로 구성
4. 배포에 적용

**각 헤더의 효과:**

| 헤더 | 효과 | 예 |
|------|------|-----|
| `Strict-Transport-Security` | HTTPS만 사용 강제 (1년) | HSTS preload 등록 가능 |
| `X-Content-Type-Options: nosniff` | MIME 타입 스니핑 방지 | JS 파일을 HTML로 실행 안 함 |
| `X-Frame-Options: DENY` | iframe 임베딩 방지 | 다른 사이트에서 콘텐츠 삽입 불가 |
| `Referrer-Policy` | Referrer 헤더 제어 | 외부 링크로 현재 URL 전달 안 함 |
| `Permissions-Policy` | 기기 권한 제어 | 카메라, 마이크 등 접근 차단 |

---

### 3-2. Content-Security-Policy (CSP) 설정

**프로덕션 배포 시 적용:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.yourdomain.com https://api.iamport.kr https://cdn.portone.io;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self'
```

**설정 방법:**
1. CloudFront 배포 → 응답 헤더 정책
2. 커스텀 헤더 추가: `Content-Security-Policy`
3. 위 값 복사 및 적용

**주의:**
- 개발 환경에서는 Vite HMR 때문에 CSP 비활성화
- 프로덕션 배포 후에만 활성화
- 서드파티 스크립트 추가 시 CSP 규칙도 함께 수정

---

### 3-3. HTTPS / HSTS 설정

**CloudFront 설정:**
```
1. SSL/TLS 인증서
   - AWS Certificate Manager (ACM)에서 인증서 발급
   - CloudFront에 적용

2. Viewer Protocol Policy
   - "Redirect HTTP to HTTPS" 선택
   → 모든 HTTP 요청을 HTTPS로 리디렉션

3. HSTS Preload (선택)
   - Strict-Transport-Security 헤더에 preload 추가
   - https://hstspreload.org에 등록
   → 모든 브라우저에서 항상 HTTPS 사용
```

---

### 3-4. 소스맵 제어

**프로덕션 빌드 시 소스맵 비활성화:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: import.meta.env.PROD ? false : true,  // 프로덕션에서만 비활성화
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]'
      }
    }
  }
})
```

**효과:**
- 프로덕션 빌드 시 `.map` 파일 생성 안 함
- 브라우저에서 원본 소스 코드 확인 불가 (오류 추적 어려움)
- Sentry 같은 에러 추적 도구 사용 시 별도 관리

---

### 3-5. Secret 스캔 자동화

**`.github/workflows/` 에 추가:**

```yaml
name: Secret Scan

on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**효과:**
- 커밋 시 자동으로 API 키, 비밀번호 등 스캔
- 감지 시 CI 실패로 푸시 방지
- 사고 예방 (한 번 커밋된 시크릿은 forever in git history)

---

### 3-6. 의존성 자동 업데이트 (Dependabot)

**`.github/dependabot.yml` 생성:**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(deps)"
```

**효과:**
- 매주 월요일 새벽 자동으로 보안 패치 PR 생성
- 중요 업데이트 우선 처리
- 취약점 수정 자동화

---

## 📅 구현 로드맵

| 순번 | 항목 | 우선순위 | 예상 일정 | 담당자 |
|------|------|---------|---------|--------|
| 1 | 인증 토큰 방식 결정 | P0 | 1주 | 프론트 + 백엔드 |
| 2 | Silent Refresh 구현 | P0 | 1주 | 프론트 + 백엔드 |
| 3 | CORS 정책 협의 | P0 | 2-3일 | 백엔드 |
| 4 | CloudFront 보안 헤더 | P1 | 2-3일 | DevOps |
| 5 | CSP 설정 및 테스트 | P1 | 2-3일 | 프론트 |
| 6 | HTTPS/HSTS 설정 | P1 | 1일 | DevOps |
| 7 | Gitleaks 자동화 | P2 | 1일 | DevOps |
| 8 | Dependabot 설정 | P2 | 1일 | DevOps |

---

## 🔗 체크리스트

### Phase 2 - 백엔드 협의
- [ ] 토큰 저장 방식 최종 결정 (httpOnly Cookie + Memory)
- [ ] `/auth/refresh` 엔드포인트 설계 완료
- [ ] Refresh Token 만료 정책 결정 (7일? 30일?)
- [ ] CORS 정책 문서 작성
- [ ] 로그아웃 시 Refresh Token 무효화 정책 수립
- [ ] 통합 테스트 환경 구성

### Phase 3 - 배포 설정
- [ ] CloudFront 배포 생성
- [ ] SSL/TLS 인증서 설정 (ACM)
- [ ] 보안 응답 헤더 정책 생성
- [ ] CSP 정책 작성 및 검증
- [ ] HSTS Preload 등록 고려
- [ ] Gitleaks 워크플로우 추가
- [ ] Dependabot 설정
- [ ] 보안 감사 (Mozilla Observatory)

---

## 📚 참고 자료

### 백엔드 협의
- [RFC 6750 - OAuth 2.0 Bearer Token](https://tools.ietf.org/html/rfc6750)
- [OWASP - Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [httpOnly Cookies](https://owasp.org/www-community/attacks/csrf)

### AWS CloudFront
- [AWS CloudFront Security Headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-headers-to-responses.html)
- [HSTS Preload List](https://hstspreload.org)

### 보안 헤더
- [OWASP Secure Headers Project](https://secureheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)

### 자동화
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)

---

## 🤝 팀 커뮤니케이션

### 백엔드 팀에 전달할 사항

**이메일 템플릿:**
```
Subject: 프론트엔드 보안 강화 - 백엔드 협의 필요

안녕하세요,

프론트엔드에서 보안을 강화하려고 하는데, 다음 사항에 대해 백엔드 팀과 협의가 필요합니다:

1. 인증 토큰 저장 방식
   - 현재: localStorage에 JWT 저장
   - 권장: httpOnly Cookie + Memory 조합
   - 상세: docs/security/future-work.md 참조

2. 필요한 API 엔드포인트
   - POST /auth/refresh (Access Token 갱신)
   - 응답: { accessToken: string }

3. CORS 정책
   - 배포 도메인: https://yourdomain.com
   - credentials: true 필요

4. 기타
   - Refresh Token 만료 정책 (권장: 7일)
   - 로그아웃 시 서버 측 토큰 무효화

상세 내용은 첨부된 문서를 참조 부탁드립니다.
```

---

## 📞 체크리스트로 진행 관리

> 다음 단계별로 체크리스트를 완료하며 진행하세요.

### 즉시 (1주 내)
- [ ] 백엔드 팀과 토큰 방식 협의
- [ ] API 설계 문서 공유
- [ ] 개발 시작 계획 수립

### 개발 중 (2주)
- [ ] 백엔드: `/auth/refresh` 구현
- [ ] 프론트: Silent Refresh 구현
- [ ] 통합 테스트

### 배포 전 (1주)
- [ ] DevOps: CloudFront 설정
- [ ] 보안 감사 (Mozilla Observatory)
- [ ] 침투 테스트 (선택)

### 배포 후 (지속)
- [ ] 모니터링 (에러 추적)
- [ ] 정기 보안 패치
- [ ] 의존성 업데이트 검토
