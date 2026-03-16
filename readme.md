# KP Lab-Manager FRONT

> React , Vite, SWC 기반의 프로젝트

## 스택

- **패키지 매니저**: pnpm
- **React**: 19.x
- **빌드 도구**: Vite
- **컴파일러**: SWC ([@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc))
- **언어**: TypeScript
- **스타일**: Tailwind CSS 3.x

<br>

## 📋 목차

- [🛠 시작하기](#-기술하기)
- [🛠 기술 상세 스택](#-기술-상세-스택)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [🌿 브랜치 전략](#-브랜치-전략)
- [🔄 협업 가이드](#-협업-가이드)

<br>

## 시작하기

### 📋 사전 요구사항

- **Node.js** >= 24.x
- **pnpm** >= 10.x (혹은 npm/yarn)

### 📦 설치 및 실행

```bash
pnpm install
pnpm dev
```

- `pnpm dev` — 개발 서버 (HMR)
- `pnpm build` — 프로덕션 빌드
- `pnpm preview` — 빌드 결과 미리보기
- `pnpm lint` — ESLint 실행

개발 서버는 `http://localhost:5173`에서 시작됩니다 (기본값).

<br>

## 🛠 기술 상세 스택

### 🎯 핵심 프레임워크

| 기술           | 버전 | 설명                          |
| -------------- | ---- | ----------------------------- |
| **React**      | 19.x | UI 라이브러리                 |
| **TypeScript** | 5.9  | 정적 타입 언어                |
| **Vite**       | 7.x  | 차세대 번들러                 |
| **SWC**        | 4.x  | Rust 기반 JavaScript 컴파일러 |

### 📦 상태 관리 & 데이터 페칭

| 기술                     | 버전 | 설명                 |
| ------------------------ | ---- | -------------------- |
| **TanStack Router**      | 1.x  | 파일 기반 라우팅     |
| **TanStack React Query** | 5.x  | 서버 상태 관리       |
| **Zustand**              | 5.x  | 클라이언트 상태 관리 |

### 🎨 스타일링

| 기술             | 버전 | 설명                         |
| ---------------- | ---- | ---------------------------- |
| **Tailwind CSS** | 3.x  | 유틸리티 기반 CSS 프레임워크 |
| **PostCSS**      | 8.x  | CSS 변환 도구                |

### 🛠 개발 도구

| 기술         | 버전 | 설명                                 |
| ------------ | ---- | ------------------------------------ |
| **pnpm**     | 10.x | 빠르고 효율적인 패키지 매니저        |
| **ESLint**   | 9.x  | 코드 품질 검사 (Airbnb + TypeScript) |
| **Prettier** | 3.x  | 코드 포맷팅                          |
| **dayjs**    | 1.x  | 가벼운 날짜 라이브러리               |

<br>

## 📁 프로젝트 구조

```
prj-tobe/
├── public/                  # 정적 자산 (이미지, 아이콘 등)
├── src/
│   ├── api/                 # API 클라이언트 및 통신
│   │   ├── index.ts         # 기본 fetch 래퍼 (JWT 인증 포함)
│   ├── components/          # 공유 컴포넌트
│   │   └── layout/          # 레이아웃 컴포넌트 (Header, Footer)
│   ├── pages/               # 페이지 레벨 컴포넌트
│   ├── routes/              # TanStack Router 라우트 정의 (파일 기반)
│   │   ├── __root.tsx       # 루트 레이아웃
│   │   ├── index.tsx        # / (홈)
│   │   ├── main.tsx         # /main
│   ├── stores/              # Zustand 전역 상태 스토어
│   ├── utils/               # 유틸리티 헬퍼
│   │   ├── date.ts          # dayjs 헬퍼
│   │   └── requireAuth.ts   # 라우트 인증 가드
│   ├── main.tsx             # 앱 진입점
│   ├── router.tsx           # TanStack Router 설정
│   ├── queryClient.ts       # React Query 설정
│   └── index.css            # 전역 스타일
├── index.html               # HTML 진입점
├── vite.config.ts           # Vite 설정
├── tailwind.config.js       # Tailwind 설정
├── eslint.config.js         # ESLint 설정
├── tsconfig.json            # TypeScript 설정
└── package.json             # 프로젝트 매니페스트

```

<br>

## 🌿 브랜치 전략

### 📌 브랜치 규칙

- **main**: 프로덕션 브랜치 (직접 푸시 금지 ❌)
- **dev**: 개발 브랜치 (직접 푸시 금지 ❌)
- **feature/#{redmine번호}-{기능명}**: 기능 개발 브랜치

### Git Commit 컨벤션 규칙

프로젝트 커밋 메시지는 아래 형식으로 작성합니다

#### Keyword 관련

| type         | 의미                          | 예시                                 |
| ------------ | ----------------------------- | ------------------------------------ |
| **feat**     | 새로운 기능 추가              | `feat: 로그인 API 구현`              |
| **update**   | 기능 수정                     | `update: 비밀번호 검증 추가`         |
| **fix**      | 버그 수정                     | `fix: 비밀번호 검증 오류 수정`       |
| **docs**     | 문서만 수정                   | `docs: 설치 가이드 업데이트`         |
| **style**    | 코드 포맷, 세미콜론 누락 등   | `style: 버튼 스타일 정리`            |
| **refactor** | 기능 변경 없이 코드 구조 개선 | `refactor: fetch 함수 리팩토링`      |
| **test**     | 테스트 코드 추가/수정         | `test: 로그인 테스트 추가`           |
| **chore**    | 빌드, 환경설정, 패키지 관리   | `chore: 라이브러리 업데이트`         |
| **ci**       | CI/CD 관련 설정               | `ci: github-actions - workflow 수정` |
| **revert**   | 이전 커밋 되돌리기            | `revert: feat: 로그인 API 구현`      |

---

#### Redmine 관련

커밋 메시지 끝에 이슈 번호를 참조합니다

- 참조만: `refs #123`
- 완료: `closes #123` / `fixes #123`

#### Git Commit 컨벤션 최종 예시

- 예시:
  - feat: 로그인 API 구현 refs #123
  - update: 비밀번호 검증 추가 refs #124
  - fix: 비밀번호 검증 오류 수정 closes #124

<br>

### 🔄 작업 흐름

1. **브랜치 생성**

   ```bash
   git checkout -b feature/#{redmine번호}-{기능명}
   ```

2. **작업 및 커밋**

   ```bash
   git add .
   git commit -m "feat: 기능 설명 refs #{redmine번호}"
   ```

3. **Pull Request 생성**
   - 작업 브랜치 → `dev` 브랜치로 PR 생성
   - 코드 리뷰 후 머지

4. **릴리즈**
   - `dev` → `main` 브랜치로 PR 생성 (릴리즈 시)

<br>

### ⚠️ 주의사항

- `dev`와 `main` 브랜치는 반드시 Pull Request를 통해서만 머지
- 직접 푸시 절대 금지
- 브랜치명은 반드시 `feature/#{redmine번호}-{기능명}` 형식 준수

<br>

## 🔄 협업 가이드

### 📌 코드 컨벤션

### 파일명 규칙

파일명은 **PascalCase** 또는 **camelCase**를 기본으로 합니다.

- **컴포넌트/페이지**: `PascalCase`
- **유틸/함수**: `camelCase`

#### 예시

| 유형                  | 규칙       | 예시                               |
| --------------------- | ---------- | ---------------------------------- |
| React 페이지/컴포넌트 | PascalCase | `LoginPage.tsx`, `UserProfile.tsx` |
| React 컴포넌트 파일   | PascalCase | `Button.tsx`, `Modal.tsx`          |
| Hooks / 유틸 함수     | camelCase  | `useAuth.ts`, `formatDate.ts`      |

**컴포넌트**: PascalCase (예: `UserProfile.tsx`)

```typescript
// ✅ 좋은 예
const MyComponent = () => {}
export default MyComponent

// ❌ 나쁜 예
const my_component = () => {}
export default my_component
```

<br>

### ✅ PR 체크리스트

PR을 생성하기 전에 아래 항목을 확인하세요:

- [ ] 최신 `dev` 브랜치로부터 branch를 생성했는가?
- [ ] 코드가 ESLint 규칙을 만족하는가? (`pnpm lint`)
- [ ] 불필요한 console.log나 디버그 코드는 제거했는가?
- [ ] 환경 변수나 API 키가 코드에 하드코딩되지 않았는가?
- [ ] PR 제목과 설명이 명확한가?

<br>

## 📄 라이선스

UNLICENSED - 비공개 프로젝트

## 👥 기여자

KP한석화학 LAB BIZ팀이 제작했습니다.

---

<div align="center">

**⭐ KP Lab-Manager FRONT**

Built with ❤️ by KP한석화학 LAB BIZ팀

</div>

test14 - 15 
