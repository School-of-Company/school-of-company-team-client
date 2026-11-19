# 공통 기반

슬라이스는 `@/shared/ui`, `@/shared/api`, `@/shared/lib`, `@/shared/config` public API로 가져옵니다. 토큰은 `src/app/styles/globals.css`의 Tailwind v4 theme에 정의하며 OS 라이트/다크 설정을 따릅니다.

## API / 인증 / 캐시

`api`는 axios 인스턴스이며 `NEXT_PUBLIC_API_URL`, 15초 timeout(쿠키 미사용 — 인증은 Bearer 토큰, 서버 CORS allowCredentials=false)을 사용합니다. 성공 응답은 서버 DTO 자체입니다(공통 data 래퍼 없음). 오류는 `ApiError { status, code, message }`로 정규화합니다. `status=0`은 네트워크/알 수 없는 오류입니다. 서버 오류 계약은 서버 main의 `global/exception/ErrorResponse.kt`를 확인했습니다.

W2는 client effect에서 `api.interceptors.request.use`로 토큰을 주입하고 cleanup에서 eject합니다. shared는 토큰을 저장하지 않습니다. `subscribeApiErrors(callback)`은 정규화된 오류를 구독하며 반환 함수를 effect cleanup으로 사용합니다. callback은 401 또는 403 `SUSPENDED`, `ACCESS_DENIED`, `ONBOARDING_REQUIRED`를 구분해 가드 정책을 적용합니다. `PROJECT_FORBIDDEN`(403), `PROJECT_ARCHIVED`(409)는 각 화면에서 안내합니다. 404는 리소스 존재를 드러내지 않는 일반 안내를 사용합니다.

404/권한 실패에서 상세의 기존 `data`를 계속 표시하지 않습니다. 업무 단건이 404·403이면 `forgetTask(client)`(entities/task)가 업무 쿼리를 지우고, 업무를 담는 목록(프로젝트·홈·내 리뷰 요청·팀원)은 화면에 없는 것은 지우고 화면에 있는 것은 다시 받습니다. 새 목록 슬라이스가 업무를 담으면 그 키를 `forgetTask`의 목록에 더합니다.

폴링 목록의 재조회가 실패하면 `useLastData`(shared/lib) 규칙을 따릅니다: 일시 장애(네트워크·5xx)이고 마지막 성공 후 60초(서버 원본 권한 캐시 상한) 안이면 마지막 목록과 비차단 안내를, 그 밖(60초 경과, 401·403·404)은 목록을 비우고 오류만 보여 줍니다. 제목/본문은 localStorage 등 영구 캐시에 저장하지 않습니다.

Query 기본값은 staleTime 10초, 4xx 재시도 없음, 일시 오류 최대 2회 재시도, mutation 재시도 없음입니다. 보드 query에만 `refetchInterval: BOARD_POLL_INTERVAL`을 지정합니다(전역 폴링 없음). 목록·상세마다 loading/empty/error 상태를 렌더링합니다.

## Mutation / Toast

`ToastProvider`는 root Providers에 있습니다. client 컴포넌트에서 `const toast = useToast()`를 호출하고 mutation의 `onError: (error) => toast(normalizeApiError(error).message, "error")`로 사용합니다. `onSuccess`에서는 필요한 query를 invalidate하고 성공 메시지를 전달합니다. 제출 버튼은 `loading={mutation.isPending}`으로 중복 입력을 차단합니다. mutation 함수를 직접 await하면 호출자가 rejection을 처리해야 합니다. 전역 mutation toast는 중복 오류 안내를 피하기 위해 자동 적용하지 않습니다. 알림은 사용자가 닫을 때까지 유지합니다.

## UI / 접근성

`Button` variant는 primary/secondary/ghost/danger이고 기본 type은 button입니다. `IconButton`은 aria-label 필수입니다. `Field`의 id와 실제 Input id를 일치시키고, 오류 시 `aria-invalid` 및 `aria-describedby="{id}-error"`를 input에 지정합니다(hint는 `{id}-hint`). Checkbox도 label과 연결합니다.

`Dialog`는 `open/onClose/title`을 받는 controlled native dialog입니다. showModal의 배경 inert·포커스 복귀와 명시적 양방향 Tab 순환을 사용하며 Esc와 닫기 버튼은 onClose를 호출합니다. 내부 form을 submit할 때도 open 상태를 false로 갱신합니다. 모바일 드로어도 같은 Dialog를 사용합니다.

`AppShell`은 `@/widgets/app-shell`에서 children/userSlot/isHeadAdmin을 받습니다. 사용자 엔티티를 import하지 않으며, W2가 앱 레이아웃에서 가드 및 사용자 slot을 연결합니다. 관리자 메뉴 표시 자체는 권한 검증이 아닙니다.

`readFilters(params, keys)` / `writeFilters(params, filters)`는 같은 키 반복값을 OR로 보존하고, 수정하지 않은 검색 파라미터를 유지합니다. 예: `status=BACKLOG&status=DONE`. `formatDate`는 ko-KR/Asia-Seoul 기준이며 없는 날짜·잘못된 날짜는 대시로 표시합니다.
