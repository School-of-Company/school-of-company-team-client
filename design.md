# Design: School of Company

팀 업무 도구의 디자인 규칙입니다. 화면을 고칠 때 값을 새로 만들지 말고 여기 있는 토큰과 컴포넌트를 씁니다.

## 기준

- 화면 구조는 Linear를 기준으로 합니다: 조용한 사이드바, 한 줄 툴바, 높은 정보 밀도, 본문 옆 속성 열.
- Issue·PR 표기는 GitHub 방식(`저장소 #번호`)을 따릅니다.
- 문구는 짧은 한국어 평서문으로 씁니다. 설명이 필요 없는 곳에는 안내 문구를 두지 않습니다.
- 브랜드 핑크는 주요 버튼, 포커스, 선택 표시에만 씁니다. 나머지는 무채색입니다.

## 토큰 (`src/app/styles/tokens.css`)

컴포넌트는 의미 토큰만 읽습니다. 척도(`--gray-*`, `--pink-*`, `--hue-*`)를 컴포넌트에서 직접 쓰지 않습니다.

| 용도     | 토큰                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 배경     | `--background`(페이지), `--surface`(컨트롤), `--surface-raised`(카드·다이얼로그·메뉴), `--surface-sunken`(보드 컬럼), `--surface-sidebar` |
| 상호작용 | `--surface-hover`, `--surface-active`(현재 선택)                                                                                          |
| 글자     | `--foreground`, `--foreground-2`(보조), `--muted`(메타·빈 값·플레이스홀더, 4.5:1 이상), `--faint`(아이콘·장식 전용, 글자에 쓰지 않음)     |
| 선       | `--border`(구분), `--border-strong`(버튼 테두리), `--border-input`(입력·셀렉트 테두리, 3:1 이상)                                          |
| 강조     | `--brand`, `--brand-hover`, `--brand-soft`, `--on-brand`                                                                                  |
| 상태     | `--danger`, `--success`, 상태·우선순위 색은 `--hue-*`                                                                                     |

- 무채색은 12단계입니다: 1–2 배경, 3–5 채움, 6–8 선, 9–10 흐린 글자, 11–12 글자. 다크 모드는 같은 단계의 값만 바꿉니다.
- 글자 크기: 12(메타) · 13(UI 기본) · 14(본문) · 16(섹션 제목) · 20(페이지 제목). Tailwind `text-xs/sm/base/lg/xl`이 같은 값입니다.
- 간격은 4px 격자(`--space-1`~`--space-10`), 반경은 4 · 6 · 8 · 12(`--radius-sm/md/lg/xl`)입니다.
- 컨트롤 높이는 32px(`--control-md`), 작은 것은 28px(`--control-sm`)입니다. 터치 기기에서는 44px로 커집니다.
- 그림자는 떠 있는 것(메뉴, 다이얼로그)에만 씁니다(`--shadow-overlay`). 평면 구분은 선으로 합니다.
- 모션은 상태 변화에만 씁니다(120ms, 200ms). 목록이 다시 그려질 때 재생되는 등장 애니메이션은 넣지 않습니다.

## 컴포넌트 (`src/shared/ui`, 스타일은 `globals.css`)

- 버튼: `primary`(화면당 하나), `secondary`, `ghost`, `danger`(테두리형). 작은 버튼은 `ui-button-sm`.
- 입력: `Input`, `Textarea`, `Select`, `Checkbox`. 드롭다운은 전부 `Select` 또는 `ChipSelect`를 씁니다.
- 선택 전환: `ui-segmented`(라디오 또는 `aria-pressed` 버튼).
- 상태: `<span className="status-icon" data-status>` — 단계가 진행될수록 원이 채워집니다.
- 우선순위: `<span className="priority-label" data-priority>` — 색 점과 이름(긴급·높음·보통·낮음). 이름은 `priorityLabels`에서만 가져옵니다.
- 아바타: `Avatar`(22px, `size="lg"`는 56px). 주소는 `userAvatarUrl`/`avatarSrc`로 만듭니다.
- 겹쳐 뜨는 것: `Dialog`, 필터 패널, 칩 메뉴. 본문을 밀어내는 펼침은 쓰지 않습니다.
- 마크다운: `Markdown`. 원문 HTML은 렌더링하지 않습니다.

## 화면 구조

- 셸: 왼쪽 사이드바(232px, 화면 높이에 고정) + 본문. 본문 여백은 `--page-inset`입니다.
- 모든 페이지 제목은 같은 왼쪽 선에서 시작합니다. 설정류 페이지는 `settings-page`(최대 44rem)로 폭만 줄입니다.
- 보드: 헤더(제목·개수·주요 동작) → 툴바(필터, 그룹, 정렬) → 컬럼. 컬럼은 `--surface-sunken`, 카드는 `--surface-raised`입니다.
- 카드: 키 → 제목 → 저장소 #번호(있을 때) → 담당자 이름 · 우선순위 → 마감·막힘(있을 때).
- 업무 상세: 왼쪽 본문(제목, 설명, GitHub, Discord), 오른쪽 속성 열. 폭이 좁으면 속성이 아래로 내려갑니다.

## 지킬 것

- 색·간격·크기를 컴포넌트에 직접 적지 않습니다. 필요한 값이 없으면 토큰을 먼저 추가합니다.
- 새 클래스는 `globals.css`의 해당 구역(Controls, Shell, Board, Task detail, Account, Identity)에 둡니다.
- 대비: 본문 글자 4.5:1 이상, 입력 테두리 3:1 이상을 유지합니다.
