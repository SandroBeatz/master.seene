---
spec_version: 1.0
date: 2026-07-08
status: built
skill_slug: nuxt-ui
skill_name: Nuxt UI Component Expert
targets: [claude-code, codex, universal]
---

# Nuxt UI Component Expert — Skill Specification

> Spec v1.0 · 2026-07-08 · status: built · [Skills index](./README.md)

## 1. Purpose

This skill makes the agent build UI from the project's design system (@nuxt/ui v4 + Tailwind v4) instead of hand-rolling markup. Nuxt UI ships 125+ production-ready components; a custom `<button>`, `<input>`, modal, or table wastes effort, breaks visual consistency, and bypasses the theme system.

The core discipline is: before writing any template markup, look the component up in the live Nuxt UI docs (via the context7 MCP), then use its real API — the `<U…>` component, its `color`/`variant`/`size` props, and its named slots — rather than relying on memory or CSS classes. Component APIs and slot names change between versions, so the lookup is mandatory, not optional.

Its value: every screen uses the same vetted components and theme utilities, and the agent never invents props or slots that don't exist in the installed version.

## 2. When to trigger

**Should trigger:**
- Any template/markup or visual-component work: layouts, forms, modals, tables, navigation, overlays, cards, badges, avatars, tabs, dropdowns, sidebars, drawers, toasts, tooltips, accordions, pagination, selects, inputs, switches, progress, skeletons, alerts — or any other on-screen element.
- Any mention of a specific UI element by name (button, card, form, table, modal, …).
- Layout/styling tasks or anything touching a `.vue` `<template>` section, including Russian terms: "верстка", "разметка", "компонент", "форма", "таблица", "модал".
- Rule of thumb: **if it renders on screen, trigger.**

**Should NOT trigger:**
- Pure `<script>`/logic changes with no markup.
- Non-UI work (database, routing config, build tooling).
- Where the visible *text* is the concern, pair with `[[i18n]]`; where the *file placement* is the concern, pair with `[[fsd]]` — but component selection itself stays here.

## 3. Inputs

- **User request** describing UI to build or a named component/element.
- **context7 MCP** — the source of truth for component props/slots/variants/emits and live examples.
- **Theme utilities** (`text-muted`, `bg-elevated`, `border-default`, semantic colors) and the color registration in `vite.config.ts` under `ui.colors`.
- **`docs/design/themes-and-variables.md`** and **`docs/ui/nuxt-ui-components.md`** for the token system and component catalog.

## 4. Outputs

No fixed template. The deliverable is Vue template markup using Nuxt UI components: `<U{ComponentName}>` elements configured through props (`color`, `variant`, `size`) and slots, using theme utility classes rather than raw Tailwind color classes, and matching the exact API returned by the docs lookup.

## 5. Workflow

1. **Decide if Nuxt UI already provides it.** Before writing markup, determine whether a Nuxt UI component covers the need (it almost always does — see the 12-category, 125+ component reference). Do not hand-roll a `<button>`, `<input>`, `<table>`, modal, dropdown, or any element with a Nuxt UI equivalent.
2. **Look it up in the live docs — always, not from memory:**
   - `mcp__context7__resolve-library-id` with query `"@nuxt/ui"`.
   - `mcp__context7__query-docs` with that library id, `tokens: 4000`, `topic: "<component name>"`.
   Read the returned props, slots, variants, emits, and examples before writing code. This step is mandatory because slot names and props change between versions.
3. **Write it with the real API:**
   - Use the `<U{ComponentName}>` prefix (`<UButton>`, `<UModal>`, `<UTable>`).
   - Express variants through props (`color`, `variant`, `size`) — not custom CSS classes.
   - Use named slots for custom content instead of wrapping `<div>`s.
   - Use theme utilities (`text-muted`, `bg-elevated`, `border-default`) rather than raw color classes, so light/dark and theming work.
4. **Avoid the anti-patterns:** no hand-rolled elements that duplicate Nuxt UI, and no `class="bg-green-600 text-white"` overrides where a `color="success" variant="solid"` prop exists.
5. **Troubleshoot with the docs first:** component not rendering → check `@import "@nuxt/ui"` comes after `@import "tailwindcss"` in `main.css`; color not working → the semantic color must be registered in `vite.config.ts` under `ui.colors`; missing slot/prop → re-check via context7 rather than assuming.

The *why*: props+slots+theme-utilities are what tie each component to the central design system; reproducing their behavior with raw markup silently forks the design.

## 6. Resources

- **context7 MCP** (external) — required at runtime for component-doc lookups; the skill is built around it and cannot fulfill its mandate without it.
- **Component reference table** (12 categories, 125+ components) — bundled in the skill body as a quick index for "does a component exist?" decisions; the authoritative API always comes from the live lookup.
- No scripts to bundle.

## 7. Examples

**Example 1:**
- Input: "Add a confirmation modal before deleting a client."
- Output: after a context7 lookup of `Modal`, a `<UModal v-model:open="isOpen" title="…">` with `#body` and `#footer` slots and `<UButton color="error">` / `<UButton color="neutral" variant="ghost">` actions.

**Example 2:**
- Input: "Make a form with an email field and submit button."
- Output: after looking up `Form`/`FormField`/`Input`, a `<UForm :schema :state @submit>` wrapping `<UFormField label name><UInput v-model /></UFormField>` and a `<UButton type="submit">` — no hand-rolled `<input>` or `<button>`.

## 8. Acceptance criteria

- For any on-screen element with a Nuxt UI equivalent, the built skill uses the `<U…>` component, never hand-rolled markup.
- It performs a context7 lookup (`resolve-library-id` → `query-docs`) before writing the component, rather than relying on memory.
- Variants are expressed via `color`/`variant`/`size` props, not overriding CSS classes; custom content uses named slots; theme utilities are used for colors.
- It does not invent props or slots absent from the looked-up API.
- Troubleshooting references the correct causes (import order in `main.css`, color registration in `vite.config.ts`).

## 9. Target adaptation

### 9.1 Claude Code

Build `.claude/skills/nuxt-ui/SKILL.md` (project-level). Frontmatter `name: nuxt-ui`; `description` must encode the broad §2 triggers (the element-name list + "if it renders on screen, use this skill first" + the Russian terms), since near-every markup task should activate it. Body carries the core rule, the two-step context7 lookup, the component reference table, common patterns, and troubleshooting. Requires the context7 MCP to be available in the host.

### 9.2 Codex / AGENTS.md

Add a `## Nuxt UI` section to `AGENTS.md`: state the "don't hand-roll — use @nuxt/ui components" rule, the requirement to consult current Nuxt UI docs before writing a component (via context7 if available, else https://ui.nuxt.com/docs/components), use of `color`/`variant`/`size` props and named slots over CSS, theme utilities for colors, and the troubleshooting checklist. Frame as a pre-write rule for any markup.

### 9.3 Universal

Given only this spec, an agent should: for any UI element, first check whether Nuxt UI provides it; look up the current component API (context7 preferred, else the docs URL); write it as `<U…>` with prop-based variants and named slots and theme utilities; and never invent props/slots or duplicate a Nuxt UI element with raw markup.

## 10. Materialization log

| Tool        | Location                  | Built from spec v | Date       |
|-------------|---------------------------|-------------------|------------|
| claude-code | .claude/skills/nuxt-ui/   | 1.0               | 2026-07-08 |
| codex       | AGENTS.md#nuxt-ui         | —                 | —          |

## 11. Changelog

- v1.0 — Initial spec, reverse-engineered from the existing `.claude/skills/nuxt-ui` Claude Code skill.
