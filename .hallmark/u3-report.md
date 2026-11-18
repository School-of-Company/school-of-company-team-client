# U3 settings redesign verification

Branch: `ux/settings`. Base: `ux/foundation` at `31f250c` (includes `091d91a` ProjectNav).

## Delivered

- Settings use `?tab=general|members|integrations`; unknown values show basic information. Other query parameters survive tab changes. Shared `ProjectNav` preserves the board destination.
- Basic information, participants/PM, parts, repositories, Discord channel and account profile start in read views. Their existing edit actions and API permissions remain available. Save feedback stays in the affected region.
- Archive is under basic information with inline confirmation; restore remains available. New part input clears only after a successful create.
- Head administrators enter `/admin?create=project` from the administrator page or U2's project-list link. Name suggests an editable key; the immutable server constraint remains `^[A-Z][A-Z0-9]{1,9}$`.
- Creation retains the returned project ID, then saves team members and PM and offers optional repository connection. A failed team/PM step retries without repeating successful project/member creation. The final action targets the created project's board; settings can resume unfinished setup.
- GitHub login and App installation are explained separately. Server contract codes map to next actions; `GITHUB_NOT_CONFIGURED` asks for administrator App configuration. No installation URL or installation-success state is fabricated. Search only filters the server-provided repository list; multiple connections and default publishing remain available.
- No date inputs occur in the changed forms. No dependency was added. No shared/auth/U4-owned route file was edited.

## Verification

| Check | Observed result |
| --- | --- |
| `pnpm lint` | Pass on latest foundation |
| `pnpm type-check` | Pass |
| `throt run -- pnpm build` | Pass; all routes generated |
| Focused `bun test` | 6 pass, 0 fail across project permissions, project validation, Discord validation, part validation and suggested key constraint |
| Suggested key mutation check | Removing the fallback makes the new constraint test fail; restoring it passes |
| `pnpm lint:fsd` | 1 integration error: `widgets/project-nav` has only `pages/project-settings` as a consumer in this branch; U2 adds the board consumer in its branch |
| Hallmark static sweep | 0 FAIL, 0 REFLEX, 2 WARN |
| Hallmark render sweep | 0 FAIL, 0 REFLEX, 2 WARN; 15 unauthenticated captures across settings/admin/account |
| Kept | Fields 9/9, handlers 29/35 plus 6 rewritten handlers recorded in the CSS stamp; board link moved to ProjectNav and recorded |

Sweep command: `node .agents/skills/hallmark/scripts/sloplint.mjs src/pages/project-settings src/pages/admin src/pages/account src/features/project-integrations src/app/styles/globals.css --genre modern-minimal --scope app --render --kept --url http://localhost:3203/projects/u3-project/settings --url http://localhost:3203/admin --url http://localhost:3203/account`.

The two kept warnings reflect the supplied baseline: it contains `http://localhost:3100/login`, and files outside U3 ownership. The render tier has no signed-in session and renders login, so it does not prove authenticated product layouts. Authenticated UI evidence below uses explicit mock data, not the real backend. The CSS stamp records serializer changes, not retired product actions.

## Orca UI evidence (mock API)

Before: `/Users/gkals0403/orca/fe-mvp-qa-logs/before/`.

After: `/Users/gkals0403/orca/fe-mvp-qa-logs/after/u3/`.

Matching primary files: `project-settings-1280.png`, `project-settings-375.png`, `admin-1280.png`, `account-1280.png`. Additional `admin-375.png` and `account-375.png` cover phones. Before uses the supplied real-server dataset; after uses a local mock dataset, so these compare composition, not exact data parity.

Four perspectives (head administrator, PM, member who leads a part, outsider) were captured at both 1280 and 375 for settings, administrator and account pages. Non-lead files have `-pm`, `-member`, `-outsider` suffixes. Settings member-tab captures are `project-settings-members-<width>[-<role>].png`. `project-integrations-error-<width>.png` shows App configuration guidance.

Observed behaviors:

- All four perspectives have no document horizontal overflow at either width.
- Only lead/PM have basic-settings/archive controls. The member has only its part editor; outsider has no settings mutation controls. Non-leads see an administrator permission message instead of creation controls.
- Basic-settings save returns to read view and displays inline success. Part creation adds the actual returned list entry and clears the new-name input. Account save returns to read view with inline success.
- `?tab=members` survives a full reload. Board/settings navigation uses the shared ProjectNav; settings destination is shown only to managers.
- Forced PM failure displays the PM stage and retains the created project. Retry reaches the repository stage; mock counters were create=1, member-add=1, PM=2. The final board href was `/projects/u3-created-1`.
- Repository search filtered the permitted server list, connection added the selected repository, default publishing updated from the response, and real success feedback appeared. Configuration-error guidance did not contain an installation link.

Fresh-context finish review was performed in-thread, as the dispatch prohibits helper agents. Tokens and shared controls remain live DOM; keyboard focus comes from the foundation, tab hit targets are 44px, Korean text wraps, no images or fabricated metrics were introduced, and edit/submit actions remain native controls. Original forms' always-visible editing controls were the main before-screen problem; read views and URL tabs reduce that density. No additional visual material is needed for these app screens.

## Integration handoff

- Coordinator owns actual API QA on port 3100; U3 UI QA used a temporary mock API on port 3204 because the real backend CORS permits only 3100. The production backend was not modified or stopped.
- U4 owns `AuthGuard require="account"` and its one-line AccountPage integration. This branch's base still exposes only `require="work"`; preserve U4's `require="account"` when combining the AccountPage changes. ONBOARDING access needs integration verification with U4.
- U2 owns the project-list entry and the second ProjectNav consumer. Re-run `lint:fsd` after combining U2/U3.
- No GitHub App installation or real GitHub mutation was verified. Swagger and the provided GitHub API contract informed the error mapping.
