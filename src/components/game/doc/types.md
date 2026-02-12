# Types — Game Engine Type Reference

All game engine types are plain TypeScript types (not classes) for Immer
compatibility. State is JSON-serializable.

## GameState

The single source of truth for all game data. Accessed via `useGameState()`.

```typescript
type GameState = {
  phase: string;                              // Current game phase (e.g. "setup", "playing", "terminal", "completed")
  spaces: Record<string, SpaceData>;          // All spaces keyed by ID
  entities: Record<string, EntityData>;       // All entities keyed by ID
  overlay: OverlayState;                      // Modal stack
  question: { id: string; status: QuestionStatus };  // Question metadata
  eventQueue: GameEventQueue;                 // Append-only event log
  eventCursors: Record<string, number>;       // Per-engine consumption pointers
};

type QuestionStatus = "in_progress" | "completed";
```

**Terminal UI state is NOT in GameState.** It lives in TerminalProvider and is
accessed via `useTerminalStore()`.

---

## EntityData

A game object (router, PC, cable, packet, etc.).

```typescript
type EntityData = {
  id: string;                          // Unique identifier
  type: string;                        // Type discriminator (e.g. "router", "pc", "cable")
  name?: string;                       // Display name
  visual: EntityVisual;                // Rendering properties
  data: Record<string, unknown>;       // Static/config properties (set once, updated via world.updateEntity)
  state: Record<string, unknown>;      // Dynamic runtime state (IP address, connection status, etc.)
  behaviorIds: string[];               // Attached behavior IDs (rarely used directly)
};
```

### EntityData.data vs EntityData.state

- **data** — Configuration set by world.updateEntity(). Example: `{ dhcpEnabled: true, startIp: "192.168.1.10" }`.
  Updated when the user configures an entity via modal submission.
- **state** — Runtime state set by world.updateEntityState(). Example: `{ ip: "192.168.1.10", status: "success" }`.
  Updated by derived state hooks to reflect computed status.

Both are `Record<string, unknown>`. The distinction is semantic: data = user-set
config, state = system-derived status.

### EntityVisual

```typescript
type EntityVisual = {
  icon?: string;       // Iconify icon ID
  color?: string;      // Color override
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: Record<string, unknown>;
};
```

---

## ItemData

An entity that can be dragged between spaces. Extends EntityData.

```typescript
type ItemData = EntityData & {
  allowedPlaces: string[];    // Space IDs where this item can be dropped
  icon?: IconInfo;            // Icon config ({ icon: string, color?: string })
  tooltip?: ItemTooltip;      // Hover tooltip ({ content: string, seeMoreHref?: string })
  draggable: boolean;         // Whether drag is enabled
  category?: string;          // Grouping category
};
```

Type guard: `isItemData(entity)` returns true if entity has `allowedPlaces` and
`draggable` fields.

---

## SpaceData

A space where entities live. Discriminated union of GridSpaceData, PoolSpaceData, and CustomSpaceData.

```typescript
type SpaceData = GridSpaceData | PoolSpaceData | CustomSpaceData;
```

### GridSpaceData

A 2D grid with positioned entities.

```typescript
type GridSpaceData = {
  kind: "grid";
  id: string;
  name?: string;
  rows: number;
  cols: number;
  metrics: GridMetrics;                          // { cellWidth, cellHeight, gapX, gapY }
  allowMultiplePerCell: boolean;                 // Default: false
  entityPositions: Record<string, GridPosition>; // entityId → { row, col }
  maxCapacity?: number;
  metadata: Record<string, unknown>;
};

type GridPosition = { row: number; col: number };
type GridMetrics = { cellWidth: number; cellHeight: number; gapX: number; gapY: number };
```

### PoolSpaceData

An unordered collection (inventory, item pool).

```typescript
type PoolSpaceData = {
  kind: "pool";
  id: string;
  name?: string;
  layout: "grid" | "list" | "carousel";  // UI rendering hint
  columns?: number;                       // For grid layout
  allowReorder: boolean;
  entityIds: string[];                    // Ordered list of entity IDs
  maxCapacity?: number;
  metadata: Record<string, unknown>;
};
```

### CustomSpaceData

A display-only container for custom question-specific UI. Does not store entities.

```typescript
type CustomSpaceData = {
  kind: "custom";
  id: string;
  name?: string;
  maxCapacity?: number;
  metadata: Record<string, unknown>;
};
```

### Config Types (for QuestionDefinition)

```typescript
type GridSpaceConfig = {
  id: string;
  name?: string;
  rows: number;
  cols: number;
  metrics: GridMetrics;
  maxCapacity?: number;
  allowMultiplePerCell?: boolean;
  metadata?: Record<string, unknown>;
};

type PoolSpaceConfig = {
  id: string;
  name?: string;
  layout?: "grid" | "list" | "carousel";
  columns?: number;
  maxCapacity?: number;
  allowReorder?: boolean;
  metadata?: Record<string, unknown>;
};

type CustomSpaceConfig = {
  id: string;
  name?: string;
  maxCapacity?: number;
  metadata?: Record<string, unknown>;
};
```

---

## GameEvent

Events are emitted by reducers when state changes. They are consumed by the
behavior reactor and engine hooks. All events extend GameEventBase.

```typescript
type GameEventBase = {
  eventId: number;      // Monotonic event ID
  actionId: number;     // Groups events from the same action
  timestamp?: number;   // Epoch ms
};
```

### Event Types

| Type | Key Fields | Emitted When |
|------|-----------|-------------|
| `ENTITY_ENTERED_SPACE` | entityId, spaceId, position? | Entity added to a space |
| `ENTITY_LEFT_SPACE` | entityId, spaceId | Entity removed from a space |
| `ENTITY_MOVED` | entityId, fromSpaceId, toSpaceId | Entity moved between spaces |
| `ENTITY_UPDATED` | entityId, updates | Entity data/state/visual changed |
| `ENTITY_CLICKED` | entityId, spaceId, position? | Entity clicked in a GridSpace |
| `MODAL_OPENED` | modalId, modal | Modal opened |
| `MODAL_SUBMITTED` | modalId, modalActionId, values | Modal action button pressed |
| `MODAL_CLOSED` | modalId, reason? | Modal closed (backdrop/escape/button/programmatic) |
| `TERMINAL_INPUT` | entryId, input | User submitted terminal input |
| `PHASE_CHANGED` | from, to | Game phase changed |
| `ENGINE_STARTED` | engineId? | Engine started |
| `ENGINE_FINISHED` | engineId? | Engine finished |
| `RUNTIME_WARNING` | message | Non-fatal runtime warning |

### ModalSubmittedEvent Detail

```typescript
type ModalSubmittedEvent = GameEventBase & {
  type: "MODAL_SUBMITTED";
  modalId: string;            // ID of the modal (from ModalInstance.id)
  modalActionId: string;      // ID of the button pressed (from ModalAction.id)
  values: Record<string, unknown>;  // Form field values at time of submission
};
```

### TerminalInputEvent Detail

```typescript
type TerminalInputEvent = GameEventBase & {
  type: "TERMINAL_INPUT";
  entryId: string;    // Unique entry identifier
  input: string;      // Raw user input string
};
```

---

## ModalInstance

Data-driven modal definition. The engine renders modals from this schema.

```typescript
type ModalInstance = {
  id?: string;                         // Modal identifier (used in event matching)
  title?: string;                      // Dialog title
  content: ModalContentBlock[];        // Body content blocks
  actions: ModalAction[];              // Action buttons
  blocking?: boolean;                  // If true, cannot close without pressing an action
  initialValues?: Record<string, unknown>;  // Pre-filled form values
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
  | { kind: "text";     id: string; label: string; placeholder?: string; defaultValue?: string; helpText?: string; validate?: (value, allValues) => string | null }
  | { kind: "textarea"; id: string; label: string; placeholder?: string; defaultValue?: string; helpText?: string; validate?: (value, allValues) => string | null }
  | { kind: "checkbox"; id: string; label: string; defaultValue?: boolean; helpText?: string }
  | { kind: "select";   id: string; label: string; options: { value: string; label: string }[]; placeholder?: string; defaultValue?: string; helpText?: string; validate?: (value, allValues) => string | null }
  | { kind: "readonly"; id: string; label: string; value: string; helpText?: string };
```

### ModalAction

```typescript
type ModalAction = {
  id: string;                              // Action identifier (matched in MODAL_SUBMITTED.modalActionId)
  label: string;                           // Button text
  variant?: "primary" | "secondary" | "ghost" | "danger";
  validate?: boolean;                      // If true, runs field validators before triggering
  closesModal?: boolean;                   // If true, closes modal after action (no MODAL_SUBMITTED event)
};
```

**Important:** If `closesModal: true`, the modal closes immediately and emits a
`MODAL_CLOSED` event, NOT a `MODAL_SUBMITTED` event. Use `closesModal` for
"Cancel" buttons and omit it for "Save" buttons you want to handle in behaviors.

---

## Arrow

Connection line drawn between spaces on the GameBoard.

```typescript
type Arrow = {
  id: string;
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  style?: ArrowStyle;
};

type ArrowEndpoint = {
  spaceId: string;
  anchor: ArrowAnchor;  // Responsive: { base: "tl", lg: "tr" } or fixed: "tl"
};

type ArrowAnchorValue = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

type ArrowStyle = {
  stroke?: string;
  strokeWidth?: number;
  headSize?: number;
  bow?: number;
};
```

---

## DrawerConfig

Configuration for registering a responsive drawer panel.

```typescript
type DrawerConfig = {
  id: string;
  contentType: "space" | "custom";
  spaceId?: string;                 // Required if contentType is "space"
  title: string;
  position: "bottom" | "left" | "right";
  initialState: "expanded" | "folded";
  expandedSize: DrawerSizeMap;      // Responsive: { base: "65vh", md: "40vh" }
  foldedSize?: DrawerSizeMap;
  mouseAware?: boolean;             // Auto-expand on mouse hover
  showFloatingButton?: boolean;
  floatingButtonLabel?: string;
};

type DrawerSizeMap = Record<string, string>;  // breakpoint → CSS size
```
