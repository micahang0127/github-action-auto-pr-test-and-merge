# KP Lab-Manager FRONT

> React, Vite, SWC 기반의 프로젝트 

<br>

## 📋 목차

- [🛠 시작하기](#-시작하기)
- [🌿 브랜치 및 협업 전략 (필독)](#-브랜치-및-협업-전략-필독)
- [🔄 협업 가이드](#-협업-가이드)
- [🛠 기술 상세 스택](#-기술-상세-스택)
- [📁 프로젝트 구조](#-프로젝트-구조)

<br>

## 🛠 시작하기

### 📋 사전 요구사항

- **Node.js** >= 24.x
- **pnpm** >= 10.x (혹은 npm/yarn)

### 📦 설치 및 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 로컬 개발 서버 실행
pnpm dev
```

<br>

### ⚠️ 중요: PR (Pull Request) 전 필수 체크사항

다른 개발자와의 협업 및 안정적인 빌드를 위해,  
 **Push 및 PR을 진행하기 전에 반드시 아래 명령어를 통해 로컬 검증을 완료해야 합니다.**

```bash
# 로컬 통합 검증 (Format, Type, Lint, Test, Build 체크)
pnpm ci:check
```

- 만약 에러가 발생한다면, 아래 명령어를 통해 자동 수정을 시도할 수 있습니다.
  ```bash
  pnpm ci:check:fix
  ```
- **반드시 `pnpm ci:check`가 성공(Success)한 상태에서만 브랜치에 Push를 진행해 주세요.**

<br>

## 🌿 브랜치 및 협업 전략 (필독)

이 프로젝트는 원활한 협업을 위해 엄격한 브랜치 전략과 커밋 규칙을 준수합니다. 모든 개발자는 아래 규칙을 반드시 숙지하고 지켜주시기 바랍니다.

### 1️⃣ 브랜치 생성 규칙
각자 기능 개발을 할 때, `dev` 브랜치에서 분기하여 아래 형식으로 브랜치를 생성합니다.
- **형식**: `feature/#{redmine번호}-{기능명}`
- **예시**: `feature/#123-login-api`

<br>

### 2️⃣ Commit 컨벤션 및 Redmine 연동
커밋 메시지는 반드시 **키워드**와 **레드마인 이슈번호**를 포함해야 합니다.
- **형식**: `feat: 기능 설명 refs #{redmine번호}`
- **예시**: <br>
`feat: 로그인 기능 구현 refs #5` <br>
`update: 로그인 이메일 형식 추가 refs #5` <br>
`fix: 비밀번호 변경 버그 수정 refs #5` <br>
`update: 로그인 기능 구현 완료 closes  #5` <br>

<br>

| 키워드 | 의미 | 예시 |
| :--- | :--- | :--- |
| **feat** | 새로운 기능 추가 | `feat: 로그인 API 구현 refs #123` |
| **update** | 기능 수정 | `update: 비밀번호 검증 추가 refs #124` |
| **fix** | 버그 수정 | `fix: 비밀번호 검증 오류 수정 closes #124` |
| **docs** | 문서만 수정 | `docs: 설치 가이드 업데이트 refs #125` |
| **style** | 코드 포맷, 스타일 수정 | `style: 버튼 디자인 수정 refs #126` |
| **refactor** | 코드 구조 개선 | `refactor: fetch 함수 리팩토링 refs #127` |
| **test** | 테스트 코드 추가 | `test: 유효성 검사 테스트 추가 refs #128` |
| **chore** | 설정, 패키지 관리 | `chore: 라이브러리 업데이트 refs #129` |

<br>


### 3️⃣ (필수) Push 전 사전 테스트 진행
코드 안정성을 위해 원격 저장소에 Push 하기 전, 로컬에서 모든 검증을 통과해야 합니다.
```bash
# 사전 테스트 진행
$ pnpm ci:check

# 에러 발생 시 자동 수정 시도
$ pnpm ci:check:fix
```
**🚨 `pnpm ci:check`가 통과된 경우에만 "feature/**" 브랜치에 push 합니다.**

### 4️⃣ (필수) dev 브랜치 Merge 규칙
- **`dev` 브랜치로의 Merge 는 오직 Pull Request (PR)를 통해서만 가능합니다.**
- **직접 Push 금지 ❌**
- **사전 작업**: `pnpm ci:check`가 로컬에서 모두 통과된 상태여야 합니다.
- **중요**: `dev` 브랜치는 반드시 PR을 통해서만 merge 될 수 있으며, 오직 `feature/**` 브랜치에서만 `dev`를 대상으로 PR을 생성할 수 있습니다.

<br>

### 5️⃣ (필수) main 브랜치 관리
- **`main` 브랜치는 프로덕션 배포용 (live) 브랜치입니다.**
- 반드시 `dev` -> `main` 방향으로 PR을 생성하여 merge를 진행합니다.
- 직접 수정이나 직접 merge는 절대 금지됩니다.

<br><br>

## 🔄 협업 가이드

### 📌 파일명 규칙 (Code Convention)

파일명은 **PascalCase** 또는 **camelCase**를 기본으로 합니다.

| 유형 | 규칙 | 예시 |
| :--- | :--- | :--- |
| **페이지/컴포넌트** | PascalCase | `LoginPage.tsx`, `Header.tsx` |
| **Hooks / 유틸 / 함수** | camelCase | `useAuth.ts`, `formatDate.ts` |
| **스타일 파일** | camelCase | `index.css` |

<br>

### ✅ PR 체크리스트
PR을 생성하기 전에 아래 항목을 최종 확인하세요:
- [ ] `pnpm ci:check`를 통해 모든 검증을 통과했는가?
- [ ] 최신 `dev` 브랜치로부터 branch를 생성했는가?
- [ ] 불필요한 `console.log`나 디버그 코드를 제거했는가?
- [ ] PR 제목에 레드마인 번호와 작업 내용이 명확히 포함되었는가?


<br><br>

## 🛠 기술 상세 스택

### 🎯 핵심 프레임워크 & 도구
- **React**: 19.x (UI 라이브러리)
- **TypeScript**: 5.9 (정적 타입)
- **Vite**: 7.x (빌드 도구)
- **SWC**: Rust 기반 고속 컴파일러
- **TanStack Router**: 파일 기반 라우팅
- **TanStack React Query**: 서버 상태 관리
- **Zustand**: 클라이언트 전역 상태 관리
- **Tailwind CSS**: 유틸리티 기반 스타일링

<br>

## 📁 프로젝트 구조

```
src/
├── api/                 # API 클라이언트 (fetch wrapper)
├── components/          # 공통 컴포넌트 (layout 등)
├── pages/               # 페이지 컴포넌트
├── routes/              # TanStack Router 라우트 정의
├── stores/              # Zustand 상태 스토어
├── utils/               # 공통 유틸리티
├── main.tsx             # 앱 진입점
├── router.tsx           # 라우터 설정
└── index.css            # 전역 스타일
```

<br>

---

<div align="center">

**⭐ KP Lab-Manager FRONT**  
Built with ❤️ by KP한석화학 LAB BIZ팀

</div>
