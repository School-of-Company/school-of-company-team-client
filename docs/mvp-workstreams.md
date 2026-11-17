# MVP 병렬 작업과 PR 스택

기준 명세: `docs/mvp.spec.md`. 2026-11-18 시작. 코디네이터는 현재 세션이며 구현 워커는 모두 별도 Orca Claude 워크스페이스다.

## 공통 규칙

- 동시에 작업 중이다. 다른 사람의 변경을 되돌리지 않는다. 소유 범위 밖 수정이 필요하면 코디네이터에게 먼저 알린다.
- 모든 워커는 `feat/mvp-baseline`에서 출발한다. 로컬 기능 커밋을 만든 후 코디네이터에게 보고한다. 스택 기반 브랜치가 확정되기 전 push·PR·merge·deploy하지 않는다.
- 코디네이터가 선행 브랜치를 전달하면 자신의 미공개 커밋만 해당 브랜치 위로 옮기고 충돌을 해결해 검증한다. 이후 push와 draft PR을 만들며 base는 직전 스택 브랜치다. 공유 main과 다른 워커 브랜치를 재작성하지 않는다. force push는 하지 않는다.
- PR에는 스택 순서·선행 PR·테스트 결과·실제 외부 검증 여부를 적는다. 사용자 토큰·비밀값은 요청하거나 커밋하지 않는다.
- 프로젝트 Exposed DSL·서비스별 인터페이스·ExpectedException·DTO 규칙을 유지한다. 프로젝트 스킬을 읽고 테스트한다. 무거운 명령은 `throt run --`으로 실행한다.
- Docker가 없으면 DB 테스트 통과라고 보고하지 않는다. 컴파일 결과와 미실행 테스트를 구분한다. 테스트를 삭제·완화해 통과시키지 않는다.
- 구현 검증과 실제 GitHub/Discord/OAuth 검증은 별도다. 실제 조직·서버 리소스 생성이나 운영 설정 변경은 하지 않는다.
- 새 외부 API는 공식 문서로 검증하고 HTTP 클라이언트를 테스트 가능한 경계로 둔다. 테스트만을 위한 과도한 추상화는 만들지 않는다.

## 스택과 소유권

`main ← baseline ← database ← projects ← tasks ← identity ← github ← discord`

아래 순서는 merge 순서이며, 개발·조사는 병렬로 시작한다. 선행 계약이 없는 부분은 임의 stub으로 완료 처리하지 말고 협의한다.

| 순서 | 작업 | 소유 범위 | 데이터 마이그레이션 |
| --- | --- | --- | --- |
| 0 | 기존 5단계 상태·기획 기준 | 코디네이터 | 없음 |
| 1 | DB 버전 관리·기존 스키마 보존 | build.gradle.kts, application.yaml의 DB/Flyway 설정, migration V1, DB 배선 테스트 | V1 기존 스키마 |
| 2 | 프로젝트·파트·PM·접근 정책 | domain/project, 신규 project membership/part 테이블, 권한 테스트 | V2 프로젝트 확장 |
| 3 | 공용·개인 업무·복수 담당·내 보드 | domain/task 및 해당 테스트 | V3 업무 확장 |
| 4 | GitHub OAuth·승인·Discord 계정 연결 | domain/auth, domain/user, global/security, SecurityConfig, AdminSeeder, 관련 테스트 | V4 identity 확장 |
| 5 | GitHub App·저장소·Issue 발행·PR 상태 | 신규 domain/github, 연동 전용 테이블·설정·테스트 | V5 GitHub |
| 6 | Discord 봇·스레드·멘션·채널 설정 | 신규 domain/discord, 연동 전용 테이블·설정·테스트 | V6 Discord |

프로젝트 워커는 기존 user role LEAD를 헤드 어드민으로 해석하고 auth/user 파일은 직접 수정하지 않는다. identity 워커도 이 역할 코드를 호환 유지한다. PM·파트 리더는 프로젝트 역할이며 전역 UserRole에 넣지 않는다.

## 협의할 최소 계약

- 프로젝트 워커: 프로젝트 조회·수정 가능 여부를 userId로 판정하는 정책, 참여자 집합·파트 조회와 아카이브 정책을 정의하고 먼저 코디네이터에게 전달한다. task 워커는 이를 재사용한다.
- 업무 워커: 업무 scope(PROJECT/TEAM/PERSONAL), actor 권한, 복수 assigneeIds, creator, status 변경의 트랜잭션 경계를 전달한다. GitHub/Discord는 자신의 연동 테이블로 taskId를 참조한다.
- identity 워커: GitHub 숫자 ID·Discord 사용자 ID 조회, 사용자 토큰 검증·비밀값 저장 방식, 로그인·승인 상태를 전달한다. 외부 로그인 관련 SecurityConfig 변경은 identity가 소유한다.
- GitHub·Discord 워커는 외부 클라이언트·영속 작업·복구·웹훅 기능을 자기 모듈 안에서 구현한다. 업무 생성·변경 서비스의 연결 지점은 task 워커와 협의하고 코디네이터 승인 후 소유권을 넘겨받아 최소 수정한다.
- application.yaml의 DB 구간은 database, OAuth/identity 구간은 identity, GitHub 구간은 github, Discord 구간은 discord가 소유한다. 다른 구간을 재포맷하지 않는다.
- 모든 신규 테이블은 해당 버전 SQL 마이그레이션과 Exposed Table 정의를 함께 갖춘다. 버전 파일 번호를 다른 워커와 중복 사용하지 않는다.

## 완료 증거

각 워커는 커밋 SHA·브랜치·변경 파일·실행 명령·통과/실패/미실행 구분·선행 의존성·남은 외부 설정을 보고한다. PR 준비 시 실제 API 시나리오 및 실패·권한 경계를 점검한다. 전체 MVP 완료는 모든 스택의 통합 검증과 프론트 화면 확인 이후다.
