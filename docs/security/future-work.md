# 🔐 Security - Phase 2 & 3 (추후 진행 항목)

**마지막 업데이트:** 2026-03-23
**배포 환경:** AWS CloudFront + S3 + WAF
**팀 규모:** 1 인하우스 + 2-3 외주

---

## 📌 개요

Phase 1 (즉시 적용 항목)이 완료되었습니다.
이제 백엔드 협의와 배포 인프라 설정이 필요한 Phase 2, 3 항목들을 진행합니다.

---

## Phase 2️⃣ - 백엔드 협의 필요 | **우선순위: P0**

### 📊 핵심 이슈 요약

| 항목 | 현황 | 목표 | 우선순위 | 예상 일정 |
|------|------|------|---------|---------|
| 인증 토큰 저장 방식 | localStorage (XSS 취약) | httpOnly Cookie + 메모리 | P0 | 1주 |
| Refresh Token | 미구현 | `/auth/refresh` API | P0 | 1주 |
| Silent Refresh | 미구현 | 401 시 자동 갱신 | P0 | 3일 |
| CORS 정책 | 미설정 | 도메인 화이트리스트 | P0 | 2-3일 |

---

### 2-1. 인증 토큰 저장 방식 변경 ⭐ **가장 중요**

#### 문제
- **현재:** `localStorage`에 JWT 저장
- **위험:** XSS 공격 시 JavaScript로 직접 탈취 가능

#### 해결책: httpOnly Cookie + 메모리 조합 (권장)

| 구분 | 현재 방식 ❌ | 권장 방식 ✅ |
|------|-----------|----------|
| **Access Token** | localStorage (노출됨) | 브라우저 메모리 변수 (페이지 새로고침 시 초기화) |
| **Refresh Token** | 없음 | httpOnly + Secure + SameSite=Strict 쿠키 |
| **XSS 탈취 위험** | 높음 | 낮음 (JS에서 접근 불가) |
| **자동 전송** | 수동 (`Authorization` 헤더) | 자동 (쿠키 자동 포함) |
| **CSRF 방어** | 불필요 | SameSite로 자동 방어 |

#### 백엔드에서 구현할 사항

```
☑ 1. POST /auth/refresh 엔드포인트 구현
   - Request: Refresh Token (쿠키 자동 전송)
   - Response: { accessToken: "new_token", statusCode: 200 }

☑ 2. 로그인 응답에 Refresh Token 쿠키 설정
   - Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800

☑ 3. 로그아웃 시 서버 측 Refresh Token 무효화
   - DB에서 토큰 제거 또는 blacklist 처리

☑ 4. 토큰 만료 정책 결정
   - Access Token: 15분 ~ 1시간 (짧음 = 탈취 시 피해 최소화)
   - Refresh Token: 7일 ~ 30일 (길음 = 사용자 편의성)

☑ 5. CORS 설정
   - origin: 'https://yourdomain.com'
   - credentials: true (쿠키 포함)
```

#### 프론트엔드 구현 계획

```typescript
// src/stores/authStore.ts
interface AuthState {
  accessToken: string | null          // 메모리만 (localStorage 제거)
  refreshAccessToken: () => Promise<void>
}

// src/api/index.ts
// 401 응답 시 자동으로 refresh → 원래 요청 재시도
```

**예상 일정:** API 설계 1주 + 프론트 구현 3일 + 테스트 2일

---

### 2-2. CORS 정책 협의

#### 백엔드 설정 (예: Express.js)

| 항목 | 설정값 | 이유 |
|------|--------|------|
| `origin` | `https://yourdomain.com` | 프로덕션 도메인만 허용 |
| `credentials` | `true` | 쿠키/인증 정보 포함 허용 |
| `methods` | `GET, POST, PUT, DELETE, PATCH` | 필요한 HTTP 메서드 |
| `allowedHeaders` | `Content-Type, Authorization` | 요청 헤더 허용 |
| `maxAge` | `86400` | Preflight 캐시 (1일) |

#### 프론트엔드 Vite 설정 (개발 환경)

```javascript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      credentials: 'include'  // 쿠키 자동 전송
    }
  }
}

// 효과: fetch('/api/users') → http://localhost:3000/users
```

**기대 효과:**
- ✅ 개발 환경: CORS 에러 없음
- ✅ 백엔드 URL 소스 코드 노출 최소화

---

### 2-3. Silent Refresh 구현

#### 흐름도

```
┌─────────────────────┐
│  API 요청           │
└──────────┬──────────┘
           │
           ▼
   ┌───────────────┐
   │ 응답 상태?    │
   └───────┬───────┘
           │
    ┌──────┴──────┐
    │             │
    ▼ 200 OK      ▼ 401 Unauthorized
  [성공]        [토큰 만료]
    │             │
    └─────┐       ├─► /auth/refresh 호출
          │       │   (Refresh Token 사용)
          │       │
          │       ├─► 새 Access Token 획득
          │       │   (메모리에 저장)
          │       │
          │       └─► 원래 요청 자동 재시도
          │
          └──────►[최종 응답]
```

#### 프론트엔드 구현 체크리스트

- [ ] `src/api/index.ts`에 `refreshAccessToken()` 함수 추가
- [ ] 401 응답 감지 시 자동 갱신 로직
- [ ] 갱신 실패 시 로그아웃 처리
- [ ] 갱신 중 중복 요청 방지 (race condition 처리)
- [ ] 통합 테스트 (401 → refresh → 재시도 시뮬레이션)

**기대 효과:**
- ✅ 사용자 경험 개선 (에러 화면 표시 X)
- ✅ 자동 갱신 (사용자 액션 불필요)
- ✅ 보안 (Refresh Token은 httpOnly라 JS 접근 불가)

---

### 2-4. PortOne 보안 설정 (현재 상황)

#### 문제
- `VITE_PORTONE_STORE_ID`, `VITE_PORTONE_CHANNEL_KEY`는 빌드 번들에 노출됨 (VITE_ 접두사)
- 타사이트에서 키를 악용해 결제 도용 가능

#### 필수 대응 (PortOne 대시보드)

| 설정 항목 | 상태 | 설정 내용 |
|----------|------|---------|
| 결제 도메인 화이트리스트 | ☑ 필수 | `https://yourdomain.com` 등록 |
| 자동 승인 정책 | ☑ 권장 | 생성된 결제 건만 자동 승인 |
| 결제 금액 한도 | ☐ 선택 | 예: 1회 최대 ₩5,000,000 |
| IP 화이트리스트 | ☐ 선택 | 배포 서버 IP만 허용 |

---

## Phase 3️⃣ - AWS CloudFront 배포 설정 | **우선순위: P1-P2**

### 📅 핵심 설정 항목

| 항목 | 담당 | 우선순위 | 예상 일정 |
|------|------|---------|---------|
| HTTP 보안 응답 헤더 | DevOps | P1 | 2-3일 |
| CSP (Content-Security-Policy) | DevOps | P1 | 2-3일 |
| HTTPS / HSTS 설정 | DevOps | P1 | 1일 |
| 소스맵 제어 | 프론트 | P2 | 1일 |
| Gitleaks (Secret 스캔) | DevOps | P2 | 1일 |
| Dependabot 자동화 | DevOps | P2 | 1일 |

---

### 3-1. HTTP 보안 응답 헤더

#### CloudFront 설정: 응답 헤더 정책

| 헤더 | 값 | 효과 |
|------|-----|------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | HTTPS만 사용 (1년) |
| `X-Content-Type-Options` | `nosniff` | MIME 타입 스니핑 방지 |
| `X-Frame-Options` | `DENY` | iframe 임베딩 방지 (Clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer 헤더 제어 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 기기 권한 제어 |

#### 설정 방법

```
1. CloudFront 배포 선택
2. "응답 헤더 정책" 생성
3. 사용자 정의 헤더로 위 항목 추가
4. 배포에 연결
```

---

### 3-2. Content-Security-Policy (CSP) 설정

#### CSP 정책

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.yourdomain.com https://api.iamport.kr https://cdn.portone.io;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self'
```

#### 설정 방법

```
1. CloudFront 배포 → 응답 헤더 정책
2. 커스텀 헤더 추가: Content-Security-Policy
3. 위 정책값 복사 후 적용
```

#### 주의사항

| 환경 | CSP 상태 | 이유 |
|------|---------|------|
| **개발** | ❌ 비활성화 | Vite HMR이 CSP에 의해 차단됨 |
| **프로덕션** | ✅ 활성화 | 배포 후 필수 |

**서드파티 추가 시:** CSP 규칙도 함께 수정 필요 (예: Google Analytics 추가 → connect-src 수정)

---

### 3-3. HTTPS / HSTS 설정

#### AWS Certificate Manager (ACM) 설정

| 단계 | 항목 | 상태 |
|------|------|------|
| 1 | SSL/TLS 인증서 발급 | ACM에서 무료 발급 |
| 2 | CloudFront에 인증서 연결 | 배포 설정에 적용 |
| 3 | Viewer Protocol Policy | "Redirect HTTP to HTTPS" 선택 |
| 4 | HSTS Preload (선택) | `hstspreload.org`에 등록 |

**효과:**
- ✅ 모든 HTTP 요청 → HTTPS 자동 리디렉션
- ✅ 브라우저가 항상 HTTPS 사용 강제

---

### 3-4. 소스맵 제어 (프로덕션)

#### vite.config.ts 설정

```typescript
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
- ✅ 프로덕션에서 `.map` 파일 생성 안 함
- ✅ 브라우저에서 원본 소스 코드 확인 불가
- ⚠️ 오류 추적 어려움 → Sentry 등 에러 추적 도구 사용 권장

---

### 3-5. Secret 스캔 (Gitleaks)

#### .github/workflows/gitleaks.yml

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
- ✅ 커밋 시 자동으로 API 키, 비밀번호 등 스캔
- ✅ 감지 시 CI 실패 → 푸시 차단
- ✅ "한 번 커밋된 시크릿은 영원히 git history에 남음" 방지

---

### 3-6. 의존성 자동 업데이트 (Dependabot)

#### .github/dependabot.yml

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
- ✅ 매주 자동으로 보안 패치 PR 생성
- ✅ 취약점 수정 자동화
- ✅ 팀에서 리뷰 후 병합

---

## 📅 전체 구현 로드맵

### Phase 2 (1주 + 1주)

| 순번 | 항목 | 우선순위 | 담당 | 예상 일정 |
|------|------|---------|------|---------|
| 1 | 토큰 저장 방식 결정 | P0 | 프론트 + 백엔드 | 1주 (협의) |
| 2 | `/auth/refresh` API 설계 | P0 | 백엔드 | 1주 |
| 3 | Silent Refresh 구현 | P0 | 프론트 | 3일 |
| 4 | CORS 정책 수립 | P0 | 백엔드 | 2-3일 |
| 5 | 통합 테스트 (토큰 갱신) | P0 | 프론트 | 2일 |

### Phase 3 (배포 전 1주)

| 순번 | 항목 | 우선순위 | 담당 | 예상 일정 |
|------|------|---------|------|---------|
| 6 | CloudFront 보안 헤더 | P1 | DevOps | 2-3일 |
| 7 | CSP 정책 작성 및 테스트 | P1 | DevOps | 2-3일 |
| 8 | HTTPS/HSTS 설정 | P1 | DevOps | 1일 |
| 9 | 소스맵 프로덕션 비활성화 | P2 | 프론트 | 1일 |
| 10 | Gitleaks 워크플로우 | P2 | DevOps | 1일 |
| 11 | Dependabot 설정 | P2 | DevOps | 1일 |
| 12 | 보안 감사 (Mozilla Observatory) | P2 | DevOps | 1일 |

---

## 🔗 체크리스트

### Phase 2 - 백엔드 협의 진행

**즉시 (이번주):**
- [ ] 백엔드 팀과 인증 토큰 방식 협의 시작
- [ ] `httpOnly Cookie + 메모리` 조합 방식 승인
- [ ] API 설계 문서 작성 및 공유

**API 설계:**
- [ ] POST `/auth/refresh` 엔드포인트 스펙 정의
- [ ] Refresh Token 만료 정책 (7일? 30일?)
- [ ] CORS 정책 문서화
- [ ] 로그아웃 시 토큰 무효화 방식 결정

**개발 (2주):**
- [ ] 백엔드: `/auth/refresh` 구현
- [ ] 프론트: Silent Refresh 구현
- [ ] 프론트: 중복 요청 방지 (race condition)
- [ ] 통합 테스트 (401 → refresh → 재시도)

---

### Phase 3 - 배포 설정 진행

**배포 1주 전:**
- [ ] CloudFront 배포 생성
- [ ] ACM 인증서 설정
- [ ] 보안 응답 헤더 정책 생성
- [ ] CSP 정책 검증 (개발 환경에서 테스트)
- [ ] HSTS Preload 등록 고려

**자동화 설정:**
- [ ] Gitleaks 워크플로우 추가 및 테스트
- [ ] Dependabot 설정 및 PR 수신 확인
- [ ] 소스맵 프로덕션 비활성화 (vite.config.ts)

**배포 후:**
- [ ] 모니터링 설정 (에러 추적)
- [ ] Mozilla Observatory 보안 감사
- [ ] 정기 보안 패치 검토

---

## 🤝 백엔드 팀 커뮤니케이션

### 이메일 템플릿

**Subject:** 프론트엔드 보안 강화 - 백엔드 협의 필요

```
안녕하세요,

프론트엔드에서 보안을 강화하려고 하는데, 다음 사항에 대해 백엔드 팀과 협의가 필요합니다:

1️⃣ 인증 토큰 저장 방식 (가장 중요)
   - 현재: localStorage에 JWT 저장 (XSS 취약)
   - 권장: httpOnly Cookie + 메모리 조합
   - 상세: docs/security/future-work.md 참고

2️⃣ 필요한 API 엔드포인트
   - POST /auth/refresh
   - Request: Refresh Token (쿠키 자동 전송)
   - Response: { accessToken: string, statusCode: 200 }

3️⃣ CORS 정책
   - 배포 도메인: https://yourdomain.com
   - credentials: true (쿠키 포함)

4️⃣ 기타
   - Refresh Token 만료 정책 (권장: 7-30일)
   - 로그아웃 시 서버 측 토큰 무효화 방식

협의 일정을 잡을 수 있을까요?

감사합니다!
```

---

## 📚 참고 자료

### 인증 & 토큰

- [OWASP - Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 6750 - OAuth 2.0 Bearer Token](https://tools.ietf.org/html/rfc6750)
- [httpOnly Cookies & CSRF](https://owasp.org/www-community/attacks/csrf)

### AWS & 배포

- [AWS CloudFront 보안 헤더](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-headers-to-responses.html)
- [HSTS Preload List](https://hstspreload.org)

### 보안 헤더

- [OWASP Secure Headers Project](https://secureheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)
- [Security Headers](https://securityheaders.com)

### 자동화 도구

- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)

---

## ✨ 요약

**현재 진행 상황:**
- ✅ Phase 1: 100% 완료 (프론트엔드 즉시 적용 항목)
- ⏳ Phase 2: 백엔드 협의 필요 (토큰 저장 방식, Refresh Token)
- ⏳ Phase 3: 배포 단계 (CloudFront 헤더, 자동화)

**다음 우선순위:**
1. **즉시 (이번주):** 백엔드 팀과 인증 토큰 방식 협의 시작
2. **1주일:** Silent Refresh 기술 스펙 최종 결정
3. **2주일:** 백엔드/프론트 구현 병행
4. **배포 1주 전:** CloudFront 보안 설정 완료

**팀 특성에 맞춘 일정:**
- 외주 인력(2-3명)이 포함되므로 상세한 문서화 중요
- 대면 기회가 적으므로 비동기 커뮤니케이션 강화
- 예정된 기능(QR/바코드/이미지)은 Phase 2 후에 추가 권장
