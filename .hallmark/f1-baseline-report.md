# F1 design quality baseline (Hallmark polish)

Branch `feat/s1-fe-quality`, base `origin/main` `8548fd7`. Scope: app, every existing screen. Depth: polish (layout and system kept; `design.md` is the locked system). Genre inferred: modern-minimal.

| | Result |
| --- | --- |
| Before (`sloplint src app --scope app --before`) | 18 FAIL (24a ×4, 34, 39a, 48 ×12) · 8 REFLEX (24b) · 4 WARN (41 ×2, F3, F5) |
| After (`--kept`) | 0 FAIL · 0 REFLEX · 0 WARN · 3 dismissed (41 ×2, F5) on the record in the `globals.css` stamp |
| Kept | links 20/20 · fields 22/22 · handlers 156/156 |
| Render tier | not run: no `puppeteer-core` on this machine. Screens were captured instead by `e2e/screens.e2e.ts` (Playwright) against the isolated real API: light/dark × 1440/390, 16 screen states, plus the mobile drawer |
| Finish review | in-thread (the dispatch forbids subagents) · 2 findings: inconsistent empty values on task detail (resolved: deadline shows 없음) · server error text repeats the error title (owner: server copy) |

Fixed beyond the linter (judged from the screenshots and contrast math):

- Input boundaries at 1.7:1 (light) and 2.0:1 (dark) → new `--border-input` token, 3.4:1 or more on every surface.
- `--faint` text at 2.4:1 → readable text moved to `--muted`; `--faint` is icons and decoration only.
- `--color-ink-2` used on login, pending and connect-discord was never defined → `text-foreground-2`.
- Sidebar logout wrapped to two lines next to a long name → fixed width, the name truncates.
- Base-select `▼` glyph differed from every other chevron → masked chevron.
- An empty board drew five empty columns → the existing empty state with one secondary action.

Evidence: `.omo/evidence/T1-F1/screens/{before,after}/` in the server planning checkout. Per-screen checklist: `docs/quality/baseline.md`.
