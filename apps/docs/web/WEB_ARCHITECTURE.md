# AGENTS.md

Architecture and conventions for this project. **Read this before writing any code.**

This is a **commerce platform** built on Next.js App Router: a public storefront, a customer account area, and an internal back-office, sharing one design system and one data-access layer.

This document is normative. When a rule here conflicts with a habit, a tutorial, or an older file in this repo, **this document wins** — and the older file is a bug to be fixed, not a precedent to be copied.

---

## Table of contents

1. [Golden rules](#1-golden-rules)
2. [Tech stack and why](#2-tech-stack-and-why)
3. [Repository shape](#3-repository-shape)
4. [The rendering model](#4-the-rendering-model)
5. [Directory structure](#5-directory-structure)
6. [The request lifecycle](#6-the-request-lifecycle)
7. [Routing conventions](#7-routing-conventions)
8. [Internationalization](#8-internationalization)
9. [The root request interceptor](#9-the-root-request-interceptor)
10. [Authentication and authorization](#10-authentication-and-authorization)
11. [Data access layer](#11-data-access-layer)
12. [Forms](#12-forms)
13. [State management decision tree](#13-state-management-decision-tree)
14. [Admin data tables](#14-admin-data-tables)
15. [The design system package](#15-the-design-system-package)
16. [Commerce-specific rules](#16-commerce-specific-rules)
17. [SEO and metadata](#17-seo-and-metadata)
18. [Observability](#18-observability)
19. [Performance budgets](#19-performance-budgets)
20. [Testing](#20-testing)
21. [Build and deploy](#21-build-and-deploy)
22. [Naming and code conventions](#22-naming-and-code-conventions)
23. [Anti-patterns — never do these](#23-anti-patterns--never-do-these)
24. [Recipe: scaffold a new module](#24-recipe-scaffold-a-new-module)
25. [Definition of done](#25-definition-of-done)

---

## 1. Golden rules

Violating any of these should fail review.

1. **Server Components by default.** Add `"use client"` only when you need state, effects, browser APIs, or event handlers. Push the client boundary as deep down the tree as possible.
2. **Server Actions are public HTTP endpoints.** Every Server Action re-validates its input with Zod and re-checks authorization on the server. Client-side validation is a UX affordance, never a security control.
3. **Never trust a price, a quantity, a discount, or a stock level sent from the client.** The server resolves all of them from the source of truth. Always.
4. **Money is an integer in minor units.** Never a float. Never a formatted string in business logic.
5. **List state lives in the URL** — filters, pagination, sorting, search. Not in `useState`. A filtered list must be shareable, bookmarkable, and survive a refresh.
6. **One mechanism per problem.** Before building a pagination control, a filter provider, a loading indicator, or a modal system, search the repo for an existing one and use it. Two solutions to one problem is a defect.
7. **No global client state library.** The state tiers in [§13](#13-state-management-decision-tree) cover every case in this app. If you think you need Redux/Zustand/Jotai, you have skipped a tier.
8. **Every mutation invalidates its cache tags.** A create/update/delete that leaves stale lists on screen is incomplete work.
9. **Fetch on the server, mutate through Server Actions.** No `fetch` calls to the business API from Client Components. No API tokens in the client bundle, ever.
10. **Folder names are a contract.** Use the exact plural/singular forms in [§22](#22-naming-and-code-conventions). No exceptions, no "just this once".

---

## 2. Tech stack and why

| Layer | Choice | Why this, and what problem it solves |
|---|---|---|
| Framework | **Next.js (App Router)** | Server Components, Server Actions, per-route rendering strategy, file-system routing, streaming. The per-route rendering control is non-negotiable for commerce: the catalog must be statically cacheable while the cart must never be. |
| UI runtime | **React 19** | Server Components, `useOptimistic`, `useActionState`, `useFormStatus` — all used directly for cart and form UX. |
| Language | **TypeScript**, `strict: true` | Non-negotiable. `any` requires a written justification in the same line comment. |
| Package manager | **pnpm** + workspaces | Hard-linked store, strict dependency resolution (no phantom dependencies), first-class monorepo support. |
| Build orchestration | **Turborepo** | Task graph + remote cache. `turbo prune` produces a minimal Docker context per app. |
| Styling | **Tailwind CSS** | Utility-first, colocated with markup, no CSS file sprawl, trivially tree-shakeable. Design tokens live as CSS variables in the shared package. |
| Components | **shadcn/ui** primitives, vendored into a shared package | You own the code (no black-box library upgrades breaking your UI), built on Radix accessibility primitives. |
| Icons | **lucide-react** | Consistent set, tree-shakeable, pairs with shadcn/ui. |
| Forms | **react-hook-form** | Uncontrolled by default → no re-render per keystroke. Critical for large admin forms and multi-line checkout. |
| Validation | **Zod** | One schema is both the runtime validator and the TypeScript type (`z.infer`). Used on both sides of every boundary. |
| Form ↔ validation bridge | **@hookform/resolvers** | `zodResolver` maps Zod issues onto form fields. |
| i18n | **next-intl** | App Router-native: locale-prefixed routing, server + client translations, ICU messages, locale-aware formatters for currency and dates. |
| Auth | **Auth.js / NextAuth** | Session management, JWT strategy, credential + OAuth providers. Pin one major version at project start and never mix v4/v5 APIs in the same repo. |
| Theming | **next-themes** | Class-based dark mode with system preference detection and no flash on load. |
| Errors & monitoring | **Sentry** | Per-runtime init (node / edge / browser), release tracking, session replay. |
| Dates | **date-fns** (or `Temporal` when available) | Tree-shakeable, immutable. Re-exported through the shared package — see [§15](#15-the-design-system-package). |

**Deliberately absent, and why:**

- **No client-side data-fetching/caching library** (React Query, SWR, Apollo). Server Components fetch with the framework's own cache; mutations are Server Actions that invalidate tags. Introducing a second caching model would mean two sources of truth for "is this data stale".
- **No Axios.** Native `fetch` is what the framework instruments for caching and revalidation. Wrapping it (see [§11](#11-data-access-layer)) gives you everything Axios would, plus cache integration.
- **No CSS-in-JS runtime.** It fights Server Components and adds runtime cost.
- **No state management library.** See [§13](#13-state-management-decision-tree).

**Adding a dependency** requires: (a) no existing solution in the repo covers it, (b) it is added to the correct workspace package (see [§15](#15-the-design-system-package)), (c) it is actually imported in the same PR that adds it. A dependency declared and never imported is deleted on sight.

---

## 3. Repository shape

```
.
├── apps/
│   └── web/                    # storefront + account + admin (one app, see below)
├── packages/
│   ├── ui/                     # design system: primitives, tokens, RHF-bound fields, curated re-exports
│   ├── eslint-config/          # shared flat config
│   └── typescript-config/      # shared tsconfig bases
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Internal packages are referenced with the workspace protocol and namespaced:

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*"
  }
}
```

### One app or several?

**Start with one app** containing route groups `(storefront)`, `(account)`, and `(admin)`. Next.js code-splits per route, so the admin bundle is never shipped to a storefront visitor.

**Split the admin into its own app only when** one of these becomes true, and say which one in the PR description:
- Storefront and admin need independent deploy cadences or separate infrastructure.
- CI build time for the single app exceeds your tolerance and `turbo` caching no longer helps.
- The admin needs a different auth surface (separate identity provider, separate session cookie domain).

Splitting earlier than that costs you shared types, shared `Result` handling, and a second deployment pipeline for no benefit.

### Critical monorepo rule

The app **transpiles** the shared UI package rather than consuming a prebuilt bundle:

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  output: "standalone",
}
```

This keeps the design system as plain TypeScript source — no build step in `packages/ui`, no stale dist, and Server/Client Component directives survive intact into the app's compilation.

---

## 4. The rendering model

This is the single highest-leverage decision in the codebase. Get it wrong and you either leak secrets to the browser or make the catalog uncacheable.

### Server Component vs Client Component

| | Server Component (default) | Client Component (`"use client"`) |
|---|---|---|
| Runs | On the server, per request or at build | On the server once (SSR) **and** in the browser |
| Can | `await` data, read cookies/session, use secrets, import server-only code | `useState`, `useEffect`, event handlers, browser APIs |
| Cannot | Use hooks or event handlers | Read secrets, `await` at the top level, import server-only modules |
| Ships JS to browser | **No** | Yes |

**Rules:**

- A file with no `"use client"` is a Server Component. Do not add the directive "just in case".
- `"use client"` marks a **boundary**, not a file. Everything imported by that file becomes client code too. So put the directive on the smallest leaf that needs it.
- **Never** convert a parent to a Client Component to fix a child. Instead, pass the server-rendered subtree down as `children`:

```tsx
// ✅ Server Component resolved on the server, handed to a client shell as children
// app/[locale]/(admin)/layout.tsx  — Server Component
export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <SessionExpiryWatcher>        {/* Client: polls for token expiry */}
      <ServerSessionGuard>        {/* Server: validates against the API, redirects */}
        {children}
      </ServerSessionGuard>
    </SessionExpiryWatcher>
  )
}
```

A Client Component can **render** a Server Component passed as `children` or as a prop. It can never **import** one. This "children as a slot" pattern is how every mixed-boundary layout in this repo is built.

### Rendering strategy per route

Declare the strategy explicitly on every route. Do not rely on the default.

| Route | Strategy | How | Why |
|---|---|---|---|
| `/` home | ISR | `export const revalidate = 300` | Merchandising changes hourly at most; must be fast and cacheable. |
| `/c/[slug]` category | ISR + `generateStaticParams` | prerender top categories, rest on demand | SEO-critical, high traffic, low mutation rate. |
| `/p/[slug]` product | ISR + on-demand revalidation | `revalidateTag(CacheTags.products.byId(id))` from the admin mutation and from stock/price webhooks | Must be indexable and instant, but price/stock changes must land within seconds. |
| `/search` | Dynamic | reads `searchParams` | Unbounded query space; not cacheable. |
| `/cart` | Dynamic, never cached | `export const dynamic = "force-dynamic"` | Per-visitor state. Caching this leaks another customer's cart. |
| `/checkout/**` | Dynamic, never cached, `noindex` | same, plus robots metadata | Per-visitor, contains PII. |
| `/account/**` | Dynamic, auth-gated, `noindex` | | Per-customer data. |
| `/admin/**` | Dynamic, auth-gated, `noindex` | | Internal, always fresh. |

> **Cache-poisoning rule:** any route whose output depends on the session, a cookie, or a cart must be `force-dynamic`. If you are unsure whether a route is personalized, it is — make it dynamic.

---

## 5. Directory structure

```
apps/web/src/
├── app/                         # ROUTING ONLY. Thin files. No business logic.
│   ├── [locale]/
│   │   ├── layout.tsx           # the app's only <html>/<body>
│   │   ├── (storefront)/
│   │   ├── (account)/
│   │   └── (admin)/
│   ├── api/                     # route handlers — the short allowlist in §11.6
│   ├── global-error.tsx
│   └── global-not-found.tsx
├── modules/                     # ALL business logic, one folder per domain
│   ├── products/
│   ├── categories/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── customers/
│   ├── discounts/
│   └── inventory/
├── components/                  # app-wide shared components (not domain-specific)
│   ├── layout/                  # sidebar, navbar, footer, breadcrumbs
│   ├── data-table/              # the ONE admin table system
│   └── common/                  # page-header, empty-state, confirm-dialog, error views
├── config/
│   ├── api/                     # fetcher, Result, error translation, retry policy
│   ├── auth/                    # auth options, callbacks, type augmentation
│   └── middleware/              # the composable interceptor pipeline
├── hooks/                       # cross-domain hooks only
├── i18n/                        # routing, request config, navigation wrappers
├── lib/
│   ├── actions/                 # cross-domain Server Actions (rare)
│   ├── constants/
│   ├── schemas/                 # reusable Zod fragments (money, address, pagination…)
│   ├── types/                   # shared types (Result, Paginated<T>, Money…)
│   └── utils/                   # pure functions only, no I/O
├── providers/                   # app-wide React context providers
├── routes/
│   ├── api-routes.ts            # every backend endpoint template
│   ├── client-routes.ts         # every internal URL, typed
│   ├── cache-tags.ts            # every cache tag
│   └── navigation-data.ts       # sidebar/menu definitions + required permissions
└── proxy.ts                     # root request interceptor (see §9)
```

### Module anatomy

**Every module has the same internal shape.** No extra nesting levels. No creative variations. An agent should be able to guess any path without looking.

```
modules/products/
├── components/          # presentational, dumb, mostly client
│   ├── form/
│   ├── list/
│   └── detail/
├── containers/          # Server Components: fetch + compose + layout
├── providers/           # client boundary: useForm / context
├── schemas/             # Zod: form schema + API schema (see §12)
├── actions/             # "use server" mutations for this domain
├── types/               # domain types and DTOs
├── constants/           # enums, filter definitions, column definitions
├── utils/               # pure domain helpers (mappers, formatters)
└── hooks/               # domain-specific hooks (only if used 2+ times)
```

Rules:

- **Never add a wrapper folder** (`modules/products/module/...`). If you feel the urge to nest a module inside itself, stop — that structure carries no information and every future reader pays for it.
- Create `hooks/`, `constants/`, or `utils/` **only when they have content**. Do not scaffold empty folders with `.gitkeep`.
- A module may import from `lib/`, `components/`, `config/`, `routes/`, and `@repo/ui`.
- **A module must not import from another module's internals.** If `checkout` needs something from `cart`, that thing is exported from `modules/cart/index.ts` (a deliberate, small public surface) or it belongs in `lib/`.

---

## 6. The request lifecycle

Every feature in this codebase follows the same path. Learn it once, apply it everywhere.

```
Browser
  │
  ▼
proxy.ts ─────────── interceptor pipeline: [auth] → [i18n]              §9
  │
  ▼
page.tsx ─────────── Server Component. Awaits params/searchParams,
  │                  enforces permission, renders a container. ~10 lines. §7
  ▼
container.tsx ────── Server Component. Fetches initial data (tagged
  │                  cache), handles server-side errors, composes layout. §11
  ▼
provider.tsx ─────── "use client". Owns useForm() / context. The client
  │                  boundary starts here.                                §12
  ▼
components ───────── Presentational. Read from useFormContext() or props.
  │
  ▼  (submit / user mutation)
actions ──────────── "use server". Re-validates, re-authorizes, calls
  │                  fetcher, invalidates cache tags.                     §11
  ▼
fetcher ──────────── Injects auth + locale, retries, returns Result<T>.   §11
  │
  ▼
Backend API
```

### Layer responsibilities

| Layer | Must do | Must never do |
|---|---|---|
| `page.tsx` | Await `params`/`searchParams`, enforce permission, render one container, export `generateMetadata` | Contain JSX beyond the container, fetch data, hold logic |
| `container` | Fetch initial data, handle `Result.error`, compose layout and Suspense boundaries | Use hooks, hold form state |
| `provider` | Own `useForm()`, orchestrate submit, call actions, toast, redirect | Fetch lists directly, render heavy markup |
| `components` | Render, read context/props, local UI state | Call Server Actions directly for domain mutations (the provider owns that), build URLs by hand |
| `actions` | Validate, authorize, call `fetcher`, `revalidateTag` | Return non-serializable values, throw raw errors at the client |

---

## 7. Routing conventions

### Locale segment

Every route lives under `app/[locale]/`. There is exactly one `<html>`/`<body>`, in `app/[locale]/layout.tsx`.

Because of that, you **must** also provide `app/global-error.tsx` and `app/global-not-found.tsx` — they render their own `<html>` for failures that happen before a locale can be resolved.

### Route groups

Use `(parentheses)` folders to group without affecting the URL:

```
app/[locale]/
├── (storefront)/          # public: layout with header/footer, no auth
│   ├── page.tsx                       →  /en
│   ├── c/[slug]/page.tsx              →  /en/c/shoes
│   ├── p/[slug]/page.tsx              →  /en/p/running-shoe-x
│   ├── search/page.tsx                →  /en/search
│   ├── cart/page.tsx                  →  /en/cart
│   └── checkout/…
├── (account)/             # customer: auth required
│   └── account/{orders,addresses,profile}/…
├── (admin)/               # staff: auth + permission required
│   └── admin/{products,orders,customers,discounts,inventory}/…
└── auth/                  # login/logout/reset — no auth guard, or you loop
```

**Spell route group names correctly.** They never appear in a URL, so a typo is invisible in production and permanent in the codebase.

### The admin CRUD skeleton

Every admin resource uses exactly these four routes:

```
admin/products/page.tsx              list
admin/products/create/page.tsx       create
admin/products/[id]/page.tsx         detail
admin/products/[id]/edit/page.tsx    edit
```

Add `loading.tsx` next to any page whose container fetches data — it becomes the automatic Suspense fallback and is the cheapest perceived-performance win available.

### Page template — copy this

```tsx
// app/[locale]/(admin)/admin/products/page.tsx
import { requirePermission } from "@/lib/auth/require-permission"
import { ProductListContainer } from "@/modules/products/containers/product-list-container"
import { buildMetadata } from "@/i18n/build-metadata"

export const generateMetadata = buildMetadata({ title: "products.list.title" })

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ProductListPage({ searchParams }: Props) {
  await requirePermission("read", "Product")
  return <ProductListContainer searchParams={await searchParams} />
}
```

`params` and `searchParams` are **Promises** — always `await` them.

### Error boundaries

Provide all four levels, and actually wire them up:

| File | Catches |
|---|---|
| `app/global-error.tsx` | Failures above the locale (including in the root layout). Reports to Sentry. |
| `app/global-not-found.tsx` | URLs that do not match `[locale]/…` at all. |
| `(group)/error.tsx` | Render errors inside a section. Reports to Sentry, offers `reset()`. |
| `(group)/not-found.tsx` | `notFound()` — a resource that does not exist. |
| `(group)/forbidden.tsx` | `forbidden()` — authenticated but not allowed. |

> If you add `forbidden.tsx`, you must call `forbidden()` from your authorization guard. A 403 boundary that is never triggered is dead code that misleads the next reader — either wire it or delete it. Same for `unauthorized.tsx`.

---

## 8. Internationalization

Even a single-locale launch goes through this layer: it is where currency, date, and number formatting live, and retrofitting it later means touching every string in the app.

### Configuration

```ts
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "always",   // every URL carries its locale — no ambiguous canonical URLs
  localeCookie: {
    name: "LOCALE",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
})
```

**`defaultLocale` is defined once, here.** Any other layer that needs a fallback locale imports `routing.defaultLocale`. Never hardcode a locale string anywhere else — divergent fallbacks between the interceptor and the router produce redirects into the wrong language that are painful to reproduce.

### Locale-aware navigation

```ts
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

**Import `Link`, `useRouter`, `redirect`, and `usePathname` from `@/i18n/navigation`, never from `next/link` or `next/navigation`.** These wrappers prepend the active locale automatically. Add a lint rule to enforce it.

### Static params

```ts
// app/[locale]/layout.tsx
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
```

It must be **exported from the route file itself**. Importing a helper and calling it without exporting does nothing — the framework discovers this function by export name only.

### Message organization

- One JSON per locale: `messages/en.json`, `messages/es.json`.
- **One top-level namespace per domain**, matching the module name exactly: `products`, `cart`, `checkout`, `orders`, `customers`, `discounts`. Plus cross-cutting namespaces: `common`, `navigation`, `errors`, `validation`, `seo`.
- **Namespace keys use one casing convention** (pick `camelCase`, enforce it). Mixed casing across namespaces makes keys unguessable.
- **Never create two namespaces whose names are near-collisions** (`orderHistory` vs `historyOrders`). If you need both, rename one to describe what it actually is.
- Locale files must have **identical key sets**. Add a CI check that diffs the key trees and fails on drift.

### Formatting money and dates

Never hand-roll. Use the locale-aware formatters:

```tsx
const format = useFormatter()
format.number(amountMinor / 100, { style: "currency", currency })   // client
```

See [§16.1](#161-money) for the money type itself.

---

## 9. The root request interceptor

The framework allows exactly **one** root interceptor file (`proxy.ts` in current Next.js versions; `middleware.ts` in older ones — check which your pinned version expects). Since you need several independent concerns there, compose them explicitly.

```ts
// src/config/middleware/pipeline.ts
import { NextRequest, NextResponse } from "next/server"

export type InterceptorFn = (req: NextRequest) => Promise<NextResponse | void> | NextResponse | void
type Entry = { name: string; fn: InterceptorFn; matcher?: RegExp }

export class InterceptorPipeline {
  private readonly entries: Entry[] = []

  use(name: string, fn: InterceptorFn, matcher?: string): this {
    this.entries.push({ name, fn, matcher: matcher ? new RegExp(matcher) : undefined })
    return this
  }

  async execute(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl
    let response = NextResponse.next()

    for (const entry of this.entries) {
      if (entry.matcher && !entry.matcher.test(pathname)) continue

      try {
        const result = await entry.fn(req)
        if (!result) continue
        if (result.status >= 300) return result          // short-circuit: redirect/deny wins
        // carry forward headers and cookies set by this interceptor
        result.headers.forEach((value, key) => response.headers.set(key, value))
        result.cookies.getAll().forEach((c) => response.cookies.set(c))
        response = result
      } catch (error) {
        // Fail CLOSED for anything that gates access.
        if (entry.name === "auth") throw error
        console.error(`[interceptor:${entry.name}]`, error)
      }
    }

    return response
  }
}
```

```ts
// src/proxy.ts
import { InterceptorPipeline } from "./config/middleware/pipeline"
import { authInterceptor } from "./config/middleware/auth"
import { intlInterceptor } from "./config/middleware/intl"

const PUBLIC_PATHS = "api|_next|_vercel|.*\\..*"

const pipeline = new InterceptorPipeline()
  .use("auth", authInterceptor(), `/((?!${PUBLIC_PATHS})(?!.*/auth/).)*`)
  .use("intl", intlInterceptor(), `/((?!${PUBLIC_PATHS}).*)`)

export default async function proxy(request: NextRequest) {
  return pipeline.execute(request)
}

export const config = { matcher: `/((?!${PUBLIC_PATHS}).*)` }
```

Design notes, all of which are requirements:

- **Define the exclusion pattern once** (`PUBLIC_PATHS`) and reuse it. Three hand-copied regexes drift.
- **Merge headers and cookies forward.** A naive `response = result` silently drops a `Set-Cookie` written by an earlier interceptor — a bug that appears months later as "sessions randomly not persisting".
- **Auth failures must fail closed.** Swallowing an exception in an interceptor that gates access turns a crash into an open door. Non-gating interceptors may fail open.
- **Order matters.** Auth runs before i18n; auth excludes `/auth/*` so login itself is reachable.
- Keep this layer thin: it runs on every request, often on a constrained runtime. No database calls, no heavy parsing.

---

## 10. Authentication and authorization

### 10.1 Two audiences

| | Storefront customer | Staff / admin |
|---|---|---|
| Identity | Email+password, OAuth, or guest | Email+password, ideally SSO |
| Can browse anonymously | **Yes** — never force login to view products or build a cart | No |
| Authorization model | Owns-this-resource checks | Claim/permission based |

Model both with the same session infrastructure but different guards. **The storefront must work fully logged-out** up to the point of payment. Anything that forces a login to browse or add to cart is a conversion bug.

### 10.2 Session contents

The session carries what the UI needs to render without an extra round trip, and nothing more:

```ts
// src/config/auth/types.d.ts
declare module "next-auth" {
  interface Session {
    accessToken: { token: string; expiresAt: string }   // ISO 8601, always UTC
    refreshToken: { token: string; expiresAt: string }
    user: { id: string; email: string; name: string }
    permissions: Array<{ action: ClaimAction; resources: ClaimResource[] }>
    error?: "RefreshFailed"
  }
}
```

Rules:

- **Normalize all timestamps to UTC ISO strings at the boundary**, once, where the API response is parsed. Do not sprinkle timezone patches across callbacks.
- **Keep the token small.** It travels in a cookie on every request. Permissions yes; a full user profile no.
- **If you declare an error field on the session, you must set it.** A declared-but-never-assigned error field produces a branch that looks like it handles expiry and doesn't. Either write it in the refresh failure path *and* handle it in the guard, or remove it from the type.

### 10.3 Token refresh

Refresh proactively in the JWT callback, before the access token expires:

```ts
async jwt({ token, user }) {
  if (user) return { ...token, ...user }                        // initial sign-in

  const expiresAt = new Date(token.accessToken.expiresAt).getTime()
  if (Date.now() < expiresAt - REFRESH_SKEW_MS) return token    // still valid

  if (Date.now() >= new Date(token.refreshToken.expiresAt).getTime()) {
    return { ...token, error: "RefreshFailed" }                 // refresh token dead
  }

  const refreshed = await refreshSession(token.refreshToken.token)
  if (!refreshed.success) return { ...token, error: "RefreshFailed" }

  return { ...token, accessToken: refreshed.data.accessToken, refreshToken: refreshed.data.refreshToken }
}
```

Define the skew in **one** constant, derived from your real token TTL:

```ts
export const REFRESH_SKEW_MS = 2 * 60 * 1000   // refresh 2 min before expiry
```

Do not introduce a second, much larger "safety" offset used to decide when the client should consider itself logged out — if that offset exceeds the token lifetime, users get logged out while holding a perfectly valid token. One token lifetime, one skew, one source of truth.

### 10.4 Two-layer guard for protected sections

```tsx
// app/[locale]/(admin)/layout.tsx  — Server Component
export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <SessionExpiryWatcher>       {/* client: catches expiry while the user sits idle */}
      <ServerSessionGuard>       {/* server: validates against the API on every navigation */}
        <AdminShell>{children}</AdminShell>
      </ServerSessionGuard>
    </SessionExpiryWatcher>
  )
}
```

- **Server guard** — runs on every server render, calls the identity endpoint, `redirect()`s on failure. Catches revoked sessions and disabled accounts. Nothing reaches the browser.
- **Client guard** — a low-frequency interval (30–60s is plenty; 5s is wasteful) comparing session expiry, because a user staring at one page triggers no server renders at all.

### 10.5 Permissions — exactly one predicate

Define the check **once**, as a pure function, and build every consumer on top of it:

```ts
// src/lib/auth/permissions.ts   (pure, no React, no server APIs)
export function can(
  permissions: SessionPermissions,
  action: ClaimAction,
  resource: ClaimResource,
): boolean {
  return permissions.some((p) => p.action === action && p.resources.includes(resource))
}
```

```ts
// client
export function usePermissions() {
  const { data } = useSession()
  const permissions = useMemo(() => data?.permissions ?? [], [data?.permissions])
  return {
    can: (a: ClaimAction, r: ClaimResource) => can(permissions, a, r),
    canAccess: (r: ClaimResource) => permissions.some((p) => p.resources.includes(r)),
  }
}
```

```ts
// server — call at the top of every protected page AND every admin Server Action
export async function requirePermission(action: ClaimAction, resource: ClaimResource) {
  const session = await getSession()
  if (!session) redirect(clientRoutes.auth.login)
  if (!can(session.permissions, action, resource)) forbidden()
}
```

Three copies of the same `.some(...)` across client, server, and some component drift apart and become a security bug. **One predicate. Import it.**

UI consumers of the same predicate: sidebar/menu filtering, row-action visibility, and button disabling. Hiding a control in the UI is cosmetic — the server check in `requirePermission` is the actual control.

### 10.6 Customer resource ownership

Claim checks do not cover "is this *my* order". For customer-facing resources, always scope by the session's customer id **on the server**:

```ts
export async function getOrder(orderId: string) {
  const session = await requireCustomerSession()
  // customerId comes from the session, never from the client
  return fetcher<Order>(apiRoutes.orders.byId(orderId), { customerId: session.user.id })
}
```

Never accept a `customerId` parameter from the client for a read or write of customer-owned data.

---

## 11. Data access layer

### 11.1 `Result<T>` — a serializable discriminated union

```ts
// src/lib/types/result.ts
export type ApiError = {
  status: number
  code: string          // stable machine code from the backend, used as a translation key
  message: string       // developer-facing fallback
  details?: Record<string, unknown>
}

export type Result<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError }

export const ok = <T>(data: T): Result<T> => ({ success: true, data, error: null })
export const fail = (error: ApiError): Result<never> => ({ success: false, data: null, error })
```

**Use a plain object union, not a class.** Server Action return values and Server→Client props must be serializable; class instances lose their prototype crossing that boundary, forcing awkward `.toJSON()` calls at every call site.

Every data function returns `Result<T>`. No throwing across layer boundaries, no `try/catch` in components.

### 11.2 The fetcher

```ts
// src/config/api/fetcher.ts
import "server-only"

type FetcherOptions = RequestInit & {
  next?: { tags?: string[]; revalidate?: number | false }
  skipAuth?: boolean
}

export async function fetcher<T>(url: string, options: FetcherOptions = {}): Promise<Result<T>> {
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  headers.set("Accept-Language", await getLocale())

  if (!options.skipAuth) {
    const session = await getSession()
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken.token}`)
  }

  for (let attempt = 0; attempt <= RETRY.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers })

      if (response.ok) return ok((await response.json()) as T)

      // Never retry: the outcome will not change without new input.
      if (TERMINAL_STATUSES.has(response.status)) return fail(await toApiError(response))

      if (attempt < RETRY.maxAttempts && RETRYABLE_STATUSES.has(response.status)) {
        await sleep(RETRY.baseDelayMs * RETRY.multiplier ** attempt)
        continue
      }
      return fail(await toApiError(response))
    } catch (cause) {
      if (attempt >= RETRY.maxAttempts) return fail(toNetworkError(cause))
      await sleep(RETRY.baseDelayMs * RETRY.multiplier ** attempt)
    }
  }

  return fail({ status: 0, code: "UNKNOWN", message: "Unreachable" })
}
```

Requirements:

- `import "server-only"` — a build-time guarantee this module can never end up in a client bundle. Use it on every module that touches secrets or sessions.
- **Retry only idempotent, transient failures**: `408, 429, 502, 503, 504` and network errors. Retrying `POST` blindly double-charges customers — either restrict retries to `GET`/`HEAD` or require an idempotency key ([§16.5](#165-payments-and-webhooks)).
- **`TERMINAL_STATUSES` and `RETRYABLE_STATUSES` must be disjoint.** Listing a status in both means the config lies about behavior.
- Exponential backoff, with a cap. Add jitter if you have many concurrent clients.
- Attach the locale so the backend can localize its own error messages.

### 11.3 Route and tag catalogs

```ts
// src/routes/api-routes.ts
const base = process.env.API_URL

export const apiRoutes = {
  products: {
    list: `${base}/products`,
    create: `${base}/products`,
    byId: (id: string) => `${base}/products/${id}`,
    bySlug: (slug: string) => `${base}/products/slug/${slug}`,
  },
  cart: {
    get: (cartId: string) => `${base}/carts/${cartId}`,
    addItem: (cartId: string) => `${base}/carts/${cartId}/items`,
  },
} as const
```

**Use functions for parameterized routes**, not `:id` string templates plus a runtime replacer. Functions are type-safe, refactorable, and cannot silently leave an unreplaced placeholder in a URL. (If you inherit a string-template builder, never let it lowercase the whole URL — identifiers can be case-sensitive.)

```ts
// src/routes/cache-tags.ts
export const CacheTags = {
  products: {
    list: "products:list",
    byId: (id: string) => `products:${id}`,
    bySlug: (slug: string) => `products:slug:${slug}`,
  },
  categories: { list: "categories:list", byId: (id: string) => `categories:${id}` },
  inventory: { byProduct: (id: string) => `inventory:${id}` },
} as const
```

Per-entity tags let a single product update revalidate that product's page without dumping the whole catalog cache.

```ts
// src/routes/client-routes.ts
export const clientRoutes = {
  storefront: {
    home: "/",
    category: (slug: string) => `/c/${slug}`,
    product: (slug: string) => `/p/${slug}`,
    cart: "/cart",
    checkout: "/checkout",
  },
  admin: {
    products: {
      list: "/admin/products",
      create: "/admin/products/create",
      detail: (id: string) => `/admin/products/${id}`,
      edit: (id: string) => `/admin/products/${id}/edit`,
    },
  },
} as const
```

No hardcoded URL strings anywhere else in the codebase.

### 11.4 Queries — Server Components

```ts
// modules/products/queries/get-products.ts
import "server-only"

export async function getProducts(searchParams: SearchParams): Promise<Result<Paginated<Product>>> {
  const url = buildUrl(apiRoutes.products.list, searchParams)
  return fetcher<Paginated<Product>>(url, {
    next: { tags: [CacheTags.products.list], revalidate: 300 },
  })
}
```

Consumed directly in a container:

```tsx
export async function ProductListContainer({ searchParams }: Props) {
  const result = await getProducts(searchParams)
  if (!result.success) return <ErrorState error={result.error} />

  return (
    <>
      <PageHeader title={t("products.list.title")} />
      <ProductFilters />
      <ProductTable data={result.data} searchParams={searchParams} />
    </>
  )
}
```

### 11.5 Mutations — Server Actions

```ts
// modules/products/actions/create-product.ts
"use server"

export async function createProduct(input: unknown): Promise<Result<Product>> {
  await requirePermission("create", "Product")                    // 1. authorize

  const parsed = productApiSchema.safeParse(input)                // 2. re-validate
  if (!parsed.success) {
    return fail({ status: 422, code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() })
  }

  const result = await fetcher<Product>(apiRoutes.products.create, {   // 3. execute
    method: "POST",
    body: JSON.stringify(parsed.data),
  })

  if (result.success) {                                           // 4. invalidate
    revalidateTag(CacheTags.products.list)
  }

  return result                                                   // 5. return, never throw
}
```

**Those five steps, in that order, in every mutation.** A Server Action is a public endpoint: anyone can POST to it with any payload. Steps 1 and 2 are the only things standing between an attacker and your database.

### 11.6 Route handlers — the allowlist

`app/api/` is **not** where CRUD lives. Only these belong there:

| Handler | Why it cannot be a Server Action |
|---|---|
| `api/auth/[...]` | The auth library owns these endpoints. |
| `api/webhooks/[provider]` | External systems POST to a URL; they cannot invoke a Server Action. |
| `api/health` | Infrastructure probes need a plain HTTP endpoint. |
| `api/revalidate` | On-demand cache invalidation triggered by an external CMS/PIM. Must verify a shared secret. |
| `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` | Framework file conventions. |

Everything else — every product, order, cart, and customer mutation — is a Server Action.

### 11.7 Error message translation

Backend errors carry a stable machine `code`. Translate it, with the raw message as a last-resort fallback:

```ts
export function translateApiError(t: TranslateFn, error: ApiError): string {
  return t.has(`errors.api.${error.code}`) ? t(`errors.api.${error.code}`) : error.message
}
```

Provide exactly two thin adapters over that one function — one for Server Components (`getTranslations`) and one for Client Components (`useTranslations` + toast). Do not reimplement the mapping at call sites.

---

## 12. Forms

### 12.1 Two schemas per entity

This separation is deliberate and mandatory.

```ts
// modules/products/schemas/product-form-schema.ts
// Shape #1: what the FORM holds. Optimized for UI controls, with translated messages.
export const productFormSchema = (t: TranslateFn) =>
  z.object({
    name: z.string().min(1, t("validation.required")).max(120, t("validation.maxLength", { max: 120 })),
    priceMinor: z.number().int().nonnegative(t("validation.nonNegative")),
    category: selectOptionSchema,                       // { value, label } — what a combobox produces
    tags: z.array(selectOptionSchema),
    isActive: z.boolean(),
  })

export type ProductFormValues = z.infer<ReturnType<typeof productFormSchema>>
```

```ts
// modules/products/schemas/product-api-schema.ts
// Shape #2: what the API accepts. Flat ids, no UI artifacts.
export const productApiSchema = productFormSchema(identityT)
  .transform((v) => ({
    name: v.name.trim(),
    priceMinor: v.priceMinor,
    categoryId: v.category.value,
    tagIds: v.tags.map((t) => t.value),
    isActive: v.isActive,
  }))
```

Plus a mapper for the reverse direction, used to populate `defaultValues` when editing:

```ts
// modules/products/utils/to-form-values.ts
export const toProductFormValues = (p: Product): ProductFormValues => ({ … })
```

Why: the shape a combobox needs (`{value,label}`) is not the shape an API wants (`categoryId`). Merging them produces either ugly forms or transformation logic scattered through components.

### 12.2 Schemas are factories

`(t) => z.object(...)`, never a bare exported object — validation messages must be translatable. For schemas used inside Server Actions where no translator exists, pass an identity function and let the client's copy produce user-facing text.

### 12.3 The form provider

```tsx
"use client"

export function ProductFormProvider({ mode, product, children }: Props) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProductFormValues>({
    defaultValues: product ? toProductFormValues(product) : productFormDefaults,
    resolver: zodResolver(productFormSchema(t)),
    mode: "onChange",
  })

  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      const payload = productApiSchema.parse(values)
      const result = mode === "edit"
        ? await updateProduct(product!.id, payload)
        : await createProduct(payload)

      if (!result.success) {
        toast.error(translateApiError(t, result.error))
        return
      }

      toast.success(t("products.saved"))
      router.replace(clientRoutes.admin.products.list)
    })
  }

  return <FormProvider methods={form} onSubmit={onSubmit} isPending={isPending}>{children}</FormProvider>
}
```

Rules:

- One `useForm()` per form. If creation and editing differ enough to need two schemas, they need **two providers and two routes** — not two `useForm()` calls in one component with a ternary picking between them.
- Wrap the action call in `useTransition` so you get a real pending state without a manual `isLoading` flag.
- Success path is always: toast → navigate. Failure path: toast → stay, preserving what the user typed.

### 12.4 Field components

Field components live in the design system and bind themselves to the form context by `name`:

```tsx
<RHFInput name="name" label={t("products.fields.name")} />
<RHFMoneyInput name="priceMinor" currency={currency} />
<RHFCombobox name="category" options={categories} />
<RHFSwitch name="isActive" />
```

Presentational components read `useFormContext()`. They never receive `register`/`control` as props — that is noise at every call site.

### 12.5 Multi-step flows (checkout)

For checkout specifically, use **one form state, several steps**, with per-step validation:

```tsx
const stepFields: Record<CheckoutStep, FieldPath<CheckoutValues>[]> = {
  contact: ["email"],
  shipping: ["shippingAddress", "shippingMethodId"],
  payment: ["paymentMethodId"],
}

const goNext = async () => {
  const valid = await form.trigger(stepFields[step])   // validate only this step
  if (valid) setStep(nextOf(step))
}
```

Do **not** build a wizard when the real requirement is "one form whose fields change shape based on a discriminator". For that case, render conditionally and express the conditional requirements with `.superRefine()`:

```ts
.superRefine((data, ctx) => {
  if (data.deliveryType === "shipping" && !data.shippingAddress) {
    ctx.addIssue({ path: ["shippingAddress"], code: "custom", message: t("validation.required") })
  }
  if (data.deliveryType === "pickup" && !data.pickupLocationId) {
    ctx.addIssue({ path: ["pickupLocationId"], code: "custom", message: t("validation.required") })
  }
})
```

---

## 13. State management decision tree

Work down this list. Stop at the first tier that fits. **Do not skip to a lower tier because it is familiar.**

```
Is it in a URL-worthy list view (filter, sort, page, search, selected tab)?
  → URL search params.                                            [Tier 1]

Is it form input being edited right now?
  → react-hook-form.                                              [Tier 2]

Is it server data that a Server Component can fetch?
  → Fetch it in the container. No client state at all.            [Tier 3]

Is it derived server data that sibling subtrees must share,
without coupling to the form lifecycle?
  → useReducer + Context, local to that module.                   [Tier 4]

Must it survive a full navigation away and back (in-progress draft)?
  → sessionStorage, keyed, cleared on successful submit.          [Tier 5]

Must it survive a browser restart (recently viewed, consent, theme)?
  → localStorage.                                                 [Tier 6]

Is it the cart?
  → Server-owned. See §16.2. Not client state.                    [special]
```

### Tier 1 — URL state is the default

```
/admin/products?page=2&perPage=25&sort=-createdAt&status=active&q=shoe
```

Benefits you get for free: shareable, bookmarkable, back-button correct, survives refresh, server-renderable, and testable by URL alone.

**Pick one parameter vocabulary and never deviate:**

| Concept | Parameter |
|---|---|
| Page number | `page` |
| Page size | `perPage` |
| Sort | `sort` (`-field` = descending) |
| Free-text search | `q` |
| Filters | one param per filter, named after the field |

Two different page-size parameter names in one app (`perPage` here, `rowsPerPage` there) is a real, user-visible inconsistency. Define these in one constants file and import them.

**Coordinate URL writes through one provider.** If several filter inputs each debounce and write independently, the second write races the first — each built its patch from a stale snapshot of the search params, so one silently reverts the other. Centralize: fields register their value in one context, one debounce writes them all at once, and any filter change resets `page` to 1.

### Tier 4 — reducer + context, done right

```tsx
// modules/checkout/state/checkout-context.tsx
"use client"

const CheckoutContext = createContext<{ state: CheckoutState; dispatch: Dispatch<CheckoutAction> } | null>(null)

export function CheckoutStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export function useCheckoutState() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error("useCheckoutState must be used within CheckoutStateProvider")
  return ctx
}
```

Always: `useMemo` the value, and **throw when the hook is used outside its provider** — returning a silent default turns a wiring mistake into a mystery bug.

If you find yourself writing this file for the third time, extract a small `createReducerStore<S, A>()` helper into `lib/` rather than copying it again.

### Tier 5 — drafts across navigation

The commerce case: a customer is filling in checkout and taps "add a new address", which navigates away. Persist the in-progress values keyed by flow, restore on return, and clear on success:

```ts
const draft = useSessionStorage<CheckoutValues>(StorageKeys.CheckoutDraft, defaults)
```

**Name the folder and the hook after the storage you actually use.** A directory called `local-storage/` that writes to `sessionStorage` will mislead every future reader — and one of them will "fix" the mismatch in the wrong direction.

Define every storage key in **one** enum in `lib/constants/storage-keys.ts`. Never duplicate a key string in a module.

### Never

- Duplicating server data into `useState` on mount just to render it.
- A global store holding data that a Server Component could fetch.
- `useEffect` for data fetching in a component that could be a Server Component.

---

## 14. Admin data tables

There is **one** table system, in `components/data-table/`. Do not build a second one.

### Column definitions

```ts
export type ColumnDef<T> = {
  header: string
  field?: keyof T                          // typed direct access
  cell?: (row: T) => React.ReactNode       // or a custom renderer
  sortable?: boolean
  sortKey?: string                         // the field name the API expects, if it differs
  width?: number
  flex?: number
  align?: "left" | "center" | "right"
}
```

```tsx
const columns: ColumnDef<Product>[] = [
  { header: t("fields.name"), field: "name", sortable: true, flex: 2 },
  { header: t("fields.sku"), field: "sku", width: 140 },
  { header: t("fields.price"), cell: (p) => <Money value={p.price} />, align: "right", sortable: true, sortKey: "priceMinor" },
  { header: t("fields.stock"), cell: (p) => <StockBadge quantity={p.stock} /> },
  { header: "", cell: (p) => <RowActions product={p} />, width: 56 },
]
```

### Requirements

- **Pagination, sorting, and filtering are URL-driven** (Tier 1). The table component reads and writes search params; it holds no list state.
- **Server-side pagination.** Never fetch 1000 rows and paginate in the browser.
- **Row actions are permission-gated** — each action renders only if `can(action, resource)`.
- **One pagination component.** Not one per section.
- Provide explicit empty, loading (skeleton), and error states. A table that renders nothing when a request fails is a bug report waiting to happen.

---

## 15. The design system package

### What goes where

| Belongs in `packages/ui` | Belongs in `apps/web` |
|---|---|
| Primitives (button, input, dialog, table, sheet, badge…) | Layout composition (header, sidebar, footer) |
| RHF-bound fields (`RHFInput`, `RHFCombobox`, `RHFMoneyInput`…) | Domain components (`ProductCard`, `CartLineItem`, `OrderTimeline`) |
| Design tokens and global CSS | Page-level compositions |
| Curated re-exports of third-party libs | Anything that imports from `@/modules/**` |
| Generic hooks (`useIsMobile`, `useDebounce`) | Anything that knows a business rule |

**Rule of thumb:** if it mentions a product, an order, a cart, or a price *rule*, it is not a design system component.

### Curated third-party re-exports

The UI package is the single place third-party UI dependencies are declared, and it re-exports the slice the apps may use:

```ts
// packages/ui/src/lib/dates.ts
export { format, addDays, differenceInDays, type DateRange } from "date-fns"
```

Apps import `@repo/ui/lib/dates`, never `date-fns` directly. This gives you one upgrade point, one place to enforce consistent options, and prevents four apps from pinning three different versions.

### shadcn/ui configuration

```jsonc
// apps/web/components.json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "../../packages/ui/src/styles/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components"
  }
}
```

The `ui` alias points at the shared package, so `shadcn add <component>` writes into `packages/ui`, not into the app. **Never copy a primitive into an app to tweak it** — extend it in the package with a variant, or the two copies will drift.

### Shared components that need strings

A shared component needing translated micro-copy (combobox "no results", date picker "pick a date") takes strings via props, or reads a **reserved namespace** the app is contractually required to provide (e.g. `ui`). Never hardcode a domain-specific translation namespace inside a "generic" component — that instantly makes it non-generic and traps the next reader who tries to reuse it.

---

## 16. Commerce-specific rules

### 16.1 Money

```ts
// lib/types/money.ts
export type Money = {
  amountMinor: number      // integer: cents, pence, etc. NEVER a float
  currency: string         // ISO 4217, e.g. "USD"
}
```

Rules:

1. **Integer minor units everywhere.** `19.99` as a float is a rounding bug waiting for a large enough order.
2. **Never do arithmetic on formatted strings.** Format only at the render boundary.
3. **The server computes every total.** Subtotal, discounts, shipping, tax, grand total. The client displays what the server returned. A client-computed total *will* eventually disagree with the charge, and the customer will screenshot it.
4. **Round once, at the end,** using the rule your tax jurisdiction requires — not at each line.
5. Store the currency next to the amount. A bare number is meaningless in a multi-currency catalog.
6. Format with the locale-aware formatter, never string concatenation:

```tsx
export function Money({ value }: { value: Money }) {
  const format = useFormatter()
  return <span>{format.number(value.amountMinor / 100, { style: "currency", currency: value.currency })}</span>
}
```

### 16.2 The cart

**The cart is server-owned.** It is identified by an opaque id in an `httpOnly` cookie. The client never holds authoritative cart state.

```ts
// modules/cart/actions/cart-session.ts
import "server-only"

const CART_COOKIE = "cart_id"

export async function getOrCreateCartId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(CART_COOKIE)?.value
  if (existing) return existing

  const created = await fetcher<{ id: string }>(apiRoutes.cart.create, { method: "POST" })
  if (!created.success) throw new Error("Cannot create cart")

  jar.set(CART_COOKIE, created.data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return created.data.id
}
```

```ts
// modules/cart/actions/add-to-cart.ts
"use server"

const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
})
// NOTE: no price field. The client does not get to propose a price.

export async function addToCart(input: unknown): Promise<Result<Cart>> {
  const parsed = addToCartSchema.safeParse(input)
  if (!parsed.success) return fail({ status: 422, code: "VALIDATION_ERROR", message: "Invalid input" })

  const cartId = await getOrCreateCartId()

  // The backend resolves current price and validates stock. Both are authoritative there.
  const result = await fetcher<Cart>(apiRoutes.cart.addItem(cartId), {
    method: "POST",
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  })

  if (result.success) revalidateTag(CacheTags.cart.byId(cartId))
  return result
}
```

Why server-owned:

- Prices and stock are validated at the source; a stale client cart cannot check out at yesterday's price.
- The cart survives refresh, device change (once identified), and works with JS disabled in progressive-enhancement paths.
- No cart data in `localStorage` to desynchronize or leak on a shared device.

**Optimistic UI** is how you keep it feeling instant despite the round trip:

```tsx
"use client"

export function AddToCartButton({ variantId }: Props) {
  const [optimisticCount, addOptimistic] = useOptimistic(count, (n, add: number) => n + add)
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      disabled={isPending}
      onClick={() => startTransition(async () => {
        addOptimistic(1)                                  // instant feedback
        const result = await addToCart({ variantId, quantity: 1 })
        if (!result.success) toast.error(translateApiError(t, result.error))   // React reverts automatically
      })}
    >
      {t("cart.add")}
    </Button>
  )
}
```

**Cart merge on login** — implement it explicitly, or you will lose carts at the worst possible moment. On successful sign-in, if a guest cart cookie exists, merge it into the customer's persistent cart server-side (summing quantities, re-validating stock), then clear the guest cookie.

### 16.3 Product catalog

- Products are read through **ISR with tags**: `revalidate` on a timer *and* `revalidateTag` on admin edits and PIM webhooks.
- `generateStaticParams` prerenders your top-N products and categories; the rest render on first request and are then cached.
- **Stock is not part of the cached product page** unless your revalidation is fast enough. Render availability from a separate, uncached (or short-TTL) source, or accept and design for eventual consistency ("only 3 left" being briefly wrong is fine; "in stock" on a sold-out item is not).
- Category and search pages must handle: no results, too many results (cap and paginate), and invalid filter values in the URL (ignore them, do not crash).

### 16.4 Checkout

Checkout is the highest-stakes flow in the app. Non-negotiables:

1. **The server re-validates everything at submit**: item availability, current prices, discount eligibility, shipping method validity, address serviceability. Nothing carries over on trust from earlier steps.
2. **Guest checkout works.** Account creation is offered after the order, never required before it.
3. **Idempotency.** Every order-placement request carries a client-generated idempotency key; a retry with the same key returns the original order instead of creating a second one.
4. **Never store raw card data.** Use the payment provider's tokenized element/redirect. PCI scope is not something to acquire by accident.
5. **`noindex`** on all checkout routes, plus `force-dynamic`.
6. **Explicit failure states**: payment declined, stock disappeared mid-checkout, address rejected, session expired. Each needs its own message and its own recovery path.

### 16.5 Payments and webhooks

- **The webhook is the source of truth for order state**, not the browser redirect. A customer who closes the tab after paying must still get their order.
- Webhook handlers must: **verify the signature** before parsing, be **idempotent** (providers retry, and duplicates are normal), respond `2xx` fast, and enqueue slow work rather than doing it inline.

```ts
// app/api/webhooks/payments/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get("x-signature")
  const raw = await request.text()                       // raw body — needed to verify

  if (!verifySignature(raw, signature, process.env.PAYMENT_WEBHOOK_SECRET!)) {
    return new Response("Invalid signature", { status: 401 })
  }

  const event = JSON.parse(raw) as PaymentEvent
  if (await alreadyProcessed(event.id)) return new Response("OK", { status: 200 })

  await handlePaymentEvent(event)
  revalidateTag(CacheTags.orders.byId(event.orderId))
  return new Response("OK", { status: 200 })
}
```

- Never trust an amount or a status from a client-side redirect parameter. Read it from the verified webhook payload or by calling the provider's API.

### 16.6 Inventory

- Reserve stock at order placement, not at add-to-cart (unless your business explicitly wants cart holds — that is a product decision with a TTL attached).
- Handle the oversell race server-side, atomically. Two customers buying the last unit simultaneously must produce one success and one clear, recoverable failure.
- Surface low stock in the UI honestly; never show a stale "in stock" on a checkout page.

---

## 17. SEO and metadata

The storefront lives or dies on this. The admin needs none of it.

- **Every public route exports `generateMetadata`** with a real title, description, canonical, and OG/Twitter tags. A site where only the root layout sets a title is a site with one title.
- **Localized alternates.** Emit `alternates.languages` for every locale plus `x-default`.
- **Structured data (JSON-LD)** on product pages (`Product` + `Offer` with price, currency, availability), category pages (`BreadcrumbList`), and organization-level data on the home page. This drives rich results.

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const product = await getProductBySlug(slug)
  if (!product.success) return {}

  return {
    title: product.data.seoTitle ?? product.data.name,
    description: product.data.seoDescription,
    alternates: {
      canonical: absoluteUrl(locale, clientRoutes.storefront.product(slug)),
      languages: buildLanguageAlternates(clientRoutes.storefront.product(slug)),
    },
    openGraph: { images: [product.data.image.url], type: "website" },
  }
}
```

- **`sitemap.ts`** — generated from the catalog, paginated if large.
- **`robots.ts`** — disallow `/cart`, `/checkout`, `/account`, `/admin`, and any faceted-filter URL space you do not want crawled.
- **Images**: always the framework `<Image>` with explicit `width`/`height` (or `fill` + sized container) to avoid layout shift; `priority` on the product hero only; modern formats; meaningful `alt` (product name, never "image").

---

## 18. Observability

Initialize the error monitor once per runtime — server, edge, and browser are three separate environments:

```
sentry.server.config.ts
sentry.edge.config.ts
src/instrumentation-client.ts
src/instrumentation.ts        # register() dispatches on process.env.NEXT_RUNTIME
```

Rules:

- **Report from every error boundary**, not just the global one. An asymmetry here means a whole section's errors are silently invisible.
- **Environment variables that the browser must read need the public prefix** (`NEXT_PUBLIC_*`). A monitoring DSN declared without it silently disables client-side reporting — verify in a real build, not just by reading the config.
- Scrub PII before sending: no card data, no full addresses, no auth tokens. Configure `beforeSend`.
- Tag events with `release` and `environment` so a spike maps to a deploy.
- **Instrument commerce funnels explicitly**: add-to-cart failures, checkout step drop-off, payment errors. These are business metrics that happen to be errors.

---

## 19. Performance budgets

For a storefront, performance *is* revenue. Enforce these in CI on the public routes:

| Metric | Budget |
|---|---|
| LCP (product & category pages, mobile) | ≤ 2.5s |
| CLS | ≤ 0.1 |
| INP | ≤ 200ms |
| First-load JS, storefront route | ≤ 130KB gzipped |

Practices:

- Server Components by default is the single biggest lever — every `"use client"` you avoid is JS you never ship.
- `next/dynamic` for genuinely heavy, below-the-fold, or interaction-triggered client components (rich text editors, chart libraries, modals with big dependency trees).
- Never import a whole utility library for one function.
- Suspense boundaries with skeletons around slow sections so the shell streams immediately.
- Watch the bundle in CI and fail on regressions above the budget.

---

## 20. Testing

Test in proportion to risk. In commerce, risk concentrates in money and inventory.

| Layer | Tool | What to cover |
|---|---|---|
| Pure logic | Vitest | Money arithmetic, discount rules, tax, cart totals, mappers, Zod schemas. **Exhaustive — this is where bugs cost cash.** |
| Server Actions | Vitest + mocked fetcher | Auth rejection, validation rejection, cache invalidation called, `Result` shape on success and failure. |
| Components | Testing Library | Forms (validation messages, submit), tables (empty/error/loaded), permission-gated UI. |
| Critical flows | Playwright | Browse → add to cart → checkout → order confirmation. Guest **and** authenticated. Payment provider in test mode. |

Minimum bar for any PR touching money, cart, or checkout: unit tests for the calculation, and an E2E covering the happy path plus one failure path.

---

## 21. Build and deploy

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  output: "standalone",           // minimal server bundle for containers
}
```

Multi-stage Docker build, using the monorepo pruner so the image context stays small:

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build

FROM base AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
ENV HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

Requirements:

- **Commit the lockfile and install with `--frozen-lockfile`.** Without it, builds are not reproducible and a transitive update can break production with no code change.
- Run as a **non-root user**.
- **Blue-green or rolling deploys** with a health endpoint and an automated rollback trigger. For a store, a bad deploy is lost orders — the rollback path must be tested, not theoretical.
- Validate required environment variables **at startup** and fail fast with a clear message naming the missing variable. A store that boots without its payment key and discovers this at checkout is worse than one that refuses to boot.

---

## 22. Naming and code conventions

These are mechanical. Enforce them with lint rules where possible, review where not. Consistency here is what lets an agent (or a new engineer) guess a path correctly on the first try.

### Files and folders

| Thing | Convention | Example |
|---|---|---|
| Folders | `kebab-case` | `product-variants/` |
| Component files | `kebab-case.tsx` | `product-card.tsx` |
| Hook files | `kebab-case.ts`, always `use-` prefixed | `use-cart-summary.ts` |
| Server Action files | `kebab-case.ts`, verb-first | `create-product.ts` |
| Type files | `kebab-case.ts` | `order-types.ts` |
| React components | `PascalCase` | `ProductCard` |
| Hooks | `camelCase`, `use` prefix | `useCartSummary` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_CART_QUANTITY` |
| Zod schemas | `camelCase`, `Schema` suffix | `productFormSchema` |
| Types/interfaces | `PascalCase`, no `I` prefix | `Product`, not `IProduct` |

### The plural/singular contract

**Always plural**, in every module, with no exceptions:

```
components/  containers/  providers/  schemas/  actions/  types/  constants/  utils/  hooks/  queries/
```

Mixed `container/` and `containers/` across modules is the single most common source of "where is that file?" friction in a large codebase. There is no case where the singular form is correct.

### Exports

- **Named exports** everywhere. Default exports only where the framework requires them (`page.tsx`, `layout.tsx`, `error.tsx`, `route.ts`, `proxy.ts`, `sitemap.ts`).
- A named export can be found by grep and renamed safely by tooling; a default export gets a different local name in every importing file.

### Barrels

- A barrel (`index.ts`) is allowed **only** as a module's deliberate public API (`modules/cart/index.ts`).
- If you create one, it must export **everything** intended to be public. A barrel that covers half a folder forces callers to mix `@/lib/schemas` and `@/lib/schemas/address` imports for no reason.
- Never barrel a whole leaf folder just to shorten imports — it defeats tree-shaking and creates cycles.

### Comments

- Explain **why**, never what. `// increment counter` is noise.
- **Delete commented-out code.** Version control remembers it; the next reader will not know whether it is a work-in-progress or a landmine.
- `TODO` comments must include an owner and a ticket: `// TODO(#412, alex): handle partial refunds`.

---

## 23. Anti-patterns — never do these

Each of these is a real failure mode that costs far more to remove later than to avoid now.

| # | Anti-pattern | Why it hurts |
|---|---|---|
| 1 | `"use client"` at the top of a layout or page "so the children work" | Ships the entire subtree to the browser and disables server data access. Use the children-as-slot pattern instead. |
| 2 | A Server Action without input validation or an authorization check | It is a public endpoint. This is a direct path to unauthorized writes. |
| 3 | Trusting a client-supplied price, discount, or stock level | Trivially forgeable. Resolve them server-side, always. |
| 4 | Floats for money | Rounding errors that appear only at scale, in production, in reconciliation. |
| 5 | Filters or pagination in `useState` | Unshareable, lost on refresh, broken back button. |
| 6 | Two components solving the same problem (two paginators, two filter providers, two loading indicators) | Both drift; bugs get fixed in one. Pick one, delete the other. |
| 7 | Two different query-param names for the same concept | Produces inconsistent URLs across a single app. |
| 8 | Declaring a type field or config value you never assign (`session.error`, a status code listed as retryable but returned earlier) | Creates dead branches that look like working safety nets. |
| 9 | Copying a design system primitive into an app to tweak it | Two copies, one gets fixed. Extend it in the package instead. |
| 10 | A "generic" component hardcoded to a specific translation namespace | Not generic. The next reuse either breaks or copies it. |
| 11 | A folder named for storage/behavior it does not implement (`local-storage/` writing to `sessionStorage`) | Someone will eventually "fix" the mismatch in the wrong direction. |
| 12 | An extra nesting level with no facade (`modules/products/module/...`) | Carries no information; every reader pays the navigation cost forever. |
| 13 | Duplicating the same authorization predicate in three places | They drift. The drift is a security bug. |
| 14 | An error boundary or helper that nothing ever triggers (`forbidden.tsx` with no `forbidden()` call) | Misleads reviewers into thinking a case is handled. |
| 15 | A route-level helper defined but not exported under the framework's expected name | Silently does nothing (e.g. static params never generated). Verify the build output, not the source. |
| 16 | Dependencies in `package.json` that nothing imports | Install time, audit noise, and a false signal about how the app works. |
| 17 | Two config files for the same tool (`eslint.config.js` **and** `.mjs`) | Only one is active; edits to the other silently do nothing. |
| 18 | Swallowing errors in an access-control interceptor | Turns a crash into an open door. Gating code fails closed. |
| 19 | Session/permission lookups repeated per call without memoization | A page with several parallel queries decodes the same session repeatedly. Wrap in a request-scoped cache. |
| 20 | Caching a personalized route (cart, account, checkout) | Cross-customer data leakage. The most severe failure on this list. |

---

## 24. Recipe: scaffold a new module

Follow this exactly when adding a domain (e.g. `discounts`). It should take one pass, with no invention.

**1. Types** — `modules/discounts/types/discount.ts`: the domain entity and its DTOs.

**2. Routes and tags** — add to `routes/api-routes.ts`, `routes/client-routes.ts`, `routes/cache-tags.ts`.

**3. Schemas** — `modules/discounts/schemas/`:
   - `discount-form-schema.ts` — `(t) => z.object(...)` + inferred type + defaults.
   - `discount-api-schema.ts` — `.transform()` to the API shape.
   - `modules/discounts/utils/to-form-values.ts` — API → form mapper for editing.

**4. Queries** — `modules/discounts/queries/`: `import "server-only"`, tagged `fetcher` calls returning `Result<T>`.

**5. Actions** — `modules/discounts/actions/`: `"use server"`, the five mandatory steps ([§11.5](#115-mutations--server-actions)).

**6. Containers** — `modules/discounts/containers/`: `discount-list-container.tsx`, `discount-detail-container.tsx`, `discount-form-container.tsx` (shared by create and edit).

**7. Provider** — `modules/discounts/providers/discount-form-provider.tsx`: `useForm` + submit orchestration.

**8. Components** — `modules/discounts/components/{list,form,detail}/`. Column definitions go in `constants/`.

**9. Routes** — the four admin pages, each ~10 lines, each with `requirePermission` and `generateMetadata`, plus `loading.tsx`.

**10. Navigation** — add the entry to `routes/navigation-data.ts` with its required permission.

**11. Translations** — add the `discounts` namespace to **every** locale file, with identical key sets.

**12. Tests** — unit tests for the schemas and any calculation; a component test for the form.

Then verify against the [definition of done](#25-definition-of-done).

---

## 25. Definition of done

A change is not done until every applicable box is checked.

**Correctness**
- [ ] `pnpm typecheck` and `pnpm lint` pass with zero warnings.
- [ ] Tests pass; new logic (especially money/cart/checkout) has tests.
- [ ] Loading, empty, and error states are implemented — not just the happy path.

**Architecture**
- [ ] Client boundary is as deep as possible; no unnecessary `"use client"`.
- [ ] Every new Server Action validates input **and** checks authorization.
- [ ] Every mutation invalidates the right cache tags.
- [ ] List state is in the URL, using the standard parameter names.
- [ ] No new state library, no second implementation of an existing mechanism.
- [ ] Folder and file naming follow [§22](#22-naming-and-code-conventions) exactly.

**Commerce**
- [ ] All amounts are integer minor units with an explicit currency.
- [ ] No price, discount, or stock value is trusted from the client.
- [ ] Personalized routes are `force-dynamic` and not cached.
- [ ] Money-affecting operations are idempotent where retries are possible.

**Front of house**
- [ ] Public routes export real `generateMetadata` (title, description, canonical, alternates).
- [ ] Product pages emit valid structured data.
- [ ] Images have explicit dimensions and meaningful `alt` text.
- [ ] All user-facing strings come from message files — no hardcoded copy.
- [ ] Every new translation key exists in **all** locales.

**Operability**
- [ ] Errors are reported with enough context to debug, and scrubbed of PII.
- [ ] New environment variables are documented in `.env.example` and validated at startup.
- [ ] No dead code, no commented-out blocks, no unused dependencies introduced.

---

**When this document is silent**, follow the closest existing pattern in the codebase and note the gap in your PR description so the convention can be written down. **When this document is wrong**, change it in the same PR that proves it wrong — a convention doc nobody trusts is worse than none.
