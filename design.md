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

- Paper: `--color-paper`, `--color-paper-2`, `--color-paper-3`.
- Ink: `--color-ink`, `--color-ink-2`, `--color-muted`.
- Rules: `--color-rule`, `--color-rule-2`; controls use muted for visible edges.
- Accent: `--color-accent`, `--color-accent-wash`, `--color-accent-ink`, `--color-focus`. Logo pink `--color-brand-logo` (#ff4060, sampled) is decoration only (3.41:1 on white). Light accent #d92a4a (white text 4.79:1), hover/deep #b81c3c. Dark accent #ff5c78 with dark ink #111318 on it (6.24:1).
- Themes: light (default paper) and dark (`:root[data-theme="dark"]` in tokens.css). `themeBootScript` in `<head>` applies the stored choice (`localStorage` `soc.theme`) or, without one, the system preference before first paint. `ThemeToggle` (aria-pressed, keyboard) lives in the shell user area (sidebar and mobile header) and on identity screens.
- Feedback: `--color-error`, `--color-success`. Text and an accessible message accompany colour.
- Existing aliases remain: background, foreground, surface, surface-hover, muted, border, brand, brand-soft, danger.
- Typography: IBM Plex Sans KR via next/font/google for headings, body and labels; JetBrains Mono for machine values only.
- Body 16px; compact labels 14px; fixed type ratio 1.2. No tracked labels.
- Spacing: scaffold 4/8/12/16/24/40/64px steps. Hairline 1px.
- Radius: input 6px, surface 8px. Dialog uses a hairline without a shadow.

## Controls

- Reuse shared/ui Button, IconButton, Input, Textarea, Select, Checkbox, Dialog and feedback components.
- Primary: brand pink fill with accent ink. Secondary: paper and hairline. Ghost: text.
- Controls keep a 44px minimum hit target; compact text is 14px, input text 16px on phones.
- Default, hover, focus-visible, active, disabled, loading, error and success use shared CSS.
- Native disabled plus opacity and cursor; aria-busy for requests; aria-invalid for errors; data-state="success" only after a real result.
- Button loading retains the label; fields keep their native semantics and caller-owned descriptions.
- Icons: shared/ui Icon and IconName, inline SVG with accessible names on the enclosing control.

## Shell and navigation

- Sidebar for global destinations and joined projects, menu below 60rem.
- Main container capped at 1440px and centred; project tabs scroll horizontally.
- Keep routes, API, permissions and task actions. Project settings visibility uses projectAccess.manages.
- Data regions expose loading, empty, error and full states. No fabricated success.

## Motion

- Still by default; state feedback only, durations 120/220ms. No load reveal.
- Focus is instant. Reduced motion ends animations immediately.

## Exports

- Global CSS: `src/app/styles/globals.css`, `tokens.css`, `base.css`.
- Controls and icons: `@/shared/ui`; shell: `@/widgets/app-shell`.
- Project navigation: `@/widgets/project-nav` (ProjectNav; project and user props).
