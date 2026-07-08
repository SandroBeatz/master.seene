---
spec_version: 1.0
date: 2026-07-08
status: built
skill_slug: fsd
skill_name: FSD Architecture Guard
targets: [claude-code, codex, universal]
---

# FSD Architecture Guard — Skill Specification

> Spec v1.0 · 2026-07-08 · status: built · [Skills index](./README.md)

## 1. Purpose

This skill keeps every file in `src/` correctly placed within the project's Feature-Sliced Design (FSD) architecture. The Seene frontend is organized into strict import-ordered layers (`app` → `pages` → `widgets` → `features` → `entities` → `shared`), and a single misplaced file — a store in the wrong slice, a bypassed public API, an upward import — creates architectural debt that compounds over time.

The skill does two jobs. First, as a **guard**: before any file in `src/` is created, moved, or modified, it tells the agent which layer and slice the code belongs in, what folder structure to use, and which `index.ts` public API to update. Second, as an **auditor**: when invoked with `--check`, it scans the whole `src/` tree and reports layer violations, missing public APIs, bypassed imports, and stores stranded in the legacy `stores/` directory.

Its value is architectural consistency enforced at write-time rather than discovered at review-time.

## 2. When to trigger

**Should trigger:**
- Any request to create, move, or modify a file under `src/` — even "small" ones: "add a component", "create a feature", "new page", "add a store", "add a utility", "add a type", "add an API call", "create an entity", "add a widget".
- Structural questions: "where does this code live?", "how should I structure this feature?", "how do I organize this?".
- Refactoring or reorganizing existing code within `src/`.
- The explicit command `/fsd --check` (or "audit the FSD structure", "check the architecture").

**Should NOT trigger:**
- Edits outside `src/` (config files, `supabase/migrations/`, `docs/`, root-level tooling).
- Pure logic changes inside a file that don't add/move files and don't touch imports across slices (though re-confirming placement is cheap and safe).
- UI-text or component-API questions that are really about i18n or Nuxt UI — defer to `[[i18n]]` and `[[nuxt-ui]]` respectively, though FSD placement still applies to any new file those produce.

## 3. Inputs

- **User request** describing code to add or restructure, or the `--check` flag.
- **The `src/` tree** — the skill reads existing slice directories to determine correct placement and, in audit mode, to find violations.
- **Vite/TS aliases** (`@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`, `@`) which imports must use across slice boundaries.
- No config file of its own; the architecture rules are encoded in the skill body.

## 4. Outputs

Two output shapes depending on mode.

**Guard mode** — no fixed template. The agent states the target layer + slice + segment for each new file, ensures the slice folder structure exists, creates/updates the slice's `index.ts` public API, and uses alias imports. The concrete deliverable is correctly-placed files, not a report.

**Audit mode (`--check`)** — a report in this exact format:

```
FSD Audit — <date>
==================

✅ No issues found — structure is clean!

OR

Issues found (N):

❌ VIOLATION  [description] — [file] → [file]
   Fix: [concrete suggestion]

⚠️  WARNING   [description] — [file]
   Fix: [concrete suggestion]

💡 SUGGESTION [description]
   Fix: [concrete suggestion]

Summary: N errors, N warnings, N suggestions
```

## 5. Workflow

**Guard mode:**

1. **Classify each new/changed file into a layer** using the decision flowchart, preferring the lowest applicable layer (shared > entities > features > widgets > pages):
   - App bootstrap (plugins, router, global styles) → `app/`
   - Tied to a specific URL route → `pages/`
   - Combines multiple features/entities into a UI block → `widgets/`
   - A user action / use-case → `features/<action-name>/`
   - A domain object with its own types + API → `entities/<entity-name>/`
   - Reusable with zero business logic → `shared/`
2. **Place the file in the right segment** inside the slice: `ui/` (Vue components), `model/` (stores, composables, types, business logic), `api/` (data fetching), `lib/` (slice-private utils), `config/` (slice constants). Only create the segments the slice actually needs.
3. **Maintain the public API.** Every slice under `pages/`, `widgets/`, `features/`, `entities/` must have a slice-root `index.ts` that re-exports only what other layers need. Create or update it for the new item. External code imports from the slice root only, never internal paths.
4. **Enforce import direction.** A layer may import only from layers below it. Reject/avoid upward imports (e.g. `entities/` importing from `features/`). Use aliases for all cross-slice imports; never relative `../` across a boundary.
5. **Handle cross-entity types with `@x`.** Entities must not import each other's public API (circular risk). When entity A needs a type from entity B, create `entities/B/@x/A/index.ts` exposing only what A needs, and import via `@entities/B/@x/A`. Prefer props or a feature layer over `@x` when possible.
6. **Place stores in their owning slice**, not the top-level legacy `stores/` directory: global UI state → `shared/lib/<name>/` or a feature's `model/`; domain data → the entity's `model/`; feature state → the feature's `model/`. Migrate touched legacy stores.

The *why*: the strict layer order and single public-API entry point are what make slices independently movable and refactorable; every rule above protects that property.

**Audit mode (`--check`):** Actually read the tree (don't just describe checks). For each of these, use search/read to find real offenders, then emit the report:
1. Slice directories missing `index.ts`.
2. Layer-order violations (`entities`→`features/widgets/pages`, `shared`→any slice, `features`→`widgets/pages`).
3. Imports that bypass a slice's public API (deep import into `ui/`, `model/`, etc.).
4. Direct entity-to-entity imports not using `@x`.
5. Store files still in top-level `stores/`.
6. `shared/` importing from any slice layer.
7. Segments misnamed inside slices (components outside `ui/`, stores outside `model/`).
Classify each as VIOLATION / WARNING / SUGGESTION and give a concrete fix.

## 6. Resources

No bundled scripts or reference files. The full ruleset (layer table, slice structure, naming conventions, alias list, decision flowchart, `@x` pattern, audit checklist) is self-contained in the skill body. A materializer should carry that ruleset into the built skill verbatim rather than summarizing it, since the audit depends on the precise check list.

## 7. Examples

**Example 1 — guard:**
- Input: "Add a booking form that submits an appointment."
- Output: A `features/book-appointment/` slice with `ui/BookingForm.vue`, `model/booking.store.ts` (`useBookingStore`), `api/booking.api.ts`, and `index.ts` exporting `BookingForm` + `useBookingStore`; the form imports the appointment type via `@entities/appointment`; imports use aliases.

**Example 2 — audit:**
- Input: `/fsd --check`
- Output: `FSD Audit — 2026-07-08` report listing, e.g., `❌ VIOLATION entities/appointment imports from features/book-appointment — src/entities/appointment/model/types.ts` with a fix, `⚠️ WARNING widgets/client-sidebar missing index.ts`, `💡 SUGGESTION migrate stores/locale.ts into shared/lib/locale/`, and a summary count.

## 8. Acceptance criteria

- For any new `src/` file, the built skill names an explicit layer + slice + segment before code is written.
- Every new slice it produces contains an `index.ts` public API; new exports are added there.
- Cross-slice imports it writes use aliases, never relative paths crossing a boundary.
- It never introduces an upward import; entity-to-entity type sharing uses the `@x/<consumer>/index.ts` pattern.
- New stores are placed in an owning slice's `model/` (or `shared/lib/`), not top-level `stores/`.
- In `--check` mode it *reads actual files* and emits a report matching the §4 format, ending with a `Summary: N errors, N warnings, N suggestions` line — including the clean-tree case.

## 9. Target adaptation

### 9.1 Claude Code

Build `.claude/skills/fsd/SKILL.md` (project-level). Frontmatter `name: fsd`; `description` must encode the §2 triggers (the "add component / create feature / new page / where does X go / /fsd --check" phrase list) and the "invoke even for trivial additions" imperative, since triggering is description-driven. Put the entire ruleset in the body. No bundled scripts needed — the audit is performed with the host's Grep/Read tools.

### 9.2 Codex / AGENTS.md

Add an `## FSD architecture` section to `AGENTS.md` stating: the layer order and import rule, the slice folder structure + mandatory `index.ts`, the alias requirement, the `@x` cross-entity pattern, store placement, and the instruction to run the 7-point audit on request. Frame it as a hard rule ("before creating/moving any file under src/…") so Codex applies it proactively.

### 9.3 Universal

Any agent, given only this spec, should: on any `src/` file change, classify layer→slice→segment per §5, maintain the slice `index.ts`, enforce import direction with aliases, and use `@x` for cross-entity types; on `--check`, run the 7 checks against the real tree and emit the §4 report.

## 10. Materialization log

| Tool        | Location                | Built from spec v | Date       |
|-------------|-------------------------|-------------------|------------|
| claude-code | .claude/skills/fsd/     | 1.0               | 2026-07-08 |
| codex       | AGENTS.md#fsd           | —                 | —          |

## 11. Changelog

- v1.0 — Initial spec, reverse-engineered from the existing `.claude/skills/fsd` Claude Code skill.
