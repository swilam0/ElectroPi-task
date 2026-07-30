# Frontend Structure (Next.js App Router)

## Directory Tree

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout: providers, fonts, metadata
│   ├── page.tsx                   # Landing page (redirects to /login or /dashboard)
│   │
│   ├── (auth)/
│   │   ├── layout.tsx             # Auth layout: centered card, no sidebar
│   │   ├── login/
│   │   │   └── page.tsx           # Client Component — form with email/password
│   │   ├── register/
│   │   │   └── page.tsx           # Client Component — registration form
│   │   └── logout/
│   │   └── page.tsx           # Client Component — clears tokens, redirects
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Server Component — sidebar, header, auth check
│   │   ├── page.tsx               # Server Component — redirects to /projects
│   │   │
│   │   ├── admin/
│   │   │   └── users/
│   │   │       ├── page.tsx       # Client Component — list + search users (admin only)
│   │   │       └── [id]/
│   │   │           └── page.tsx   # Client Component — user detail, role change, delete
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx           # Client Component — edit name, email, password (self)
│   │   │
│   │   ├── projects/
│   │   │   ├── page.tsx           # Client Component — fetches via React Query (client-side auth)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx       # Client Component — fetches via React Query (client-side auth)
│   │   │   │   ├── tasks/
│   │   │   │   │   └── [taskId]/
│   │   │   │   │       └── page.tsx  # Client Component — task detail view
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx   # Client/Server mix — project settings
│   │   │   │   └── members/
│   │   │   │       └── page.tsx   # Client Component — member management (admin only)
│   │   │   └── new/
│   │   │       └── page.tsx       # Client Component — create project form
│   │
│   └── error.tsx                  # Global error boundary (Client Component)
│
├── components/
│   ├── ui/                        # Reusable UI primitives (Server-safe)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx              # Client Component — uses portal
│   │   ├── spinner.tsx
│   │   └── toast.tsx              # Client Component — notification display
│   │
│   ├── forms/                     # Form components (all Client Components)
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── project-form.tsx
│   │   ├── task-form.tsx
│   │   └── member-form.tsx
│   │
│   ├── boards/                    # Board/view components
│   │   ├── task-board.tsx         # Client Component — kanban-style board
│   │   ├── task-card.tsx          # Client Component — draggable task card
│   │   └── task-list.tsx          # Server Component — list view
│   │
│   └── layout/                    # Layout components
│       ├── sidebar.tsx            # Client Component — nav with active state
│       ├── header.tsx             # Client Component — reads auth state from memory/localStorage
│       └── auth-check.tsx         # Client Component — redirects if unauthenticated
│
├── lib/
│   ├── api.ts                     # API client — fetch wrapper, auth headers
│   ├── auth.ts                    # Auth helpers — token storage, decode JWT
│   └── utils.ts                   # Utility functions — date formatting, etc.
│
├── stores/
│   ├── ui-store.ts                # Zustand store — sidebar, modals, toasts
│   └── filter-store.ts            # Zustand store — active filters, sort, search
│
├── types/
│   ├── api.ts                     # API response types (JSend envelope)
│   ├── auth.ts                    # User, LoginResponse, RegisterResponse, RefreshResponse
│   ├── project.ts                 # Project, ProjectMember
│   └── task.ts                    # Task, TaskStatus, Priority, TaskFilters, CreateTaskInput, UpdateTaskInput
│
├── hooks/
│   ├── use-auth.ts                # React Query hooks — login, register, logout, me
│   ├── use-projects.ts            # React Query hooks — project CRUD
│   ├── use-tasks.ts               # React Query hooks — task CRUD, filters
│   └── use-users.ts               # React Query hooks — admin (list/detail/delete/role) + self-service (profile edit, password change)
│
├── providers/
│   └── query-provider.tsx         # Client Component — React Query provider
│
├── public/
│   └── favicon.ico
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env.local                     # NOT COMMITTED
```

> **Note:** Server-side data fetching requires cookie-based auth tokens. Since the current implementation uses localStorage + in-memory tokens, all pages that fetch authenticated data are Client Components using React Query. Server Components are used only for layout and static UI.

## Server Component vs Client Component Rules

### Default to Server Components

Every page and layout is a **Server Component** by default (no `'use client'` directive) unless it needs:

| Required For | Examples |
|--------------|----------|
| `useState`, `useReducer` | Form fields, modal open/close |
| `useEffect` | Side effects on mount |
| `useRouter`, `usePathname` | Navigation, active link styling |
| `useSearchParams` | Client-side search/filter state |
| Event handlers | `onClick`, `onSubmit`, `onChange` |
| Browser-only APIs | `localStorage`, `window`, `document` |
| Custom hooks with above | Any hook using React Query (needs provider) |

### Data Fetching Strategy

```
Server Components                Client Components
─────────────────                ─────────────────
                                      
┌─────────────────┐             ┌──────────────────────┐
│ Fetch data on    │             │ React Query (cached)  │
│ the server       │             │ - Refetch on mount    │
│ - No loading     │             │ - Optimistic updates  │
│ - No waterfall   │             │ - Background refetch  │
│ - Direct DB/API  │             │ - Mutations           │
└────────┬────────┘             └──────────┬───────────┘
         │                                 │
         └─────────────┬───────────────────┘
                       │
             ┌─────────▼────────┐
             │ Render page       │
             │ (SSR or static)  │
             └──────────────────┘
```

- **Data you have at request time:** Fetch in Server Components and pass as props
- **Data that changes frequently:** Use React Query in Client Components
- **Form submissions:** Use Server Actions (`'use server'`) or React Query mutations
- **Auth state:** Check JWT validity on the server (cookie/header), React Query for client-side freshness

### Colocation Pattern

Instead of separating by type (e.g., `components/forms/`), colocate feature-specific components with their routes when they aren't reused:

```
app/(dashboard)/projects/[id]/
├── page.tsx                     # Server Component — fetches project
├── task-board.tsx               # Client Component — interactive board
├── task-card.tsx                # Client Component — draggable card
├── add-task-button.tsx          # Client Component — opens modal
├── add-task-modal.tsx           # Client Component — task creation form
└── members-list.tsx             # Client Component — member management
```

When a component is reused across multiple routes, promote it to `components/`.

### Naming Conventions

| Artifact | Convention | Example |
|----------|------------|---------|
| Pages | `page.tsx` | `app/(dashboard)/projects/page.tsx` |
| Layouts | `layout.tsx` | `app/(auth)/layout.tsx` |
| Loading | `loading.tsx` | `app/(dashboard)/projects/loading.tsx` |
| Error | `error.tsx` | `app/error.tsx` |
| Not Found | `not-found.tsx` | `app/not-found.tsx` |
| React Components | PascalCase | `TaskBoard`, `LoginForm` |
| Hooks | camelCase with `use` prefix | `useTasks` |
| Stores | camelCase + `Store` suffix | `uiStore` |
| Types | PascalCase | `Project`, `TaskStatus` |
| Files | kebab-case | `task-card.tsx` |
