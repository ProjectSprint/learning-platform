# Application Layer

Orchestration layer bridging domain (entities, spaces) with presentation (React components).

## Structure

```
application/
  state/
    types/       GameState, GameEvent, helper types
    actions/     Space, Entity, UI (Modal), Core action types
    reducers/    applicationReducer routing to space/entity/ui/core
    events.ts    Event queue helpers (appendEvents, getNextActionId)
  hooks/
    useEntity.ts    Entity selector hooks
    useSpace.ts     Space selector hooks
    useEvents.ts    useEngineEvents for event consumption
    useDrawerManager.ts   Drawer registration
    useDrawerEvents.ts    Drawer event listening
  compat/         Legacy compatibility hooks
```

## Key Points

- `GameState` uses `Record<string, T>` (not Map) for Immer compatibility
- All state changes go through `applicationReducer` -> sub-reducers
- Events emitted by reducers, consumed by engines via `useEngineEvents(id)`
- UI concerns (drawers, hints, arrows, terminal) are **not** in GameState

## Documentation

See [../doc/README.md](../doc/README.md) for the full documentation index.
