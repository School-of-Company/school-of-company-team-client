# Design: School of Company

The locked system for the team workbench. Pages share these tokens and controls.

## System

- Genre: modern-minimal. Shape: app screen. Tone: utilitarian.
- Theme: Cobalt, dealt 3/3, seed github-discord-utilitarian-modern-minimal-3d53·1fca0681·2026-11-18·r0. Surfaces and type from Cobalt; the accent is the School of Company brand pink (user request 2026-11-18), replacing cobalt blue.
- Brand: the official logo `public/brand/school-of-company-logo.png` (also `app/icon.png`), unedited, via `BrandMark`. Its PNG has an opaque white ground, so it always sits on `--color-brand-tile` (white) with a hairline; a transparent official export would let the tile go.
- Axes: light/grotesk-sans/cool. Posture: restrained.
- Material: real tasks, project keys, team members and integration state.
- No ASCII field, keycaps, cut corners, graphite bands, hero, photography or invented metrics.

## Tokens

`src/app/styles/tokens.css` is the source of truth, imported by `globals.css` before `base.css`.

- Paper: `--color-paper`, `--color-paper-2`, `--color-paper-3`. Light: plain white app background and surfaces (#ffffff), `--color-paper-3` #f4f5f7 for hover and quiet fills; separation comes from 1px rules, not tinted grounds.
- Ink: `--color-ink`, `--color-ink-2`, `--color-muted`.
- Rules: `--rule-subtle` for region/card separation, `--rule-strong` for input edges, both 1px via `--rule-hair`. Input boundaries contrast 3.36:1 light and 3.50:1 dark.
- Accent: `--color-accent`, `--color-accent-wash`, `--color-accent-ink`, `--color-focus`. Logo pink `--color-brand-logo` (#ff4060, sampled) is decoration only (3.41:1 on white). Light accent #d92a4a (white text 4.79:1), hover/deep #b81c3c. Dark accent #ff5c78 with dark ink #111318 on it (6.24:1).
- Themes: light (default paper) and dark (`:root[data-theme="dark"]` in tokens.css). `themeBootScript` in `<head>` applies the stored choice (`localStorage` `soc.theme`) or, without one, the system preference before first paint. `ThemeToggle` (aria-pressed, keyboard) lives in the shell user area (sidebar and mobile header) and on identity screens.
- Feedback: `--color-error`, `--color-success`. Text and an accessible message accompany colour.
- Existing aliases remain: background, foreground, surface, surface-hover, muted, border, brand, brand-soft, danger.
- Typography: IBM Plex Sans KR via next/font/google for headings, body and labels; JetBrains Mono for machine values only.
- Body 16px; compact labels 14px; fixed type ratio 1.2. Korean body line-height `--line-body` 1.65, heading `--line-heading` 1.4. No tracked labels.
- Spacing: scaffold 4/8/12/16/24/40/64px steps. Hairline 1px.
- Radius: input 6px, surface 8px. Dialog uses a hairline without a shadow.

## Controls

- Reuse shared/ui Button, IconButton, Input, Textarea, Select, Checkbox, Dialog and feedback components.
- Primary: brand pink fill with accent ink. Secondary: paper and hairline. Ghost: text.
- Controls are 40px on fine pointers and 44px on coarse pointers; icon controls keep a 44px hit target. Compact text is 14px, input text 16px on phones.
- Default, hover, focus-visible, active, disabled, loading, error and success use shared CSS.
- Native disabled plus opacity and cursor; aria-busy for requests; aria-invalid for errors; data-state="success" only after a real result.
- Button loading retains the label; fields keep their native semantics and caller-owned descriptions.
- Icons: shared/ui Icon and IconName, inline SVG with accessible names on the enclosing control.

## Shell and navigation

- Sidebar for global destinations and joined projects, menu below 60rem.
- Main container capped at 1440px and centred; project tabs scroll horizontally.
- Keep routes, API, permissions and task actions. Project settings visibility uses projectAccess.manages.
- Linear is the sole hierarchy reference: dim sidebar, one page header, consistent tabs, one toolbar, quiet neutral surfaces. No product marks or proprietary icons are copied; the shared SVG set is original path geometry.
- Surface levels: `--surface-sidebar` (navigation), `--surface-canvas` (app background), `--surface-panel` (content/card), `--surface-column` (board lane), `--surface-hover` and `--surface-selected` (interaction). Light uses pure white for all four surfaces, separated by 1px rules with no card shadow; quiet hover uses #f4f5f7. Dark keeps the dim sidebar and existing surfaces. Pink only identifies primary actions, current selection and focus.
- Desktop page header owns title and actions; the global top bar is mobile navigation only. Mobile shows menu, brand, destination and theme toggle; logout remains in its drawer. Settings, account and admin share the same 768px measure and outer page inset without nested padding.
- Board header: project breadcrumb, title, counts, one primary create action and ghost import; ProjectNav preserves board/settings permissions. Toolbar holds filter summary, group and sort. Columns follow status order with name, count and named top add action. Cards show mono key, title, avatars and priority shape; deadline/blocking appear only when present. Details retain the right panel and full-page route.
- Priority: 20px neutral SVG with distinct filled-outline bar counts for P1/P2/P3 and alert triangle for P0; `aria-label` and `title` retain the exact P value.
- Data regions expose loading, empty, error and full states. No fabricated success.

## U5 visual evidence

- `~/orca/fe-mvp-qa-logs/after/u5/`: light/dark at 1280/375 for project/my/team boards, project list, detail panel, settings tabs, admin/create and account.
- All authenticated captures are **mock fixture 시각 검토용(실 API 아님)**, served by a repository-external standard Node HTTP fixture on localhost:43205 with dev localhost:3205. No fixture server, tokens or screenshots belong in the repository.
- Measured token contrast: muted/canvas 5.73:1 light, 6.44:1 dark; ink/panel 17.78:1 light, 13.53:1 dark; primary action text 4.79:1 light, 6.24:1 dark. Priority icons remain neutral with accessible P0-P3 names.

## Motion

- Still by default; state feedback only, durations 120/220ms. No load reveal.
- Focus is instant. Reduced motion ends animations immediately.

## Exports

- Global CSS: `src/app/styles/globals.css`, `tokens.css`, `base.css`.
- Controls and icons: `@/shared/ui`; shell: `@/widgets/app-shell`.
- Project navigation: `@/widgets/project-nav` (ProjectNav; project and user props).
