# /create-pr

feature 브랜치의 변경사항을 분석하여 AI가 PR 제목과 본문을 생성하고, 사용자 확인 후 GitHub PR을 생성합니다.

## 실행 단계

### 1. 브랜치 확인
```bash
git branch --show-current
```
- `feature/`로 시작하지 않으면 "feature 브랜치에서만 실행할 수 있습니다." 출력 후 중단

### 2. 기존 PR 확인
```bash
gh pr list --head <현재브랜치> --base dev --json url,title
```
- 결과가 있으면 "이미 PR이 존재합니다: <URL>" 출력 후 중단

### 3. 변경사항 수집
```bash
git log dev..HEAD --oneline
git diff dev...HEAD --stat
git diff dev...HEAD
```

### 4. PR 제목/본문 AI 생성

**PR 제목 규칙:**
- 브랜치명 `feature/#10-user-login` → `feat: #10 user-login 구현`
- 브랜치명 `feature/#5-fix-bug` → `fix: #5 fix-bug 수정`
- 브랜치명에 이슈 번호가 없으면 커밋 내용 기반으로 생성

**PR 본문 규칙:**
`.github/pull_request_template.md` 구조를 따르되, 실제 변경사항을 분석하여 각 섹션을 채웁니다:
- 변경 유형: diff 내용 기반으로 해당 체크박스 선택
- 주요 변경 사항: 커밋 로그와 diff stat 기반으로 구체적으로 작성
- 변경 이유: 브랜치명과 커밋 메시지에서 맥락 추론
- 체크리스트: 기본 항목 유지
- 관련 이슈: 브랜치명에서 이슈 번호 추출하여 `Closes #번호` 형식으로 작성

### 5. 사용자 확인

생성된 PR 제목과 본문을 출력하고 사용자에게 승인을 요청합니다:
```
생성된 PR 내용입니다:

제목: <생성된 제목>

본문:
<생성된 본문>

이 내용으로 PR을 생성할까요? (y/n)
```

사용자가 'n'이면 중단합니다.

### 6. PR 생성
```bash
gh pr create --title "<제목>" --body "<본문>" --base dev --head <현재브랜치>
```

PR URL을 출력합니다.
