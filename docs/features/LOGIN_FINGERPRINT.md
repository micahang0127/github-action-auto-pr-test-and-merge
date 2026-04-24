# 로그인 — Token & Fingerprint 처리

> 관련 파일
>
> - `src/pages/LoginPage.tsx` — 로그인 UI / 흐름 제어
> - `src/utils/fingerprint.ts` — 핑거프린트 수집
> - `src/api/user.ts` — 로그인 API 호출
> - `src/api/index.ts` — HTTP 클라이언트 (토큰 주입 / 401 처리)
> - `src/stores/authStore.ts` — Zustand 인증 상태
> - `src/utils/requireAuth.ts` — 라우트 보호 가드

---

## 1. 로그인 흐름 전체 개요

```
[Step 1] 이메일 + 비밀번호 입력
    → getFingerprint() 실행 (FingerprintJS)
    → POST /user/login  (KPMFP 헤더 포함)
         ├─ type: 'T'  → 기존 기기 → 토큰 즉시 발급
         └─ type: 'O'  → 신규/미인식 기기 → Step 2로 이동

[Step 2] OTP 입력 (5분 타이머)
    → POST /user/otplogin  (KPMFP 헤더 포함)
         └─ 토큰 발급

[공통] 토큰 수령 후
    → localStorage.setItem('accessToken', token)
    → authStore.setLoggedIn(true)
    → navigate('/main')
```

---

## 2. Fingerprint (기기 식별)

### 목적

같은 계정이라도 **처음 접속하는 기기**인지를 서버가 판단하기 위해 사용한다.  
서버가 `type: 'O'`를 반환하면 추가 OTP 인증을 요구한다.

### 동작 방식

```ts
// src/utils/fingerprint.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs'

// 모듈 로드 시점에 미리 초기화 — 로그인 폼 렌더 전부터 준비됨
const fpPromise = FingerprintJS.load()

export async function getFingerprint(): Promise<string | null> {
  try {
    const fp = await fpPromise
    const result = await fp.get()
    return result.visitorId // 브라우저 환경 기반 해시값
  } catch {
    return null // 실패해도 로그인 흐름 차단하지 않음
  }
}
```

| 항목        | 내용                                                           |
| ----------- | -------------------------------------------------------------- |
| 라이브러리  | `@fingerprintjs/fingerprintjs` (오픈소스)                      |
| 결과값      | `visitorId` — 브라우저/OS/하드웨어 환경을 조합한 해시 문자열   |
| 실패 처리   | `null` 반환, 로그인은 계속 진행                                |
| 초기화 시점 | 모듈 import 시점 (렌더 이전), 로그인 버튼 클릭 시 `await`만 함 |

### 서버 전달 방법

`KPMFP`라는 커스텀 HTTP 헤더로 전달한다.

```ts
// src/pages/LoginPage.tsx
const fp = await getFingerprint()
fingerprintRef.current = fp // Step 2(OTP)에서도 재사용

login({ email, password, deviceType }, fp)
// → api.post('/user/login', body, { extraHeaders: { KPMFP: fp } })
```

> `fingerprintRef`를 사용하는 이유: Step 1에서 수집한 값을 Step 2(OTP)에서도 그대로 재사용해야 하므로, 리렌더에 영향받지 않는 `useRef`에 저장한다.

---

## 3. Token (JWT 기반 인증)

### 저장 위치

```
localStorage  →  key: 'accessToken'  →  value: JWT 문자열
```

### 토큰 생명주기

```
발급     → localStorage.setItem('accessToken', token)
사용     → 모든 API 요청 헤더에 자동 주입
만료 감지 → JWT payload의 exp 클레임을 디코딩하여 판단
폐기     → localStorage.removeItem('accessToken')
```

### API 요청 시 자동 주입

```ts
// src/api/index.ts
const getToken = () => localStorage.getItem('accessToken')?.trim()

// 요청마다 실행
const headers = {
  'Content-Type': 'application/json',
  ...(token && !options?.skipAuth && { Authorization: `Bearer ${token}` }),
  ...options?.extraHeaders,
}
```

- `skipAuth: true`를 넘기면 토큰 헤더를 붙이지 않는다 (로그인/OTP API에서 사용).

### JWT 만료 확인 방법

별도 라이브러리 없이 `atob()`으로 직접 파싱한다.

```ts
// src/stores/authStore.ts
function getTokenExpiryValue(token: string): number | null {
  const payloadStr = atob(token.split('.')[1]) // Base64 디코딩
  const payload = JSON.parse(payloadStr)
  return typeof payload.exp === 'number' ? payload.exp : null
}

// 만료 여부: exp(초 단위)와 현재 시각 비교
Math.floor(Date.now() / 1000) > exp
```

### 401 응답 시 자동 로그아웃

```ts
// src/api/index.ts
if (res.status === 401) {
  const msg = json.error?.[0]
  if (msg.includes('만료') || msg.includes('expired')) {
    localStorage.removeItem('accessToken')
    window.location.replace('/login') // 라우터 우회 하드 리다이렉트
  }
  throw new ApiError(msg, 401)
}
```

> 만료 메시지가 포함된 401에만 자동 로그아웃이 동작한다.  
> 일반 401(잘못된 자격증명 등)은 에러만 throw하고 리다이렉트하지 않는다.

### 라우트 진입 시 유효성 검사

```ts
// src/utils/requireAuth.ts — TanStack Router의 beforeLoad에서 호출
isAuthValid():
  1. localStorage에 'accessToken' 존재 여부
  2. JWT 형식 유효성 (점으로 구분된 3파트인지)
  3. exp 만료 여부  →  만료 시 localStorage에서 토큰 삭제 후 /login 리다이렉트
```

---

## 4. 핵심 설계 포인트 요약

| 포인트               | 내용                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| 핑거프린트 실패 허용 | `null` 반환으로 처리, 로그인 자체를 막지 않음                        |
| 핑거프린트 재사용    | `useRef`에 저장하여 OTP 단계에서도 동일 값 전달                      |
| 토큰 파싱            | 외부 라이브러리 없이 `atob()` + `JSON.parse()`                       |
| 401 분기 처리        | 만료 여부를 메시지로 구분 — 만료일 때만 강제 로그아웃                |
| 서버 로그아웃 없음   | 로그아웃은 클라이언트 전용 (localStorage 삭제 + Zustand 상태 초기화) |
