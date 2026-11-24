<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Golden Principles

- AI 가 만든 결과물의 책임은 그것을 올린 사람에게 있습니다. 읽고 이해한 것만 커밋·머지합니다.
- 핵심 로직과 고위험 영역(인증·권한, 결제·개인정보, DB 구조, 공통 모듈·API 계약, 배포·인프라)은 테스트가 필수입니다. 커버리지 목표는 두지 않습니다.
- 반복되는 문제는 하네스(이 파일, CI)에 반영합니다. 모든 실수를 규칙으로 만들지는 않습니다.

## 제품과 정보 구조 (IA)

- 제품 명세의 원본은 서버 저장소 [School-of-Company/school-of-company-team-server의 제품 명세](https://github.com/School-of-Company/school-of-company-team-server/blob/main/docs/mvp.spec.md)입니다. API 계약은 같은 서버 저장소의 명세를 따릅니다.
- 클라이언트 IA 규칙은 이 절과 `design.md`의 화면 구조를 따릅니다. 로컬 문서와 디자인 작업 산출물은 Git으로 공유하지 않습니다.
- 사이드바는 내 일, 조직, 프로젝트 순서이며 관리자와 설정은 맨 아래에 둡니다. 검색은 맨 위 버튼과 단축키로 엽니다. 데스크톱과 모바일 메뉴 순서를 맞춥니다.
- 프로젝트 탭은 보드, 스프린트, 마일스톤, 달력, 링크, 화이트보드, 요구사항, 설정 순서입니다. 진행 방식(Sprint, Kanban)은 표시용 이름이라 탭을 숨기지 않습니다. 설정은 PM과 헤드 어드민에게만 보입니다.
- 마일스톤 상세는 목록 위 대화상자로 엽니다. 문서는 종류 필터가 있는 한 목록이며 종류와 상태는 URL에 둡니다.
- 새 메뉴는 실제 API와 함께 화면이 완성될 때 추가합니다. 준비 중 메뉴, 비활성 링크, 빈 페이지는 만들지 않습니다. 필터, 탭, 선택 상태는 URL에 둡니다.
- 개인 업무는 본인만 보고, 비공개 원본 업무는 프로젝트 권한과 현재 GitHub 권한을 모두 가진 사람만 봅니다.

## 작업과 검증 규칙

- 최신 `origin/main`에서 `feat/`, `fix/`, `docs/`, `ux/`, `chore/` 접두사의 짧은 작업 브랜치를 만듭니다. 오래 걸리는 브랜치는 `main`을 merge하여 맞춥니다.
- 커밋은 `type(scope): 한글 요약`으로 씁니다. type은 `feat`, `fix`, `style`, `test`, `docs`, `refactor`, `chore`, `ci`이며 scope는 화면이나 모듈 이름이고 여러 곳이면 생략합니다. 한 커밋에는 한 가지 변경을 담고 리팩터와 동작 변경은 나눕니다.
- 포맷은 Prettier(`pnpm format`), 정적 검사는 ESLint를 따릅니다. FSD는 `src/app → pages → widgets → features → entities → shared` 순으로 아래 층만 import하고 같은 층의 다른 slice를 직접 import하지 않으며 공개 `index.ts`를 사용합니다.
- PR은 `.github/PULL_REQUEST_TEMPLATE.md`, Issue는 `.github/ISSUE_TEMPLATE/`를 사용합니다. 작업은 일 또는 주 단위로 나누고 담당자를 둡니다.
- PR 작성자가 일반 변경은 리뷰어 1명, 고위험 변경(인증과 권한, 결제와 개인정보, DB 구조, 공통 모듈과 API 계약, 배포와 인프라)은 2명을 지정합니다. 봇 리뷰와 별도로 사람 리뷰를 거칩니다.
- 최신 `main` 기준으로 `pnpm lint && pnpm type-check && pnpm lint:fsd && pnpm test && pnpm build`를 통과한 PR만 머지합니다. 단위 테스트는 Bun, E2E는 격리 스택의 Playwright(`pnpm e2e`)입니다. 무거운 명령은 `throt run --`으로 실행합니다.
- `main`에 머지된 상태가 릴리스 후보입니다. 현재 배포 워크플로, 버전 태그, 체인지로그는 없습니다. 배포 자동화를 추가할 때 대상, 트리거, 롤백, 모니터링을 문서화합니다.
- 빌드에는 `NEXT_PUBLIC_API_URL`이 필요합니다(`.env.example`).

## UI 문구와 스타일

- UI 문구에 가운뎃점(·)을 구분자로 쓰지 않는다.
- 화면 규칙은 `design.md`를 따릅니다.

## AI agent security — never

- Secret 이나 `.env*` 파일(`.env.example` 제외)을 커밋하거나 출력하지 않는다.
- Secret 을 Discord·Issue·PR·커밋 메시지에 붙여 넣지 않는다.
- CI 를 통과시키려고 인증·권한 검사나 테스트를 끄거나 지우지 않는다.
- `main` 에 직접 push 하지 않는다. 항상 브랜치와 PR 로 올린다.
- 서버 전용 환경 변수를 브라우저 번들에 노출하지 않는다(`NEXT_PUBLIC_` 를 붙이거나 클라이언트 코드에서 읽지 않는다).
