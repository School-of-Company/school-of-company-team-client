<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Golden Principles

- AI 가 만든 결과물의 책임은 그것을 올린 사람에게 있습니다. 읽고 이해한 것만 커밋·머지합니다.
- 핵심 로직과 고위험 영역(인증·권한, 결제·개인정보, DB 구조, 공통 모듈·API 계약, 배포·인프라)은 테스트가 필수입니다. 커버리지 목표는 두지 않습니다.
- 반복되는 문제는 하네스(이 파일, `docs/conventions.md`, CI)에 반영합니다. 모든 실수를 규칙으로 만들지는 않습니다.
- 브랜치·커밋·리뷰·릴리스 규칙은 `docs/conventions.md` 를 따릅니다.

## AI agent security — never

- Secret 이나 `.env*` 파일(`.env.example` 제외)을 커밋하거나 출력하지 않는다.
- Secret 을 Discord·Issue·PR·커밋 메시지에 붙여 넣지 않는다.
- CI 를 통과시키려고 인증·권한 검사나 테스트를 끄거나 지우지 않는다.
- `main` 에 직접 push 하지 않는다. 항상 브랜치와 PR 로 올린다.
- 서버 전용 환경 변수를 브라우저 번들에 노출하지 않는다(`NEXT_PUBLIC_` 를 붙이거나 클라이언트 코드에서 읽지 않는다).
