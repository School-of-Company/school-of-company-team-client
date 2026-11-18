# U1 foundation verification

Branch: `ux/foundation`. Base: `ux/hallmark-setup` (`e4fe5c0`).
Implementation commits: `46755eb` (system), `091d91a` (navigation).

## Delivered

- Cobalt app scaffold integrated through `src/app/styles/globals.css`, `tokens.css`, `base.css`; system locked in root `design.md`.
- Existing semantic token aliases and shared control exports retained. IBM Plex Sans KR and JetBrains Mono use `next/font/google`.
- Inline SVG `Icon`, `IconName` from `@/shared/ui`; shell and close buttons no longer use character icons.
- Shared controls cover default, hover, focus-visible, active, disabled, aria-busy, aria-invalid and server-confirmed `data-state="success"` styling. Existing callers own request state and accessible field messages.
- Dialog uses one hairline and no soft shadow; horizontal overflow remains clip while the menu is open.
- Sidebar destinations retained; accessible active project list reuses `projectQueries.list(false)` and excludes archived rows. Loading skeleton, empty message, error and retry are present.
- Per coordinator direction, the shortcut label is "프로젝트": the list API lacks membership fields. No N+1 detail requests were added. Exact participation filtering needs a backend list contract change.
- Menu below 60rem, a one-line mobile account area, centred 1440px main cap.
- `ProjectNav` and `ProjectNavProps` from `@/widgets/project-nav`; props: `project: ProjectDetail`, `user: Pick<User, "id" | "role">`. Board/settings use existing routes; settings requires `projectAccess(...).manages`.
- No page assembly performed. U2/U3 own insertion of ProjectNav.

## Commands

| Check                                                     | Result                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                               | PASS, zero errors and warnings; coordinator requested skill folders excluded via ESLint globalIgnores |
| `pnpm type-check`                                         | PASS                                                                                                  |
| `throt run -- pnpm build`                                 | PASS, all 17 static pages generated                                                                   |
| `bun test src/widgets/project-nav/ui/ProjectNav.test.mjs` | PASS, 5 tests                                                                                         |
| Permission mutation                                       | Inverting ProjectNav's manages condition produced 5 failures; restored condition produced 5 passes    |
| `pnpm lint:fsd`                                           | FAIL, only `fsd/insignificant-slice` on the not-yet-consumed project-nav                              |
| `git diff --check`                                        | PASS                                                                                                  |

The coordinator approved the isolated FSD failure: "스택 상위(ux/boards·ux/settings)에서 consumer 조립 후 해소, 통합 시 재검증". No FSD rule was disabled and no artificial consumer was added. Steiger also prints its existing package-module warning.

## Hallmark sweep

Command: `node .agents/skills/hallmark/scripts/sloplint.mjs src/app/styles src/shared/ui src/widgets/app-shell src/widgets/project-nav app/layout.tsx --genre modern-minimal --scope app --render --kept --url http://localhost:3201/login`, with the coordinator-supplied Puppeteer and Chrome environment.

Final completed sweep: **0 FAIL, 0 REFLEX, 2 WARN**, 11 files and 1 URL. Five login screenshots were rendered at 1280/1440/1920 and 375 widths. One earlier renderer attempt timed out; a subsequent completed render produced the reported result.

Kept: **links 4/4, handlers 9/9** within U1's compared source scope. Both warnings are accepted comparison limits: the imported baseline URL is `http://localhost:3100/login`, not port 3201, and the baseline includes 66 files outside this run. This does not prove authenticated page wiring globally; integration QA remains required. The linter sees login only, not the authenticated mock shell.

## Orca browser evidence

Before: `/Users/gkals0403/orca/fe-mvp-qa-logs/before/`.
After: `/Users/gkals0403/orca/fe-mvp-qa-logs/after/u1/`.

- `me-1280.png`, `me-375.png`: final source reloaded; mock identity and empty board. The older before images use real backend data and a different device pixel ratio; these are qualitative shell comparisons, not pixel diffs.
- `menu-375.png`: open mobile drawer with project shortcuts.
- `projects-empty-1280.png`, `projects-error-1280.png`: mock list empty and failure states; retry to a full list observed.
- Browser probes: 375px document/body width 375px; header height 64px; mobile input computed font 16px; IBM Plex Sans KR loaded.
- At 959px sidebar hidden/menu shown; at 960px sidebar shown/menu hidden. Archived fixture absent.
- Keyboard Enter opens menu, close control receives focus, Escape closes it; link navigation closes the drawer. Body computed horizontal overflow remains clip during modal display.
- A dev reload across server restart emitted one hydration warning in the old mock tab; a fresh login tab had no console errors. Initial cross-origin failures occurred before installing mock transport and are expected from port 3201 CORS. No real API pass is claimed.

Mock transport lived only in this task's Orca page memory; no mock API or token was committed. No backend data or configuration was changed. Real API QA was NOT RUN: coordinator owns 3100 integration testing because 3201 is not CORS-enabled.

ProjectNav is not yet mounted in a product route: SSR tests verify member/outsider denial, PM/head-admin allowance and the current settings destination; live integrated tab QA remains with U2/U3.

## In-thread finish review

Ship for the U1 shell scope, with integration conditions above. Hierarchy and density remain utilitarian, the mobile header is shorter than before, navigation preserves the existing destinations, and project shortcuts add a direct route without new product behavior. Cobalt's palette, plain rules and restrained accent match the locked system. No marketing content, generated figures or decorative material was introduced. The old screenshots carry populated task data; board layout/data verification belongs to U2, so their extra task rows are not counted as removed content.

Keep the current semantic tokens and explicit permission gate when composing upper stacks. Preserve U4's `/account` pathname-specific onboarding/auth exception when merging AppLayout; U1 changed only its user-slot layout.

No missing image, metric or quote slot remains. The most useful remaining evidence is the coordinator's real API run of the integrated project tabs and shell at port 3100.
