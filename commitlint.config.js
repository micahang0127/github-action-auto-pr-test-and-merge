export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // README 커밋 컨벤션: feat, update, fix, docs, style, refactor, test, chore
    // 'update'는 표준에 없으나 프로젝트 컨벤션에 있으므로 추가
    'type-enum': [
      2,
      'always',
      ['feat', 'update', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
    'type-case': [2, 'always', 'lower-case'],   // 타입은 소문자 강제
    'subject-empty': [2, 'never'],              // 설명 없는 커밋 차단
    'subject-case': [0],                        // 설명 대소문자 미검사 (한국어 허용)
  },
}
