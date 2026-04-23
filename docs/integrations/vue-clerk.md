---
version: 1.0
date: 2026-04-23
category: integrations
---

# Vue Clerk — Authentication Integration

> Version 1.0 · 2026-04-23 · [Integrations](../integrations/)

## Overview

[Vue Clerk](https://vue-clerk.vercel.app) is a Vue wrapper around [ClerkJS](https://clerk.com/docs/references/javascript/clerk/clerk) — the official JavaScript SDK from Clerk. It provides Vue-native pre-built components, composables, and helpers that make it trivial to add authentication and user management to any Vue 3 + Vite application.

> **⚠️ Migration note:** The community `vue-clerk` package has graduated to an official SDK. The new package is [`@clerk/vue`](https://clerk.com/docs/references/vue/overview). New projects should use `@clerk/vue`; existing `vue-clerk` projects should follow the [migration guide](https://clerk.com/docs/references/vue/migrating-from-vue-community-sdk).

Clerk handles:
- Authentication flows (email/password, OAuth, magic links, OTP, MFA)
- Session management and token refresh
- User profile management
- Organization / multi-tenancy support
- Pre-built, customizable UI components

## Architecture

```
Clerk Dashboard (config)
        │
        ▼
  clerkPlugin (Vue plugin, installed in main.ts)
        │  provides reactive session/user context
        ▼
  Any component
  ├── Pre-built components  (<SignIn />, <UserButton />, <Protect />, …)
  └── Composables           (useAuth, useUser, useClerk, useSession, …)
```

The plugin wraps the entire app with a reactive context. Once installed, any component can consume auth state and user data via composables — no prop drilling required.

Key design principles:
- Composables return **Vue refs**, not raw values — access reactive data via `.value`.
- Pre-built components are fully functional out of the box; their behavior is controlled via the [Clerk Dashboard](https://dashboard.clerk.com).
- Custom flows are built with `useSignIn()`, `useSignUp()`, and `useClerk()` as escape hatches.

## Configuration

### 1. Install the SDK

```bash
# community package (legacy)
npm install vue-clerk

# official package (recommended for new projects)
npm install @clerk/vue
```

### 2. Environment variable

Create `.env.local` in the project root:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_************************
```

Get your key from **Clerk Dashboard → API Keys → Quick Copy**.

### 3. Register the plugin (`src/app/main.ts`)

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { clerkPlugin } from 'vue-clerk' // or '@clerk/vue'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

const app = createApp(App)
app.use(clerkPlugin, { publishableKey: PUBLISHABLE_KEY })
app.mount('#app')
```

### Runtime option updates

Use `updateClerkOptions()` to change Clerk configuration at runtime (e.g., switching locale or appearance theme):

```ts
import { updateClerkOptions } from '@clerk/vue'
updateClerkOptions({ appearance: { theme: darkTheme } })
```

See [reference](https://clerk.com/docs/reference/vue/update-clerk-options).

## Usage

### Pre-built UI components

Import directly from `vue-clerk` / `@clerk/vue`. No registration needed — use them straight in templates.

#### Control flow components

| Component | When it renders |
|---|---|
| `<SignedIn>` | Only when a user is authenticated |
| `<SignedOut>` | Only when no user is authenticated |
| `<ClerkLoaded>` | After the Clerk SDK has initialized |
| `<Protect>` | Based on org role / permission |

**Basic auth guard in a header:**

```vue
<script setup>
import { SignedIn, SignedOut, SignInButton, UserButton } from 'vue-clerk'
</script>

<template>
  <header>
    <SignedOut>
      <SignInButton />
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
  </header>
</template>
```

**Role-based access control with `<Protect>`:**

```vue
<script setup>
import { Protect } from 'vue-clerk'
</script>

<template>
  <!-- By permission (recommended) -->
  <Protect permission="org:invoices:create">
    <template #fallback>
      <p>You don't have permission to create invoices.</p>
    </template>
    <CreateInvoiceForm />
  </Protect>

  <!-- By role -->
  <Protect role="org:admin">
    <AdminPanel />
  </Protect>

  <!-- Conditional logic (multiple roles/permissions) -->
  <Protect :condition="(has) => has({ role: 'org:admin' }) || has({ role: 'org:billing_manager' })">
    <BillingPanel />
  </Protect>
</template>
```

**Wait for Clerk to initialize (`<ClerkLoaded>`):**

```vue
<script setup>
import { ClerkLoaded } from 'vue-clerk'
</script>

<template>
  <ClerkLoaded>
    <!-- Safe to access window.Clerk here -->
    <Page />
  </ClerkLoaded>
</template>
```

#### Authentication components

| Component | Purpose |
|---|---|
| `<SignIn path="/sign-in" />` | Full sign-in form |
| `<SignUp path="/sign-up" />` | Full sign-up form |
| `<UserButton />` | Avatar button with profile popup (Google-style) |
| `<UserProfile />` | Full user profile management page |

```vue
<script setup>
import { SignIn } from 'vue-clerk'
</script>

<template>
  <!-- Renders on /sign-in route -->
  <SignIn path="/sign-in" />
</template>
```

The `<UserButton />` supports multi-session out of the box — users can sign into multiple accounts and switch between them instantly.

---

### Custom components with `as-child` + slots

For unstyled button components (`<SignInButton>`, `<SignOutButton>`, `<SignUpButton>`), pass your own element via the `as-child` prop and the `v-slot` directive:

```vue
<script setup>
import { SignInButton } from 'vue-clerk'
</script>

<template>
  <!-- Use your own button or Nuxt UI UButton -->
  <SignInButton v-slot="props" as-child>
    <button v-bind="props" class="btn-primary">
      Sign in with Clerk
    </button>
  </SignInButton>
</template>
```

The `props` object passed via `v-slot` contains the click handler and any ARIA attributes — spread it onto your custom element with `v-bind`.

> This pattern is the correct way to use Nuxt UI (`<UButton>`) or any other design system component with Clerk's trigger buttons.

---

### Composables

All composables are imported from `vue-clerk` or `@clerk/vue`. They return **reactive refs** — access data via `.value` in script, but templates auto-unwrap them.

#### `useAuth()` — current auth state

```vue
<script setup>
import { useAuth } from 'vue-clerk'

const { isLoaded, isSignedIn, getToken } = useAuth()

async function fetchProtectedData() {
  const token = await getToken.value() // JWT for your backend
  const res = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
</script>

<template>
  <div v-if="!isLoaded">Loading…</div>
  <div v-else-if="!isSignedIn">Please sign in.</div>
  <div v-else>Welcome!</div>
</template>
```

→ Full return shape: [useAuth returns](https://clerk.com/docs/references/react/use-auth#use-auth-returns)

#### `useUser()` — current user object

```vue
<script setup>
import { useUser } from 'vue-clerk'

const { isLoaded, isSignedIn, user } = useUser()

async function updateProfile() {
  await user.value.update({ firstName: 'John', lastName: 'Doe' })
}

async function reloadAfterExternalUpdate() {
  await fetch('/api/updateMetadata')
  await user.value.reload() // pull fresh data from Clerk
}
</script>

<template>
  <div v-if="user">Hello, {{ user.fullName }}!</div>
</template>
```

→ Full `User` object reference: [clerk.com/docs/references/javascript/user/user](https://clerk.com/docs/references/javascript/user/user)

#### `useSession()` — active session

```vue
<script setup>
import { useSession } from 'vue-clerk'

const { isLoaded, isSignedIn, session } = useSession()
</script>

<template>
  <div v-if="isSignedIn">
    Last active: {{ session.lastActiveAt.toLocaleString() }}
  </div>
</template>
```

→ Full `Session` reference: [clerk.com/docs/references/javascript/session](https://clerk.com/docs/references/javascript/session)

#### `useSignIn()` — custom sign-in flow

Use when you need full control over the authentication flow (e.g., email+password with custom UI):

```vue
<script setup>
import { useSignIn } from 'vue-clerk'

const { isLoaded, signIn } = useSignIn()
// signIn.value.status tells you where in the flow you are
</script>
```

→ Custom flow guide: [clerk.com/docs/custom-flows/overview](https://clerk.com/docs/custom-flows/overview)

#### `useSignUp()` — custom sign-up flow

```vue
<script setup>
import { useSignUp } from 'vue-clerk'

const { isLoaded, signUp } = useSignUp()
</script>
```

#### `useOrganization()` — org context

```vue
<script setup>
import { ref, watchEffect } from 'vue'
import { useOrganization } from 'vue-clerk'

const { organization, isLoaded } = useOrganization()
const members = ref([])

watchEffect(async () => {
  if (!organization.value) return
  const { data } = await organization.value.getMemberships({
    initialPage: 1,
    pageSize: 10,
  })
  members.value = data
})
</script>

<template>
  <ul v-if="isLoaded">
    <li v-for="m in members" :key="m.id">
      {{ m.publicUserData.firstName }} — {{ m.role }}
    </li>
  </ul>
</template>
```

→ Organization reference: [clerk.com/docs/references/javascript/organization/organization](https://clerk.com/docs/references/javascript/organization/organization)

#### `useClerk()` — raw Clerk object (advanced)

For advanced use cases: programmatically open modals, build completely custom OAuth flows, or access any Clerk method not exposed by higher-level composables.

```vue
<script setup>
import { useClerk } from 'vue-clerk'

const clerk = useClerk()
// clerk is a ref — use clerk.value to access methods
</script>

<template>
  <button @click="clerk.openSignIn()">Open sign-in modal</button>
  <button @click="clerk.openUserProfile()">Open profile</button>
</template>
```

> ⚠️ `useClerk()` is the escape hatch. Prefer `useAuth()`, `useUser()`, or `useSession()` in everyday usage.

→ Full Clerk object reference: [clerk.com/docs/references/javascript/clerk/clerk](https://clerk.com/docs/references/javascript/clerk/clerk)

---

### Appearance customization

Clerk components accept an `appearance` prop for visual customization. You can target Clerk's internal CSS variables or override CSS classes.

```vue
<template>
  <SignIn
    path="/sign-in"
    :appearance="{
      variables: {
        colorPrimary: '#6c47ff',
        borderRadius: '0.5rem',
      },
      elements: {
        card: 'shadow-none border border-gray-200',
        formButtonPrimary: 'bg-violet-600 hover:bg-violet-700',
      },
    }"
  />
</template>
```

> All components accept the `appearance` prop. You can also set a global appearance via `updateClerkOptions()`.

→ Appearance reference: [clerk.com/docs/customization/overview](https://clerk.com/docs/customization/overview)

---

### Router integration (Vue Router)

When using `<SignIn path="..." />` or `<SignUp path="..." />`, Clerk needs to know the route where the component lives. Pass `path` matching your Vue Router route:

```ts
// src/app/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@pages/home/ui/HomePage.vue') },
    { path: '/sign-in', component: () => import('@pages/sign-in/ui/SignInPage.vue') },
    { path: '/sign-up', component: () => import('@pages/sign-up/ui/SignUpPage.vue') },
  ],
})
```

```vue
<!-- src/pages/sign-in/ui/SignInPage.vue -->
<script setup>
import { SignIn } from 'vue-clerk'
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <SignIn path="/sign-in" />
  </div>
</template>
```

---

### Migration from `vue-clerk` to `@clerk/vue`

The main breaking change is in `useClerk()`:

```ts
// Before (vue-clerk)
import { useClerk } from 'vue-clerk'
const clerk = useClerk()
clerk.openSignIn() // clerk was a plain object

// After (@clerk/vue)
import { useClerk } from '@clerk/vue'
const clerk = useClerk()
clerk.value.openSignIn() // clerk is now a Vue ref
```

→ Full migration guide: [clerk.com/docs/references/vue/migrating-from-vue-community-sdk](https://clerk.com/docs/references/vue/migrating-from-vue-community-sdk)

## Cross-references

- [Themes and Variables](../design/themes-and-variables.md) — project CSS token system; Clerk's `appearance.variables` should align with these tokens
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — when wrapping Nuxt UI buttons with `as-child` for Clerk triggers

## File Structure

| Path | Description |
|---|---|
| `src/app/main.ts` | Where `clerkPlugin` is registered |
| `src/app/router/index.ts` | Route definitions for `/sign-in`, `/sign-up` pages |
| `src/pages/sign-in/` | Sign-in page component |
| `src/pages/sign-up/` | Sign-up page component |
| `.env.local` | `VITE_CLERK_PUBLISHABLE_KEY` — never commit this file |
