---
name: i18n
description: >
  Mandatory i18n skill for the Seene project. MUST be invoked before any UI/markup/component
  work that involves visible text — labels, titles, descriptions, buttons, placeholders,
  aria-labels, alt text, navigation items, error messages, or any human-readable string.
  This includes: writing new Vue components, editing existing templates, adding props with text
  values, building pages, modifying layouts. Even if the user just says "add a button" or
  "update the title" — invoke this skill. The project uses vue-i18n with three locales:
  en (default), fr, ru. Hardcoded strings are a bug, not a style preference.

  Special mode: when invoked with `--check` argument, scan the entire project for hardcoded text
  and offer to migrate each occurrence interactively.
---

# i18n Skill — Seene Project

## Stack

- Library: **vue-i18n v11** (Composition API mode, `legacy: false`)
- Locales: **en** (default), **fr**, **ru**
- Translation files: `src/shared/lib/i18n/locales/{en,fr,ru}.ts` (TypeScript, `export default {}`)
- i18n instance: `src/shared/lib/i18n/index.ts`
- Locale store: `src/stores/locale.ts` — `useLocaleStore()` with `current` and `setLocale(code)`
- Locale persisted in `localStorage` under the key `'locale'`

## Usage in Vue files

**In `<script setup>`** — import `useI18n` from `vue-i18n`, destructure `t`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Static use (runs once at setup time — fine for text that doesn't change with locale)
const title = t('settings.title')

// Reactive use — wrap in computed() so it updates when locale changes
const navItems = computed(() => [
  { label: t('nav.home'), icon: 'i-lucide-home', to: '/' },
  { label: t('nav.calendar'), icon: 'i-lucide-calendar', to: '/calendar' },
])
</script>
```

**In `<template>`** — `$t` is globally available via `app.use(i18n)`, no import needed:

```vue
<UPageHeader :title="$t('settings.title')" :description="$t('settings.description')" />
{{ $t('hero.title') }}
<img :alt="$t('hero.imageAlt')" />
```

> **When to use `computed()` vs direct call:**
> If the text is in a reactive array/object (e.g. `navItems`, `columns`, `tabs`) it must be
> inside `computed()` to stay reactive when the user switches language. Simple interpolation
> in templates (`{{ $t('key') }}` or `:title="$t('key')"`) is always reactive — no wrapper needed.

---

## Locale file structure

All translations live in three TypeScript files:

```
src/shared/lib/i18n/locales/
  en.ts    ← English (default)
  fr.ts    ← French
  ru.ts    ← Russian
```

Each file exports a plain object. Keys are nested by feature/page area:

```ts
// en.ts
export default {
  nav: {
    home: 'Home',
    calendar: 'Calendar',
    clients: 'Clients',
    services: 'Services',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    description: 'Manage your account and preferences.',
    nav: {
      general: 'General',
    },
    general: {
      title: 'General',
      language: 'Language',
      languageDescription: 'Choose the language used in the interface.',
    },
  },
}
```

There is **no** page-level file splitting — everything goes into these three files. Use namespace
nesting to avoid collisions (e.g. `settings.general.title` not just `title`).

---

## Key naming rules

### Step 1 — Check existing keys first

Before creating a new key, read `src/shared/lib/i18n/locales/en.ts`. If the meaning already
exists, **reuse that key**. Never duplicate phrases under different keys.

### Step 2 — Scope new keys by context

| Context                    | Key pattern                | Example                              |
| -------------------------- | -------------------------- | ------------------------------------ |
| Global layout / sidebar nav | `nav.{name}`              | `nav.home`, `nav.calendar`           |
| Page header / title         | `{page}.title`            | `settings.title`, `clients.title`    |
| Page section               | `{page}.{section}.{name}` | `settings.general.language`          |
| Shared / reusable UI       | `common.{name}`           | `common.save`, `common.cancel`       |
| Component-specific         | `{componentName}.{name}`  | `notificationCard.timeAgo`           |

**Rules:**
- Keys are camelCase, no hyphens
- Be descriptive: `settings.general.languageDescription` not `settings.general.desc`
- Group related keys under a shared parent
- Avoid generic keys like `button` or `text` — they break in different contexts

### Step 3 — Add to all three locale files

Always update `en.ts`, `fr.ts`, and `ru.ts` in the same edit. Never leave a locale missing a
key — vue-i18n falls back to `en` silently, which masks missing translations.

If you don't know the French or Russian translation, make a reasonable one. A best-effort
translation is better than a missing key (which shows the raw key string in non-English locales).

---

## Routing and internal links

This project uses plain **Vue Router** with no locale-prefixed URLs. Routes are the same for all
languages (`/settings`, `/calendar`, etc.). Hardcoded `to="/settings"` is correct — no wrapper
needed. Do **not** use `$localePath()` — that was from the old Nuxt setup and doesn't exist here.

---

## Switching locale

To switch the active language, call `useLocaleStore().setLocale('en' | 'fr' | 'ru')`. This
updates `i18n.global.locale`, the store's `current` ref, and persists to localStorage.

```vue
<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale'
const localeStore = useLocaleStore()
</script>

<template>
  <UButtonGroup>
    <UButton
      v-for="lang in [{ code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }, { code: 'ru', label: 'Русский' }]"
      :key="lang.code"
      :variant="localeStore.current === lang.code ? 'solid' : 'outline'"
      color="neutral"
      @click="localeStore.setLocale(lang.code)"
    >
      {{ lang.label }}
    </UButton>
  </UButtonGroup>
</template>
```

---

## --check mode

When this skill is invoked with `--check` (e.g. `/i18n --check`):

1. **Scan** all `.vue` files in `src/` for hardcoded human-readable strings:
   - Attribute values that are plain strings and not keys/paths/URLs/icons (e.g. `label="Settings"`)
   - Text nodes inside templates (e.g. `<h2>General</h2>`)
   - Skip: icon names (`i-lucide-*`), URLs, route paths, CSS classes, color names, values already
     using `$t()` or `t()`

2. **Present findings** grouped by file:
   - File path
   - Line number
   - The hardcoded string
   - Suggested key name (following naming rules above)

3. **Ask the user**: "Found N hardcoded strings. Translate them? (yes / no / select)"
   - **yes** → migrate all
   - **no** → do nothing
   - **select** → migrate only named files/strings

4. **Migration** for each approved string:
   - In template: replace with `$t('key')`
   - In `<script setup>`: replace with `t('key')` (ensure `useI18n` is imported and `t` destructured)
   - Add the key to all three locale files
   - If the string is in Russian, use as `ru` value and translate to `en`/`fr`
   - If in English, use as `en` and translate to `fr`/`ru`

---

## Quick checklist (run mentally before every UI task)

- [ ] Is there any visible text in this markup? → wrap in `$t()` (template) or `t()` (script)
- [ ] Does an equivalent phrase exist in `src/shared/lib/i18n/locales/en.ts`? → reuse the key
- [ ] New key? → scope it correctly, add to all three locale files simultaneously
- [ ] Text used in a reactive array/object in `<script setup>`? → wrap in `computed()`
- [ ] `aria-label` and `alt` attributes → also translated
- [ ] Internal `to` props → plain Vue Router paths are fine, no locale prefix needed
