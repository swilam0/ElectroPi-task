# ADR-004: Frontend State Management

**Title:** Use React Query (TanStack Query) for server state + Zustand for client state
**Status:** Accepted
**Date:** 2026-07-29

## Context

The frontend needs to manage two distinct types of state:
1. **Server state** — data fetched from the API (projects, tasks, users)
2. **Client state** — UI state (modals open/closed, selected filters, form drafts)

Options considered: Redux Toolkit, React Context + useReducer, Zustand alone, React Query alone.

## Decision

Use **React Query (TanStack Query)** for server state and **Zustand** for client state.

### Separation of Concerns

```
┌─────────────────────────────────────────────────┐
│              React Query (TanStack)              │
│                                                   │
│  - API data fetching & caching                   │
│  - Automatic refetching & stale invalidation     │
│  - Optimistic updates                            │
│  - Loading / error / success states              │
│  - Pagination & infinite queries                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                   Zustand                         │
│                                                   │
│  - UI state (sidebar open, selected project)     │
│  - Form state (draft task creation)              │
│  - Filter/sort preferences                       │
│  - Toast/notification queue                      │
│  - Anything that doesn't come from the API       │
└─────────────────────────────────────────────────┘
```

### Why Not Redux Toolkit?
- Redux adds significant boilerplate (slices, reducers, actions, thunks)
- React Query already handles most of what Redux-thunk would do
- Zustand is lighter, simpler, and TypeScript-native

### Why Not React Query Alone?
- React Query is not designed for UI state (modals, form drafts)
- Mixing UI state into query cache is an anti-pattern

## Consequences

- **Positive:**
  - Clear separation of data sources (API vs UI)
  - React Query handles caching, deduplication, background refetching
  - Zustand stores are tiny, simple, and testable
  - Server Components can fetch data directly, React Query handles client-side data freshness

- **Negative:**
  - Two dependencies instead of one
  - Need to decide which store each piece of state belongs in (established by convention: "if it came from the API, it goes in React Query")

- **Trade-off:** For an app this size, React Context + useReducer would work, but React Query provides caching, deduplication, and stale management that would need to be rebuilt manually.
