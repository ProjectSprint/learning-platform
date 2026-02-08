# Type Contracts

> Authoritative reference for all game engine data types.
> Source: `application/state/types/`, `domain/entity/`, `domain/space/`, `core/types/`

## When to Read

- You need to understand what data the engine stores and how it is shaped
- You are writing a reducer, action, or pure function and need the type signatures
- You are debugging serialization or Immer draft issues

---

## GameState

The single source of truth for all game progression.
UI-local concerns (drawers, hints, arrows, terminal) are **not** stored here.

```typescript
type GameState = {
  phase: GamePhase;
  spaces: Record<string, SpaceData>;
  entities: Record<string, EntityData>;
  overlay: OverlayState;
  question: { id: string; status: QuestionStatus };
  eventQueue: GameEventQueue;
  eventCursors: Record<string, number>;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `GamePhase` | Current lifecycle phase |
| `spaces` | `Record<string, SpaceData>` | All spaces keyed by ID (normalized) |
| `entities` | `Record<string, EntityData>` | All entities keyed by ID (normalized) |
| `overlay` | `OverlayState` | Modal state (progression-relevant) |
| `question` | `{ id, status }` | Question metadata |
| `eventQueue` | `GameEventQueue` | Ordered progression events |
| `eventCursors` | `Record<string, number>` | Per-engine event acknowledgement cursors |

### Default State

```typescript
const DEFAULT: GameState = {
  phase: "setup",
  spaces: {},
  entities: {},
  overlay: { modals: {} },
  question: { id: "", status: "in_progress" },
  eventQueue: { events: [], lastEventId: 0, lastActionId: 0 },
  eventCursors: {},
};
```

### Why Record, Not Map

All collections use `Record<string, T>` instead of `Map<string, T>` because Immer's `produce()` cannot deeply patch `Map` instances. Plain objects are fully draftable.

---

## GamePhase

Lifecycle phase of the game. Phases progress forward; going backward is not supported.

```typescript
type GamePhase = "setup" | "configuring" | "playing" | "terminal" | "completed";
```

| Value | Meaning |
|-------|---------|
| `setup` | Initial state, spaces/entities being created |
| `configuring` | User is configuring entities before gameplay |
| `playing` | Active drag-and-drop gameplay |
| `terminal` | CLI-style interaction (command input) |
| `completed` | Question finished |

---

## QuestionStatus

```typescript
type QuestionStatus = "in_progress" | "completed";
```

---

## SpaceData (Discriminated Union)

```typescript
type SpaceData = GridSpaceData | PoolSpaceData;
```

Discriminated on `kind` field. Use type guards:

```typescript
isGridSpace(space)  // space.kind === "grid"
isPoolSpace(space)  // space.kind === "pool"
```

### SpaceBase (Shared Fields)

```typescript
type SpaceBase = {
  id: string;
  name?: string;
  maxCapacity?: number;      // undefined = unlimited
  metadata: Record<string, unknown>;
};
```

### GridSpaceData

A 2D grid where entities occupy `{ row, col }` positions.

```typescript
type GridSpaceData = SpaceBase & {
  kind: "grid";
  rows: number;
  cols: number;
  metrics: GridMetrics;
  allowMultiplePerCell: boolean;
  entityPositions: Record<string, GridPosition>;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `rows` | `number` | Grid height |
| `cols` | `number` | Grid width |
| `metrics` | `GridMetrics` | Cell sizing and spacing for rendering |
| `allowMultiplePerCell` | `boolean` | If false, one entity per cell |
| `entityPositions` | `Record<string, GridPosition>` | Entity ID -> `{ row, col }` |

### PoolSpaceData

An ordered list of entities (inventory, tray, etc.).

```typescript
type PoolSpaceData = SpaceBase & {
  kind: "pool";
  layout: "grid" | "list" | "carousel";
  columns?: number;
  allowReorder: boolean;
  entityIds: string[];
};
```

| Field | Type | Description |
|-------|------|-------------|
| `layout` | `"grid" \| "list" \| "carousel"` | Rendering hint |
| `columns` | `number?` | Column count for grid layout |
| `allowReorder` | `boolean` | Whether entities can be reordered |
| `entityIds` | `string[]` | Ordered entity IDs |

### GridPosition

```typescript
type GridPosition = GridCoordinate = { row: number; col: number };
```

### Configuration Types

Used when creating spaces (factory input, not stored in state):

```typescript
type GridSpaceConfig = SpaceBaseConfig & {
  rows: number;
  cols: number;
  metrics: GridMetrics;
  allowMultiplePerCell?: boolean;
};

type PoolSpaceConfig = SpaceBaseConfig & {
  layout?: "grid" | "list" | "carousel";
  columns?: number;
  allowReorder?: boolean;
};
```

---

## EntityData

Base type for all game entities.

```typescript
type EntityData = {
  id: string;
  type: string;
  name?: string;
  visual: EntityVisual;
  data: Record<string, unknown>;
  state: Record<string, unknown>;
  behaviorIds: string[];
};
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `type` | `string` | Entity type (e.g. `"router"`, `"packet"`) |
| `name` | `string?` | Display name |
| `visual` | `EntityVisual` | Rendering properties |
| `data` | `Record<string, unknown>` | Immutable entity-type-specific data |
| `state` | `Record<string, unknown>` | Mutable runtime state |
| `behaviorIds` | `string[]` | Attached behavior identifiers |

### EntityVisual

```typescript
type EntityVisual = {
  icon?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: Record<string, unknown>;
};
```

### ItemData (extends EntityData)

Items are draggable entities with placement rules.

```typescript
type ItemData = EntityData & {
  allowedPlaces: string[];
  icon?: IconInfo;
  tooltip?: ItemTooltip;
  draggable: boolean;
  category?: string;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `allowedPlaces` | `string[]` | Space IDs where this item can be dropped |
| `draggable` | `boolean` | Whether the user can drag this item |
| `tooltip` | `ItemTooltip?` | Tooltip content and optional link |
| `category` | `string?` | Grouping category |

Type guard: `isItemData(entity)` checks for `allowedPlaces` and `draggable`.

### ItemTooltip

```typescript
type ItemTooltip = {
  content: string;
  seeMoreHref?: string;
};
```

---

## OverlayState

Manages progression-relevant modals (not UI chrome).

```typescript
type OverlayState = {
  modals: Record<string, ModalEntry>;
};

type ModalEntry = {
  instance: ModalInstance;
  visible: boolean;
};
```

### ModalInstance

Complete modal definition provided by question code:

```typescript
type ModalInstance = {
  id?: string;
  title?: string;
  content: ModalContentBlock[];
  actions: ModalAction[];
  blocking?: boolean;
  initialValues?: Record<string, unknown>;
};
```

### ModalContentBlock

```typescript
type ModalContentBlock =
  | { kind: "text"; id?: string; text: string }
  | { kind: "link"; id?: string; text: string; href: string }
  | { kind: "field"; field: ModalField };
```

### ModalField

```typescript
type ModalField =
  | ModalTextField      // kind: "text"
  | ModalTextareaField  // kind: "textarea"
  | ModalCheckboxField  // kind: "checkbox"
  | ModalSelectField    // kind: "select"
  | ModalReadonlyField  // kind: "readonly"
```

### ModalAction (Button)

```typescript
type ModalAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  validate?: boolean;      // Run field validators before action
  closesModal?: boolean;   // Auto-close on click
};
```

---

## GameEventQueue

Deterministic, ordered event log for state transitions.

```typescript
type GameEventQueue = {
  events: GameEvent[];
  lastEventId: number;
  lastActionId: number;
};
```

| Field | Description |
|-------|-------------|
| `events` | Append-only array of all events |
| `lastEventId` | Monotonically increasing event counter |
| `lastActionId` | Groups events by the action that produced them |

See [events.md](./events.md) for the full `GameEvent` union.

---

## Helper Types

### EntityPlacement

```typescript
type EntityPlacement = {
  entityId: string;
  spaceId: string;
  position?: Record<string, unknown>;
};
```

### EntityTransfer

```typescript
type EntityTransfer = {
  entityId: string;
  fromSpaceId: string;
  toSpaceId: string;
  fromPosition?: Record<string, unknown>;
  toPosition?: Record<string, unknown>;
};
```

---

## UI-Local Types (Not in GameState)

These types exist in the presentation layer. They are **not** part of `GameState`.

| Type | Provider | Purpose |
|------|----------|---------|
| `DrawerConfig` / `DrawerInstance` | `DrawerProvider` | Drawer registration and state |
| `Arrow[]` | `ArrowProvider` | Arrow visual connections |
| Hint text/visibility | `HintProvider` | Contextual hint display |
| Terminal history/prompt | `TerminalProvider` | CLI input state |
| Drag proxy/target | `DragContext` | Active drag state |

See [../19-core-ui-boundary.md](../19-core-ui-boundary.md) for the full boundary definition.

---

## Geometry Types

From `infrastructure/geometry/coordinates.ts`:

```typescript
type Point2D = { x: number; y: number };
type GridCoordinate = { row: number; col: number };
type Dimensions = { width: number; height: number };
```
