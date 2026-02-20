# Game System — Types & Methods Reference

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Primitive Types](#2-primitive-types)
   - [Branded IDs](#branded-ids)
   - [Phase and Question Status](#phase-and-question-status)
   - [TransitionResult](#transitionresult)
   - [GameState](#gamestate)
3. [Entities](#3-entities)
4. [Spaces](#4-spaces)
5. [Events & Redux Actions](#5-events--redux-actions)
6. [Reading State](#6-reading-state)
7. [Mutating State — Transformers (internal)](#7-mutating-state--transformers-internal)
8. [Behaviors & Reactions](#8-behaviors--reactions)
   - [Core Types](#core-types--typesbehaviorts)
   - [EventTrigger](#eventtrigger)
   - [GuardContext](#guardcontext)
   - [EffectContext](#effectcontext)
   - [EventProvenance](#eventprovenance)
   - [Contracts / Pattern Matching](#contracts--pattern-matching)
   - [Internal Wiring (BehaviorReactorDeps)](#internal-wiring-for-reference-only)
   - [Utility Behavior Types](#utility-behavior-types)
9. [Authoring a Question](#9-authoring-a-question)
10. [Public API — Inside a Behavior Handler](#10-public-api--inside-a-behavior-handler)
    - [world](#world--mutate-entities-and-spaces)
    - [interaction](#interaction--modals-and-terminal-visibility)
    - [flow](#flow--execution-flow-and-phase-transitions)
    - [progress](#progress--question-completion)
    - [terminal](#terminal--terminal-output)
    - [Engine Hooks](#engine-hooks)
    - [QuestionRuntime](#questionruntime--outside-behavior-handlers)
    - [Commands (legacy)](#commands--legacy-flat-alias)
    - [RuntimeApiResult](#runtimeapiresult)
11. [UI & Presentation Layer](#11-ui--presentation-layer)

---

## 1. Mental Model

The entire system is built on **three atoms**:

- **`Entity`** — a thing that exists in the world. A packet, a router, a process, a certificate. It has an ID, a type, visual properties, arbitrary `data` (domain payload), and arbitrary `state` (runtime flags).
- **`Space`** — a container that holds entities. A grid board, a pool of items, an SVG path, a queue, a gauge meter. Spaces define the geometry and rules for placement.
- **`GameEvent`** — something that happened, recorded in an append-only queue. "Entity X entered space Y." "Modal M was submitted." "Phase changed from A to B." Events are the audit trail and the trigger signal for the reactive layer.

From those three atoms:

**`GameState`** is the snapshot — it holds all current entities, all current spaces, the event queue, the active phase, and overlay state (open modals, terminal visibility).

**Behavior rules** are the reactive layer. They subscribe to `GameEvent` triggers and run `handler` functions in response, optionally gated by a `guard`. Inside a handler you call the **Public API** (`world`, `interaction`, `progress`, `flow`, `terminal`) to mutate the world.

**`QuestionDefinition`** is the authoring layer sitting above all of this. It is a static, declarative description of one question — which spaces exist, which entities start where, what the initial phase is, and what `phaseRules` / `inventoryRules` / `spaceRules` / `dragRules` / `layoutRules` automatically derive from state. You never write a `QuestionDefinition` at runtime; you write it once as a config object.

The data flow in one direction:

```
QuestionDefinition (authoring)
  ↓ bootstrap
GameState (snapshot)
  ↓ events fire
BehaviorRules react
  ↓ call Public API
GameState mutates → new GameEvent appended → cycle repeats
```

**Transformers vs. Public API:** The domain transformers (`tryAddEntityToSpace`, `tryMoveEntityAcrossSpaces`, etc.) are the *internal* mutation primitives — they operate on raw state slices and return `TransitionResult`. You never call them directly in question code. The **Public API** (`world.moveEntity`, etc.) wraps them, dispatches Redux actions, and emits the resulting `GameEvent`s. Always use the Public API in behavior handlers.

---

## 2. Primitive Types

### Branded IDs

Defined in `types/ids.ts`.

Plain strings are used everywhere in JS. Branded types make it a compile-time error to pass a `SpaceId` where an `EntityId` is expected.

| Type | Underlying | Purpose |
|------|-----------|---------|
| `EntityId` | `Branded<string, "EntityId">` | Nominally-typed entity identifier |
| `SpaceId` | `Branded<string, "SpaceId">` | Nominally-typed space identifier |
| `PhaseId` | `Branded<string, "PhaseId">` | Nominally-typed phase identifier |
| `Branded<TValue, TBrand>` | `TValue & { readonly __brand: TBrand }` | Generic nominal typing wrapper |

**Helpers** (defined in `internal/domain/adt/ids.ts`):

| Function | Signature |
|----------|-----------|
| `toEntityId` | `(value: string) => EntityId` |
| `toSpaceId` | `(value: string) => SpaceId` |
| `toPhaseId` | `(value: string) => PhaseId` |
| `fromEntityId` | `(value: EntityId) => string` |
| `fromSpaceId` | `(value: SpaceId) => string` |
| `fromPhaseId` | `(value: PhaseId) => string` |

---

### TransitionResult

Defined in `types/transformer.ts`. This is the universal return type of every domain transformer. If the operation applied, you get the new value. If a guard rejected it, you get a noop with the reason.

```
TransitionResult<T>
  = { status: "applied"; value: T }   — mutation succeeded
  | { status: "noop";    reason: string }  — guard rejected, state unchanged
```

**Constructors** (defined in `internal/domain/transformers/types.ts`):

| Function | Signature |
|----------|-----------|
| `transitionApplied` | `<T>(value: T) => TransitionApplied<T>` |
| `transitionNoop` | `(reason: string) => TransitionNoop` |

---

### Phase and Question Status

These are the concrete string values that `GameState.phase` and `GameState.question.status` hold. They are the values `PhaseRule` transitions between and that `progress.completeQuestion()` sets.

| Type | File | Values |
|------|------|--------|
| `GamePhase` | `types/board.ts` | `"setup" \| "configuring" \| "playing" \| "terminal" \| "completed"` — legacy built-in phases; custom questions can use any string |
| `QuestionStatus` | `types/state.ts` | `"in_progress" \| "completed"` |
| `EngineProgressStatus` | `types/engine.ts` | `"pending" \| "started" \| "finished"` — lifecycle state of a drag or terminal engine |

---

### GameState

Defined in `types/runtime.ts`. The full snapshot of everything.

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `string` | Current active phase (a `GamePhase` value or a custom string) |
| `spaces` | `Record<string, SpaceData>` | All registered spaces |
| `entities` | `Record<string, EntityData>` | All known entities |
| `overlay` | `OverlayState` | Open modals and UI overlay |
| `question` | `{ id, status: QuestionStatus }` | Active question identifier and completion state |
| `eventQueue` | `GameEventQueue` | Append-only event log |
| `eventCursors` | `Record<string, number>` | Per-engine read cursors into the event queue |

---

## 3. Entities

### The Config → Data Pattern

An entity starts as a **Config** (what you write) and is hydrated into **Data** (what is stored in state). These two are different phases of the same object.

**`EntityDataConfig`** is what you pass to construct:

```ts
type EntityDataConfig = {
  id: string;
  type: string;
  name?: string;
  visual?: EntityVisual;
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
  behaviorIds?: string[];
}
```

**`EntityData`** is what comes back and lives in `GameState.entities`:

```ts
type EntityData = {
  id: string;
  type: string;
  name?: string;
  visual: EntityVisual;       // defaults filled
  data: Record<string, unknown>;
  state: Record<string, unknown>;
  behaviorIds: string[];
}
```

**`ItemDataConfig` / `ItemData`** are a specialized form for draggable inventory items. They add `allowedPlaces` (which space IDs this entity may be dropped into), `icon`, `tooltip`, `draggable`, and `category`.

**Constructors** (defined in `internal/domain/adt/entity.ts`):

| Function | Signature | Description |
|----------|-----------|-------------|
| `createEntityData` | `(config: EntityDataConfig) => EntityData` | Hydrate config → data, fill all defaults |
| `createItemData` | `(config: ItemDataConfig) => ItemData` | Hydrate item config → item data |
| `cloneEntityData` | `(entity: EntityData, newId: string) => EntityData` | Deep-clone with a new ID |
| `cloneItemData` | `(item: ItemData, newId: string) => ItemData` | Deep-clone item with a new ID |

> In question code you don't call these directly — you use `world.createEntity(config)` from the Public API, which calls these internally.

**Type guard**:

| Function | Signature |
|----------|-----------|
| `isItemData` | `(entity: EntityData) => entity is ItemData` |

**Supporting types**:

| Type | Shape |
|------|-------|
| `EntityVisual` | `{ icon?, color?, size?: "sm" \| "md" \| "lg", className?, draggable?, style? }` |
| `ItemTooltip` | `{ content: string; seeMoreHref? }` |
| `EntityStatus` | `"success" \| "warning" \| "error" \| "info" \| undefined` |

**Inventory grouping** (how items appear in the sidebar):

| Type | Shape |
|------|-------|
| `Item` | `{ id, type, name?, allowedPlaces, icon?, tooltip?, data?, draggable?, category? }` |
| `InventoryGroup` | `{ id, title, visible, items: Item[] }` |
| `InventoryGroupConfig` | `{ id, title, visible?, items: Item[] }` |

---

## 4. Spaces

### The Config → Data Pattern

Like entities, each space kind has a **Config** (what you declare in `QuestionDefinition`) and **Data** (what is stored in `GameState.spaces`). Configs are inputs; Data is the hydrated runtime object.

**Common base**:

| Type | Shape |
|------|-------|
| `SpaceBaseConfig<TId>` | `{ id, name?, maxCapacity?, metadata? }` |
| `SpaceBase` | `{ id, name?, maxCapacity?, metadata }` (Data equivalent) |

---

### Grid Space — `kind: "grid"`

Cells arranged in rows × cols. Entities occupy individual cells by `{ row, col }` position.

| | Config | Data |
|-|--------|------|
| Extra fields | `rows, cols, metrics, allowMultiplePerCell?` | `rows, cols, metrics, allowMultiplePerCell, entityPositions: Record<string, EntityId>` |

`GridMetrics`: `{ cellWidth, cellHeight, gapX?, gapY? }`

**Constructor**: `createGridSpaceData(config: GridSpaceConfig) => GridSpaceData`

**Type guard**: `isGridSpace(space: SpaceData) => space is GridSpaceData`

---

### Pool Space — `kind: "pool"`

An unordered bag of entities. No positional semantics.

| | Config | Data |
|-|--------|------|
| Extra fields | `layout?, columns?, allowReorder?` | `layout, columns?, allowReorder, entityIds: string[]` |

**Constructor**: `createPoolSpaceData(config: PoolSpaceConfig) => PoolSpaceData`

**Type guard**: `isPoolSpace(space: SpaceData) => space is PoolSpaceData`

---

### Path Space — `kind: "path"`

Entities move along an SVG path. Duration and speed control animation.

| | Config | Data |
|-|--------|------|
| Extra fields | `path, viewBox?, duration?, speedMultiplier?, showDropzone?` | `path, viewBox, duration, speedMultiplier, showDropzone, entityIds: string[]` |

**Constructor**: `createPathSpaceData(config: PathSpaceConfig) => PathSpaceData`

**Type guard**: `isPathSpace(space: SpaceData) => space is PathSpaceData`

---

### Custom Space — `kind: "custom"`

A space with no built-in layout — render whatever you want via the `CustomSpace` component.

| | Config | Data |
|-|--------|------|
| Extra fields | _(none beyond base)_ | _(none beyond base)_ |

**Constructor**: `createCustomSpaceData(config: CustomSpaceConfig) => CustomSpaceData`

**Type guard**: `isCustomSpace(space: SpaceData) => space is CustomSpaceData`

---

### Queue Space — `kind: "queue"`

An ordered FIFO/LIFO list of entities.

| | Config | Data |
|-|--------|------|
| Extra fields | `maxDepth?, direction?` | `maxDepth?, direction, entityIds: string[]` |

**Constructor**: `createQueueSpaceData(config: QueueSpaceConfig) => QueueSpaceData`

**Type guard**: `isQueueSpace(space: SpaceData) => space is QueueSpaceData`

---

### Meter Space — `kind: "meter"`

A numeric gauge. Entities in this space map to a value within `[min, max]`.

| | Config | Data |
|-|--------|------|
| Extra fields | `min, max, unit?, thresholds?` | `min, max, value (initialized to min), unit, thresholds` |

**Constructor**: `createMeterSpaceData(config: MeterSpaceConfig) => MeterSpaceData`

**Type guard**: `isMeterSpace(space: SpaceData) => space is MeterSpaceData`

---

### SpaceData Union

```
SpaceData
  = GridSpaceData
  | PoolSpaceData
  | PathSpaceData
  | CustomSpaceData
  | QueueSpaceData
  | MeterSpaceData
```

Always narrow with type guards before accessing kind-specific fields:

```ts
// Do this:
if (isGridSpace(space)) { space.entityPositions; /* typed */ }

// Not this:
if (space.kind === "grid") { (space as GridSpaceData).entityPositions; }
```

---

### Space Positions

| Type | Shape | Used by |
|------|-------|---------|
| `GridPosition` | `{ row: number; col: number }` | Grid spaces |
| `ListPosition` | `{ index: number }` | Queue, pool spaces |
| `SpacePosition` | `GridPosition \| ListPosition` | Union |

**Position guards**:

| Function | Signature |
|----------|-----------|
| `isValidGridPosition` | `(position: unknown) => position is GridPosition` |
| `isValidListPosition` | `(position: unknown) => position is ListPosition` |

---

## 5. Events & Redux Actions

These two look similar but serve different purposes. They are not the same thing.

### GameEvent — what happened (domain record)

`GameEvent` is an **immutable record of a fact** appended to the `GameEventQueue`. It is how behavior rules learn that something occurred. The event queue is append-only; nothing is ever removed or changed.

Defined in `types/state.ts`:

| Event type | Key fields |
|-----------|-----------|
| `ENTITY_ENTERED_SPACE` | `entityId, spaceId, position?` |
| `ENTITY_LEFT_SPACE` | `entityId, spaceId, position?` |
| `ENTITY_MOVED` | `entityId, fromSpaceId, toSpaceId, fromPosition?, toPosition?` |
| `ENTITY_UPDATED` | `entityId, updates` |
| `MODAL_OPENED` | `modalId, modal` |
| `MODAL_SUBMITTED` | `modalId, modalActionId, values` |
| `MODAL_CLOSED` | `modalId, modal?, reason?` |
| `TERMINAL_INPUT` | `entryId, input` |
| `ENGINE_STARTED` | `engineId?` |
| `ENGINE_FINISHED` | `engineId?` |
| `PHASE_CHANGED` | `from, to` |
| `ENTITY_CLICKED` | `entityId, spaceId, position?` |
| `RUNTIME_WARNING` | `message` |

All events extend `GameEventBase`: `{ eventId: number; actionId: number; timestamp? }`.

```ts
type GameEventQueue = {
  events: GameEvent[];
  lastEventId: number;
  lastActionId: number;
}
```

**`ModalCloseReason`**: `"backdrop" \| "escape" \| "button" \| "programmatic" \| "unknown"`

---

### Redux Action — how state changes (dispatch message)

A Redux `Action` is the **message dispatched to the reducer** to actually mutate `GameState`. Every call to the Public API (`world.moveEntity(...)`) ultimately dispatches one or more Redux actions. You never dispatch actions directly in question code.

```
Action
  = SpaceAction   (SPACE_CREATED | SPACE_REMOVED | ENTITY_ADDED | ENTITY_REMOVED
                   | ENTITY_MOVED | ENTITY_POSITION_UPDATED | ENTITIES_SWAPPED)
  | EntityAction  (ENTITY_CREATED | ENTITY_UPDATED | ENTITY_STATE_UPDATED | ENTITIES_DELETED)
  | UIAction      (OPEN_MODAL | CLOSE_MODAL | MODAL_SUBMITTED)
  | CoreAction    (SET_QUESTION | SET_PHASE | COMPLETE_QUESTION | ACK_EVENTS | EMIT_EVENTS)
```

The relationship:

```
world.moveEntity()            ← you call this (Public API)
  → tryMoveEntityAcrossSpaces()  ← transformer runs (internal)
  → dispatch(ENTITY_MOVED action) ← reducer updates GameState
  → append(ENTITY_MOVED event)   ← event queue records the fact
  → behavior rules fire          ← reactive layer responds
```

---

## 6. Reading State

The domain read layer provides safe, typed queries over `GameReadState` (a read-only slice of `GameState`). Always use these instead of accessing `state.entities`/`state.spaces` directly.

`GameReadState`: `Readonly<{ spaces: Record<string, SpaceData>; entities: Record<string, EntityData> }>`

---

### Getters — `internal/domain/read/get.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getEntity` | `(state, entityId) => EntityData \| undefined` | Fetch entity by ID |
| `getSpace` | `(state, spaceId) => SpaceData \| undefined` | Fetch space by ID |
| `getSpaceEntityIds` | `(state, spaceId) => string[]` | All entity IDs in a space (normalizes across all space kinds) |
| `getEntitySpaceId` | `(state, entityId) => string \| null` | Which space currently contains this entity |
| `getGridEntityPosition` | `(state, entityId, spaceId?) => GridPosition \| undefined` | Grid cell of an entity |

---

### Guards — `internal/domain/read/guards.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `isEntityKnown` | `(state, entityId) => boolean` | Entity ID exists in state |
| `isSpaceKnown` | `(state, spaceId) => boolean` | Space ID exists in state |
| `isEntityInSpace` | `(state, entityId, spaceId) => boolean` | Entity is tracked in this specific space |
| `isEntityPlacementAllowed` | `(state, entityId, toSpaceId, toPosition?) => boolean` | Full validation: `allowedPlaces`, capacity, cell occupancy |

---

### Selectors — `internal/domain/read/select.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `selectEntitiesByType` | `(state, type) => EntityData[]` | All entities of a given type |
| `selectEntityStateValue` | `<T>(state, entityId, key) => T \| undefined` | Read one key from an entity's `state` bag |
| `selectSpaceEntityCount` | `(state, spaceId) => number` | How many entities are in a space |
| `selectSpaceIsFull` | `(state, spaceId) => boolean` | Space is at `maxCapacity` |
| `selectSpaceIsEmpty` | `(state, spaceId) => boolean` | Space has zero entities |
| `selectGridEmptyPositions` | `(state, spaceId) => GridPosition[]` | All unoccupied cells in a grid space |
| `selectDerivedPhase` | `<CK>(rules, context, currentPhase, fallback) => PhaseResolution` | Evaluate phase rules against current context |

---

### Invariant checks — `internal/domain/invariants.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `assertNever` | `(value: never, context: string) => never` | Exhaustiveness check — throws in unreachable branches |
| `findOwnershipViolations` | `(state) => OwnershipViolation[]` | Detect entities appearing in more than one space |
| `assertSingleSpaceOwnership` | `(state) => void` | Throw if any entity is in multiple spaces |

---

## 7. Mutating State — Transformers (internal)

Transformers are pure functions that take a state slice and return `TransitionResult`. They are the *internal* implementation of every mutation. You do not call them directly in question code — the Public API does.

They are documented here so you understand what the Public API is doing under the hood.

---

### Entity Transformers — `internal/domain/transformers/entity.ts`

| Function | What it does | Emits event? |
|----------|-------------|--------------|
| `tryCreateEntity(state, { entity })` | Add entity; noop if ID exists | No |
| `tryPatchEntity(state, patch)` | Merge partial updates | `ENTITY_UPDATED` |
| `tryPatchEntityState(state, { entityId, state })` | Merge state-only updates | No |
| `applyDeleteEntities(state, { entityIds })` | Remove entities, evict from all spaces | No |

---

### Space Transformers — `internal/domain/transformers/space.ts`

| Function | What it does | Emits event? |
|----------|-------------|--------------|
| `applyCreateSpace(state, space)` | Register a new space | No |
| `tryRemoveSpace(state, spaceId)` | Remove a space; noop if missing | No |
| `tryAddEntityToSpace(state, input)` | Place entity; enforce capacity + cell rules | `ENTITY_ENTERED_SPACE` |
| `tryRemoveEntityFromSpace(state, { entityId, spaceId })` | Remove entity from space | `ENTITY_LEFT_SPACE` |
| `tryMoveEntityAcrossSpaces(state, input)` | Atomic cross-space move; rollback on failure | `ENTITY_MOVED` |
| `tryUpdateGridEntityPosition(state, input)` | Update entity's cell within the same grid | No |
| `trySwapGridEntities(state, input)` | Swap two entities' positions | 2× `ENTITY_MOVED` |

---

### Game/Core Transformers — `internal/domain/transformers/game.ts`

| Function | What it does | Emits event? |
|----------|-------------|--------------|
| `trySetQuestion(state, { id, status? })` | Set active question; noop if unchanged | No |
| `trySetPhase(state, { phase })` | Transition phase; noop if same | `PHASE_CHANGED` |
| `applyCompleteQuestion(state)` | Mark question completed; noop if already done | No |
| `tryAckEvents(state, { engineId, cursor })` | Advance engine's event read cursor | No |
| `tryEmitEvents(events)` | Validate and stage events; noop on empty | No |

---

### Event Queue Transformers — `internal/domain/transformers/event-queue.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getNextActionId` | `(queue?) => number` | Returns `lastActionId + 1` |
| `applyAppendEvents` | `(queue, actionId, inputs) => EventQueue` | Append events with sequential IDs |

---

## 8. Behaviors & Reactions

Behaviors are where question logic lives. A `BehaviorDefinition` contains a list of `BehaviorRule`s. Each rule says: *when this event fires (and this guard passes), run this handler*.

### Core Types — `types/behavior.ts`

| Type | Shape |
|------|-------|
| `BehaviorRule<TContext, TTrigger>` | `{ id, on: TTrigger, guard?, handler }` |
| `BehaviorDefinition<TContext, TTrigger>` | `{ initialContext: TContext; rules: BehaviorRule[] }` |

---

### EventTrigger

The `on` field of a rule. Specifies which event(s) activate this rule and optionally filter by `spaceId` or `entityType`.

```
EventTrigger
  = { event: "ENTITY_PLACED_IN_SPACE";   space?, entityType? }
  | { event: "ENTITY_REMOVED_FROM_SPACE"; space?, entityType? }
  | { event: "ENTITY_MOVED";             fromSpace?, toSpace?, entityType? }
  | { event: "ENTITY_CLICKED";           space?, entityType? }
  | { event: "ENTITY_UPDATED";           entityType? }
  | { event: "MODAL_OPENED";             modalId? }
  | { event: "MODAL_SUBMITTED";          modalId?, actionId? }
  | { event: "MODAL_CLOSED";             modalId? }
  | { event: "TERMINAL_INPUT" }
  | { event: "ENGINE_STARTED";           engineId? }
  | { event: "ENGINE_FINISHED";          engineId? }
  | { event: "PHASE_CHANGED";            from?, to? }
  | { event: "ANY" }
```

---

### GuardContext

Passed to the `guard` function of a rule. Read-only — you can only inspect, not mutate.

```ts
type GuardContext<TContext> = {
  readonly event: GameEvent;
  provenance: EventProvenance;
  entity?: EntityData;       // the entity involved, if applicable
  state: GameState;
  phase: string;
  context: Readonly<TContext>; // behavior's custom context
}
```

---

### EffectContext

Passed to the `handler` function of a rule. Contains everything you need to react: read state, call the Public API, update behavior context, schedule future work.

```ts
type EffectContext<TContext> = {
  event: GameEvent;
  provenance: EventProvenance;
  entity?: EntityData;
  state: GameState;
  phase: string;
  context: TContext;
  updateContext: (patch: Partial<TContext>) => void;
  // Public API groups (see section 10):
  world: WorldApi;
  interaction: InteractionSessionApi;
  flow: ExecutionFlowApi;
  progress: ProgressApi;
  terminal: TerminalBridge;
  // Scheduling:
  delay: (ms: number) => Promise<void>;
  once: (key: string, fn: () => void) => void;
  schedule: (key: string, ms: number, fn: (ctx: ScheduledEffectContext<TContext>) => void) => void;
  cancelSchedule: (key: string) => void;
  // Convenience shortcuts:
  setPhase: (phase: string) => void;
  moveToInventory: (entityId: string) => void;
  moveToGrid: (entityId: string, spaceId: string, position: GridPosition) => void;
}
```

---

### EventProvenance

The full audit trail for a fired event — useful in guards and handlers to understand the full context of what triggered the rule.

```ts
type EventProvenance = {
  eventId, actionId, eventType,
  entityId?, spaceId?, fromSpaceId?, toSpaceId?,
  modalId?, modalActionId?,
  fromPhase?, toPhase?,
  terminalEntryId?,
  ruleId?
}
```

---

### Contracts / Pattern Matching

`ModalContract` and `TerminalContract` are typed helpers for extracting structured values from `MODAL_SUBMITTED` and `TERMINAL_INPUT` events inside behavior handlers. They pair a matcher (which modal ID / which command string) with a `parse` function that turns raw form values or raw input strings into a typed result.

Defined in `engine/runtime/public-methods.ts`.

| Type | Shape | Description |
|------|-------|-------------|
| `ModalContract<TId, TValues>` | `{ id, actionId, modalId?, modalIdStartsWith?, parse }` | Match a modal submission and parse its form values into `TValues` |
| `TerminalContract<TId, TCommand>` | `{ id, parse }` | Match a terminal input and parse it into a typed command `TCommand` |
| `ModalSubmissionParseResult<TValues>` | `{ ok: true; value: TValues } \| { ok: false; errors: string[] }` | Result of `ModalContract.parse()` |
| `TypedEntity<TData, TState>` | `Omit<EntityData, "data" \| "state"> & { data: TData; state: TState }` | Entity with narrowed, typed `data` and `state` fields |
| `EntityContractMap` | `Record<string, { data: Record<string, unknown>; state: Record<string, unknown> }>` | Maps entity type names to their expected `data`/`state` schemas |

---

### Internal Wiring (for reference only)

`BehaviorReactorDeps` is the internal dependency bag the behavior reactor is constructed from. You will never instantiate this directly — it is assembled by the runtime at bootstrap. It is documented here in case you need to understand how the reactor is wired or write tests against it.

```ts
type BehaviorReactorDeps = {
  state: GameState;
  events: GameEvent[];
  ack: (cursor: number) => void;
  world: WorldApi;
  interaction: InteractionSessionApi;
  flow: ExecutionFlowApi;
  progress: ProgressApi;
  terminal?: TerminalBridge;
  scheduler?: QuestionSchedulerApi;
}
```

---

### Utility Behavior Types

| Type | Shape | Purpose |
|------|-------|---------|
| `StatusBadge` | `{ status: "info" \| "warning" \| "success" \| "error"; message }` | Visual badge on an entity |
| `StatusRule` | `{ id, entityType?, match, badge }` | Maps entity state predicate → badge |
| `WorkflowDefinition` | `{ initialState, states, transitions? }` | State machine for entity lifecycle |
| `WorkflowInstance` | `{ currentState, enteredAt, history }` | Runtime state of a running workflow |
| `WorkflowState` | `{ name, autoTransitionMs?, autoTransitionTo? }` | One node in the state machine |
| `WorkflowTransition` | `{ from, to, guard? }` | An edge in the state machine |
| `LaneSchedulerInput<TLaneId>` | `{ lanes, enabledLanes?, policy, cursor?, isOccupied }` | Input to lane selection |
| `LaneSelectionPolicy` | `"first_free" \| "round_robin"` | How to pick among available lanes |
| `LaneSelectionResult<TLaneId>` | `{ laneId \| null; cursor }` | Output of lane selection |
| `PathCheckpoint` | `{ at?: number; pause: boolean; emitEvent? }` | A stop point on a path space |
| `EntityTemplate` | `Omit<ItemDataConfig, "id"> & { idPrefix? }` | Template for spawning entities |
| `SpawnPlan` | `{ config: ItemDataConfig; spaceId?; position? }` | Plan to create and place an entity |
| `LockMode` | `"exclusive" \| "shared"` | Resource lock contention mode |
| `ResourceLockState` | `{ resourceId, holders, mode, waitQueue }` | State of a named resource lock |
| `SplitDescriptor` | `{ parentId, children: Array<{ id, data? }> }` | Decompose a task into sub-tasks |
| `JoinPolicy` | `"all" \| "any" \| { count: number }` | When is a split considered complete |
| `JoinTracker` | `{ parentId, childIds, completedIds, policy }` | Tracks split child completion |
| `TimelineAction` | `{ key, delayMs, action, entityId?, updates?, toSpaceId? }` | A timed world mutation |
| `BehaviorInspector` | `{ log, getEntries, clear, subscribe }` | Debug observer for rule execution |
| `InspectorLogEntry` | `{ timestamp, eventType, ruleId, action, entityId?, spaceId?, detail? }` | One inspector log record |
| `InspectorAction` | `"matched" \| "guard-passed" \| "guard-failed" \| "handler-executed" \| "handler-error"` | What the inspector recorded |
| `QuestionSchedulerApi` | `{ schedule, cancel }` | API for timed callbacks |

---

## 9. Authoring a Question

The `QuestionDefinition` is a static config object. It describes the entire structure of one question. Nothing in here is imperative — it is all declarative. The runtime reads it at bootstrap.

Defined in `types/question.ts`.

```ts
type QuestionDefinition = {
  meta: QuestionMeta;             // id, title, description
  initialPhase: string;
  spaces: SpaceDefinition[];      // which spaces exist
  entities: EntityDefinition[];   // which entities start where
  phaseRules: PhaseRule[];        // auto-transition phase when conditions are met
  inventoryRules?: InventoryRule[]; // show/hide inventory groups
  spaceRules?: SpaceRule[];       // show/hide spaces
  behaviors?: BehaviorDefinition[]; // reactive rules
  dragRules?: DragGatingRule[];   // which entities can be dragged where
  layoutRules?: LayoutVisibilityRule[]; // dynamic section visibility
  shapeRules?: SpaceShapeRule[];  // dynamic space dimensions
}
```

---

### Space Definitions

A `SpaceDefinition` is a tagged union of space types used inside `QuestionDefinition.spaces`:

```
SpaceDefinition
  = { kind: "grid",   config: GridSpaceConfig }
  | { kind: "pool",   config: PoolSpaceConfig }
  | { kind: "path",   config: PathSpaceConfig }
  | { kind: "custom", config: CustomSpaceConfig }
  | { kind: "queue",  config: QueueSpaceConfig }
  | { kind: "meter",  config: MeterSpaceConfig }
```

---

### The Condition AST

Phase rules, inventory rules, and space rules are all driven by `Condition` — a recursive boolean expression tree.

```
Condition<CK>
  = { kind: "and"; all: Condition<CK>[] }
  | { kind: "or";  any: Condition<CK>[] }
  | { kind: "not"; value: Condition<CK> }
  | { kind: "flag"; key: CK; is: boolean }
  | { kind: "eq";  key: CK; value: ConditionValue }
  | { kind: "in";  key: CK; values: ConditionValue[] }
```

`ConditionContext<CK>` is a `Record<CK, ConditionValue | undefined>` — the runtime values the condition is evaluated against.

**AST Evaluators** (defined in `internal/domain/question/question-ast.ts`):

| Function | Signature | Description |
|----------|-----------|-------------|
| `evaluateCondition` | `<CK>(condition, context) => boolean` | Recursively evaluate one `Condition` node |
| `resolvePhase` | `<CK>(rules, context, currentPhase, fallback) => PhaseResolution` | Run all phase rules and return the winning phase |
| `resolveVisibility` | `<CK>(rules, context, key, current) => boolean` | Run inventory/space visibility rules for one key |

---

### Rule Types

| Type | Shape |
|------|-------|
| `PhaseRule<CK, TPhase>` | `{ kind: "set", when: Condition, to: TPhase } \| { kind: "retain", when: Condition }` |
| `PhaseResolution<TPhase>` | `{ nextPhase: TPhase; shouldRetain: boolean }` |
| `InventoryRule<CK, TGroupId>` | `{ kind: "show-group" \| "hide-group", when: Condition, groupId }` |
| `SpaceRule<CK, TSpaceId>` | `{ kind: "show" \| "hide", when: Condition, spaceId }` |
| `DragGatingContext` | `{ readonly entityId, entityType, spaceId, state }` |
| `DragGatingRule<TSpaceId, TEntityType>` | `{ spaceId, entityType?, canDrag: (ctx) => boolean }` |
| `LayoutVisibilityRule<TSpaceId>` | `{ targetId, visible: (ctx: LayoutRuleContext) => boolean }` |
| `SpaceShapeRule<TSpaceId>` | `{ spaceId, compute: (ctx) => SpaceShapeOverrides \| undefined }` |
| `SpaceShapeOverrides` | `{ rows?, cols?, maxCapacity?, speedMultiplier?, title? }` |

---

### Factory Helpers

The factories produce correctly-typed `SpaceDefinition`, `EntityDefinition`, `Condition`, and rule values. Use these instead of constructing the objects by hand.

**`SpaceFactory`** — builds `SpaceDefinition` entries:
- `SpaceFactory.grid(config)`, `.pool(config)`, `.path(config)`, `.custom(config)`, `.queue(config)`, `.meter(config)`

**`EntityFactory`** — builds `EntityDefinition` entries:
- `EntityFactory.config(entityConfig)` — entity without initial placement
- `EntityFactory.item(itemConfig)` — inventory item
- `EntityFactory.itemInSpace(itemConfig, spaceId, position?)` — item placed at start

**`ConditionFactory`** — builds `Condition` AST nodes:
- `ConditionFactory.eq(key, value)`, `.flag(key, is)`, `.not(condition)`, `.and(...conditions)`, `.or(...conditions)`

**`PhaseRuleFactory`** — builds `PhaseRule` entries:
- `PhaseRuleFactory.set(when, to)`, `.retain(when)`

---

## 10. Public API — Inside a Behavior Handler

Everything here is available on the `EffectContext` passed to your behavior `handler`. These are the *only* ways you should mutate the world or trigger UI from question code.

---

### `world` — Mutate entities and spaces

Wraps domain transformers, dispatches Redux actions, and emits `GameEvent`s. You do not need to touch the transformers directly.

| Method | Description |
|--------|-------------|
| `world.createEntity(config)` | Spawn a new entity |
| `world.updateEntity(entityId, updates)` | Patch entity name, visual, or data |
| `world.updateEntityState(entityId, state)` | Patch entity state bag only |
| `world.deleteEntities(entityIds)` | Remove one or more entities |
| `world.addToSpace(entityId, spaceId, position?)` | Place entity into a space |
| `world.removeFromSpace(entityId, spaceId)` | Remove entity from a space |
| `world.moveEntity(entityId, toSpaceId, position?)` | Move entity across spaces (atomic) |
| `world.moveEntityToGrid(entityId, spaceId, position)` | Move entity to a specific grid cell |

---

### `interaction` — Modals and terminal visibility

| Method | Description |
|--------|-------------|
| `interaction.openModal(instance: ModalInstance)` | Open a modal dialog |
| `interaction.closeModal(modalId, reason?)` | Programmatically close a modal |
| `interaction.setTerminalVisible(visible)` | Show or hide the terminal panel |
| `interaction.setModalGateOpen(open)` | Open or close the modal gate |
| `interaction.requestPhaseTransition(phase)` | Request a phase change via the interaction layer |

---

### `flow` — Execution flow and phase transitions

`flow.requestPhaseTransition` and `interaction.requestPhaseTransition` both request a phase change, but through different subsystems. `flow` goes through the `ExecutionFlowDispatcher` (which validates the transition and logs a warning if invalid). `interaction` goes through the interaction session layer. In most behavior handlers, **prefer `flow.requestPhaseTransition`** — it enforces valid transitions. Use `interaction.requestPhaseTransition` only when the transition originates from a UI action (e.g., a modal button).

| Method | Description |
|--------|-------------|
| `flow.requestPhaseTransition(phase)` | Request phase change through the execution flow dispatcher |
| `flow.dispatchIntent(intent)` | Dispatch a raw `ExecutionFlowIntent` |

---

### `progress` — Question completion

| Method | Description |
|--------|-------------|
| `progress.completeQuestion()` | Mark the current question as completed |
| `progress.setQuestion(id, status?)` | Set the active question ID and status |

---

### `terminal` — Terminal output

Only relevant when using `useTerminalEngine`. Gives you access to the terminal's I/O from inside a behavior handler.

| Method | Description |
|--------|-------------|
| `terminal.writeOutput(content)` | Append a line to the terminal display |
| `terminal.clearHistory()` | Clear all terminal history entries |
| `terminal.finishEngine()` | Signal the terminal engine to finish |

---

### Engine Hooks

Used in page-level React components to manage engine lifecycles:

| Hook | Returns | Description |
|------|---------|-------------|
| `useDragEngine(config?)` | `DragEngine` | Manages drag-and-drop interaction lifecycle |
| `useTerminalEngine(config?)` | `TerminalEngine` | Manages terminal input lifecycle |
| `useEngineProgress(engineId?)` | `EngineProgress` | Reads the progress/status of an engine |
| `useSpaceEntities(spaceId)` | `EntityData[]` | Reactive list of entities in a space |

`EngineController<TContext>`: `{ progress: EngineProgress, start(), finish(), reset(), context? }`

`EngineProgress`: `{ status: EngineProgressStatus, startedAt?, finishedAt?, autoStarted? }` — see `EngineProgressStatus` in section 2.

---

### QuestionRuntime — outside behavior handlers

`QuestionRuntime<TContext>` is the runtime object available *outside* behavior handlers — e.g. in engine setup code, in page-level hooks, or when configuring `useDragEngine` / `useTerminalEngine`. It exposes the same API namespaces as `EffectContext` but is accessed imperatively rather than through a handler callback.

```ts
type QuestionRuntime<TContext> = {
  world: WorldApi;
  progress: ProgressApi;
  executionFlow: ExecutionFlowApi;       // same as `flow` in EffectContext
  interactionSession: InteractionSessionApi; // same as `interaction` in EffectContext
  interactionState: InteractionSessionState; // { terminalVisible, modalGateOpen }
  state: GameState;
  phase: string;
  isCompleted: boolean;
  events: GameEvent[];
  ack: (cursor: number) => void;
  behaviorContext: TContext;
  registerTerminalFinish: (fn: () => void) => void;
}
```

> Note: `executionFlow` in `QuestionRuntime` corresponds to `flow` in `EffectContext`. `interactionSession` corresponds to `interaction`. The naming differs for historical reasons.

---

### `Commands` — legacy flat alias

The `Commands` type is a flat bag that combines `WorldApi` + some interaction methods into a single object. It predates the namespaced `world`/`interaction` split on `EffectContext`. **Prefer the namespaced APIs** (`world.*`, `interaction.*`) from `EffectContext` or `QuestionRuntime`. `Commands` exists for backward compatibility.

---

### RuntimeApiResult

All Public API mutation methods return `RuntimeApiResult`:

```
RuntimeApiResult
  = { ok: true }
  | { ok: false; error: { message: string } }
```

---

## 11. UI & Presentation Layer

### Engine Components

Used in JSX to render spaces. Each component connects to the game state automatically.

| Component | Description |
|-----------|-------------|
| `GameBoard` | Root container that sets up layout and arrow rendering |
| `GridSpace` | Renders a grid space with drag targets |
| `PoolSpace` | Renders a pool space |
| `PathSpace` | Renders an SVG path space with animated entities |
| `CustomSpace` | Renders a custom space — you supply the children |

---

### Modal Types — `types/modal.ts`

A `ModalInstance` is built from `ModalContentBlock`s and `ModalAction`s. Pass one to `interaction.openModal()`.

**Field kinds** (discriminated by `kind`):

| Kind | Extra fields |
|------|-------------|
| `"text"` | `label, placeholder?, defaultValue?, validate?` |
| `"textarea"` | `label, placeholder?, defaultValue?, validate?` |
| `"checkbox"` | `label, defaultValue?` |
| `"select"` | `label, options: ModalSelectOption[], placeholder?, defaultValue?, validate?` |
| `"readonly"` | `label, value: string` |

**Content block kinds**:
- `{ kind: "text", text }` — plain text paragraph
- `{ kind: "link", text, href }` — hyperlink
- `{ kind: "field", field: ModalField }` — a form field

**`ModalAction`**: `{ id, label, variant?: "primary" \| "secondary" \| "ghost" \| "danger", validate?, closesModal? }`

**`ModalInstance`**: `{ id?, title?, content: ModalContentBlock[], actions: ModalAction[], blocking?, initialValues? }`

---

### Terminal Types — `types/terminal.ts`

| Type | Shape |
|------|-------|
| `TerminalEntry` | `{ id, type: TerminalEntryType, content, timestamp }` |
| `TerminalState` | `{ visible, prompt, history: TerminalEntry[] }` |
| `TerminalEntryType` | `"prompt" \| "input" \| "output" \| "error" \| "hint" \| "info"` |

---

### Drawer Types — `types/drawer.ts`

A `DrawerConfig` describes a sliding panel that wraps one or more spaces.

| Type | Shape |
|------|-------|
| `DrawerConfig` | `{ id, contentType: "space", spaceId, spaceIds?, title?, position?, initialState?, foldedSize?, expandedSize?, mouseAware?, showFloatingButton?, floatingButtonLabel? }` |
| `DrawerInstance` | `DrawerConfig & { state: DrawerState }` |
| `DrawerState` | `"expanded" \| "folded"` |
| `DrawerPosition` | `"bottom" \| "top" \| "left" \| "right"` |

---

### Arrow Types — `types/arrow.ts`

Arrows connect two spaces visually on the `GameBoard`.

| Type | Shape |
|------|-------|
| `Arrow` | `{ id, from: ArrowEndpoint, to: ArrowEndpoint, style?: ArrowStyle, label? }` |
| `ArrowEndpoint` | `{ spaceId: string; anchor: ArrowAnchorValue }` |
| `ArrowAnchor` | `"tl" \| "tr" \| "bl" \| "br"` (corner of the space) |
| `ArrowAnchorValue` | `ArrowAnchor \| Partial<Record<ArrowBreakpoint, ArrowAnchor>>` (responsive) |
| `ArrowStyle` | `{ stroke?, strokeWidth?, opacity?, headSize?, dashed?, bow?, stretch?, padStart?, padEnd?, flip?, straights? }` |

---

### Grid / Geometry Types

Internal infrastructure. Rarely needed in question code.

| Type | File | Shape |
|------|------|-------|
| `Point2D` | `internal/infrastructure/geometry/coordinates.ts` | `{ x: number; y: number }` |
| `GridCoordinate` | `internal/infrastructure/geometry/coordinates.ts` | `{ row: number; col: number }` |
| `Dimensions` | `internal/infrastructure/geometry/coordinates.ts` | `{ width: number; height: number }` |
| `SquareGridConfig<T>` | `types/grid.ts` | `{ rows, cols, metrics, initializer? }` |
| `HexGridConfig<T>` | `types/grid.ts` | `{ rows, cols, metrics, orientation?, initializer? }` |
| `CubeCoordinate` | `types/grid.ts` | `{ q, r, s }` (hex cube coordinates) |
| `PolarCoordinate` | `types/grid.ts` | `{ ring, sector }` (radial grid) |
| `RadialGridConfig<T>` | `types/grid.ts` | `{ rings, sectorsPerRing, metrics, centerRadius?, ringSpacing?, initializer? }` |
| `GridDirection` | `types/grid.ts` | `"north" \| "south" \| "east" \| "west" \| "northeast" \| "northwest" \| "southeast" \| "southwest"` |
