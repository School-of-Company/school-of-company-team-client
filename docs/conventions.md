# 컨벤션

팀 운영 문서 v3 제5장(작업 흐름·코드 리뷰)과 제7장(배포)을 이 레포에 맞게 옮긴 것입니다. 하네스(AGENTS.md)와 CI가 같은 규칙을 따릅니다.

## 브랜치

- `main` 은 보호 브랜치입니다. 직접 push 하지 않고 PR 로만 머지합니다. 최신 `main` 기준으로 CI 를 통과한 PR 만 머지합니다.
- 작업 브랜치는 최신 `origin/main` 에서 `종류/짧은-이름` 으로 만듭니다.
  - `feat/` 기능, `fix/` 버그, `docs/` 문서, `ux/` 화면 흐름 개선, `chore/` 설정·의존성
  - 예: `feat/project-links`, `fix/route-focus`, `docs/s9-ia`
- 오래 걸리는 브랜치는 `main` 을 merge 해서 맞춥니다(커밋 제목 예: `Merge origin/main into feat/calendar: …`).

## 커밋

`type(scope): 한글 요약` 형식입니다. scope 는 바뀐 화면·모듈 이름이고, 여러 곳이면 생략합니다.

| type       | 쓰는 때                         | 예                                                               |
| ---------- | ------------------------------- | ---------------------------------------------------------------- |
| `feat`     | 기능 추가                       | `feat(calendar): 팀·프로젝트 달력 화면과 일정 만들기·고치기`     |
| `fix`      | 버그 수정                       | `fix: 휴대폰 폭에서 설정 탭이 한 줄에 들어가게 탭 여백을 줄인다` |
| `style`    | 동작 변화 없는 화면·스타일 정리 | `style(labs): 관련 업무·문서의 해제 버튼이 세로로 꺾이던 문제`   |
| `test`     | 테스트만                        | `test(calendar): 격리 스택 달력 E2E`                             |
| `docs`     | 문서만                          | `docs(design): TDS 기준 디자인 규칙`                             |
| `refactor` | 동작 그대로 구조만              |                                                                  |
| `chore`    | 설정·의존성·빌드                |                                                                  |
| `ci`       | 워크플로                        |                                                                  |

한 커밋에는 한 가지 변경만 담습니다. 리팩터와 동작 변경은 커밋을 나눕니다.

## 코드 스타일

- 포매터는 Prettier(`.prettierrc`, Tailwind 클래스 정렬 플러그인), 린터는 ESLint(`eslint.config.mjs`: Next core-web-vitals · TypeScript · TanStack Query). `pnpm format` 으로 맞춥니다.
- 구조는 FSD(Feature-Sliced Design)입니다. `src/app → pages → widgets → features → entities → shared` 순으로 위에서 아래만 import 합니다. 같은 층의 다른 slice 를 직접 import 하지 않고 각 slice 의 `index.ts` 로만 씁니다. `pnpm lint:fsd`(steiger)가 검사합니다.
- Next.js 16 은 학습 데이터와 다릅니다. 코드를 쓰기 전에 `node_modules/next/dist/docs/` 를 확인합니다(AGENTS.md).
- 화면 규칙은 `design.md`, 화면 자리와 메뉴 순서는 `docs/ia.md` 를 따릅니다.

## 검사 (CI 와 같음)

```sh
pnpm lint && pnpm type-check && pnpm lint:fsd && pnpm test && pnpm build
```

`.github/workflows/ci.yml` 이 PR 과 `main` push 마다 이 순서로 돌립니다. 단위 테스트는 `bun test src`, E2E 는 `pnpm e2e`(Playwright, 격리 스택)입니다.

## 리뷰

- 리뷰어는 PR 작성자가 지정합니다. 일반 PR 은 1명, 고위험 PR 은 2명입니다.
- 고위험:
  - 인증·권한
  - 결제·개인정보
  - DB 구조 변경·마이그레이션
  - 공통 모듈·API 계약 변경
  - 배포·인프라 설정
- PR 본문은 `.github/PULL_REQUEST_TEMPLATE.md` 를 채웁니다. 코드 리뷰 봇을 쓰더라도 사람 리뷰는 생략하지 않습니다.
- Issue 는 `.github/ISSUE_TEMPLATE/` 의 일반 작업 · 외주 요청 · 버그 중 하나로 엽니다. 작업은 일·주 단위로 나누고 모든 작업에 담당자를 둡니다.

## 릴리스

- 지금 이 레포에는 배포 워크플로가 없습니다. `.github/workflows/` 에는 검사용 `ci.yml` 만 있고, README 에도 배포 절차가 없습니다. `main` 에 머지된 상태가 릴리스 후보입니다.
- 버전 태그·체인지로그는 아직 쓰지 않습니다(`package.json` 의 version 은 `0.1.0` 그대로).
- 팀 운영 문서 v3 제7장에 따라 배포는 CI/CD 로 자동화하고, 배포 담당자는 킥오프 때 정합니다. 배포 워크플로를 추가할 때 이 절에 대상·트리거·롤백 방법·모니터링을 적습니다.
- 빌드에는 `NEXT_PUBLIC_API_URL` 이 필요합니다(`.env.example`). `NEXT_PUBLIC_` 이 붙은 값만 브라우저 번들에 들어가므로 서버 전용 값에는 붙이지 않습니다.

## 의존성·보안

- Dependabot(`.github/dependabot.yml`)이 npm(pnpm lockfile)과 GitHub Actions 를 매주 확인하고, minor·patch 는 한 PR 로 묶습니다.
- Secret 은 코드·레포·Discord·Issue·PR 에 올리지 않습니다. `.env*` 는 커밋하지 않습니다(`.env.example` 만 예외).
