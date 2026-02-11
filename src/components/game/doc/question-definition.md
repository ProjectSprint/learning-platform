# QuestionDefinition — Declarative Question Configuration

QuestionDefinition is the entry point for creating a new question. It
declaratively describes what spaces exist, what entities populate them, what
phase rules govern progression, and what behaviors handle user interaction.

The runtime reads this definition once on mount, bootstraps the game state,
and activates the behavior reactor.

```typescript
import type { QuestionDefinition } from "@/components/game/runtime";
```

## Type Signature

```typescript
type QuestionDefinition<
  CK extends string = string,      // Union of condition keys for phase rules
  TContext = Record<string, never>, // Behavior context type
> = {
  meta: QuestionMeta;
  initialPhase: string;
  spaces: SpaceDefinition[];
  entities: EntityDefinition[];
  phaseRules: PhaseRule<CK>[];
  inventoryRules?: InventoryRule<CK>[];
  spaceRules?: SpaceRule<CK>[];
  behaviors?: BehaviorDefinition<TContext>;
};
```

## Fields

### meta

Question metadata used for identification and display.

```typescript
type QuestionMeta = {
  id: string;          // Unique question identifier (e.g. "dhcp", "tcp-handshake")
  title: string;       // Display title
  description: string; // Short description
};
```

### initialPhase

The phase the game starts in after bootstrap. Typically `"setup"`.

### spaces

Array of space definitions. Each space is created during bootstrap via
dispatched actions. Order does not matter.

```typescript
type SpaceDefinition =
  | { kind: "grid"; config: GridSpaceConfig }
  | { kind: "pool"; config: PoolSpaceConfig };
```

**GridSpaceConfig:**

```typescript
{
  id: string;       // Unique space ID. Must match entity allowedPlaces.
  name?: string;    // Display name shown as space title
  rows: number;     // Grid rows
  cols: number;     // Grid columns
  metrics: { cellWidth: number; cellHeight: number; gapX: number; gapY: number };
  maxCapacity?: number;           // Max entities (undefined = rows * cols)
  allowMultiplePerCell?: boolean; // Default false
}
```

**PoolSpaceConfig:**

```typescript
{
  id: string;                   // Typically "inventory"
  name?: string;                // Display name
  layout?: "grid" | "list" | "carousel";  // Default "grid"
  columns?: number;
  maxCapacity?: number;
  allowReorder?: boolean;
}
```

### entities

Array of entity definitions. Each entity is created and optionally placed in
a space during bootstrap.

```typescript
type EntityDefinition = {
  config: ItemDataConfig;      // Entity creation config
  initialSpace?: string;       // Space ID to place entity in (e.g. "inventory")
  initialPosition?: GridPosition;  // Grid position (grid spaces only)
};
```

**ItemDataConfig:**

```typescript
{
  id: string;                     // Unique entity ID
  name?: string;                  // Display name
  allowedPlaces: string[];        // Space IDs where this entity can be dropped
  icon?: { icon: string; color?: string };  // Iconify icon config
  tooltip?: { content: string; seeMoreHref?: string };
  draggable?: boolean;            // Default true
  data?: Record<string, unknown>; // Initial data (e.g. { type: "router" })
  category?: string;              // Grouping key
}
```

**Side effect:** The `data.type` field from ItemDataConfig is used as the
entity's `type` property. If you want entity.type to be "router", include
`data: { type: "router" }` in the config.

### phaseRules

Declarative rules for automatic phase transitions. Evaluated by the page
component using `resolvePhase()`.

```typescript
type PhaseRule<CK extends string> = {
  kind: "set";
  when: Condition<CK>;
  to: string;          // Target phase
};

type Condition<CK extends string> =
  | { kind: "eq"; key: CK; value: unknown }
  | { kind: "neq"; key: CK; value: unknown }
  | { kind: "and"; conditions: Condition<CK>[] }
  | { kind: "or"; conditions: Condition<CK>[] };
```

**Usage in page component:**

```typescript
useEffect(() => {
  const context: ConditionContext<MyConditionKey> = {
    dragStatus: dragEngine.progress.status,    // "pending" | "started" | "finished"
    questionStatus: state.question.status,     // "in_progress" | "completed"
  };
  const resolved = resolvePhase(DEFINITION.phaseRules, context, state.phase, "setup");
  if (state.phase !== resolved.nextPhase) {
    interactionSession.requestPhaseTransition(resolved.nextPhase, "my.phase_rules");
  }
}, [dragEngine.progress.status, state.phase, state.question.status]);
```

Phase rules are evaluated top-to-bottom. The first rule whose condition matches
determines the next phase. If no rule matches, the phase stays unchanged.

**Common pattern:** Order rules from most specific (completed) to least specific
(started) so higher-priority phases win.

```typescript
phaseRules: [
  { kind: "set", when: { kind: "eq", key: "questionStatus", value: "completed" }, to: "completed" },
  { kind: "set", when: { kind: "eq", key: "dragStatus", value: "finished" }, to: "terminal" },
  { kind: "set", when: { kind: "eq", key: "dragStatus", value: "started" }, to: "playing" },
],
```

### behaviors

Optional behavior definition for event-driven interaction handling. See
[behavior-system.md](./behavior-system.md) for full documentation.

---

## Complete Example

From the DHCP question:

```typescript
import type { QuestionDefinition } from "@/components/game/runtime";

type DhcpConditionKey = "dragStatus" | "questionStatus";
type DhcpBehaviorContext = { lastConfiguredDeviceId: string | null; navigateAway: boolean };

export const DHCP_DEFINITION: QuestionDefinition<DhcpConditionKey, DhcpBehaviorContext> = {
  meta: {
    id: "networking",
    title: "Setup your home connection!",
    description: "Connect two PCs using a Router",
  },
  initialPhase: "setup",
  spaces: [
    { kind: "grid", config: { id: "pc-1-board", name: "PC-1", rows: 1, cols: 1, metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 }, maxCapacity: 1 } },
    { kind: "grid", config: { id: "router-board", name: "Router", rows: 1, cols: 1, metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 }, maxCapacity: 1 } },
    { kind: "grid", config: { id: "pc-2-board", name: "PC-2", rows: 1, cols: 1, metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 }, maxCapacity: 1 } },
    { kind: "pool", config: { id: "inventory", name: "Items" } },
  ],
  entities: [
    { config: { id: "pc-1", name: "PC-1", allowedPlaces: ["inventory", "pc-1-board"], icon: { icon: "twemoji:laptop-computer" }, data: { type: "pc" } }, initialSpace: "inventory" },
    { config: { id: "router-1", name: "Router", allowedPlaces: ["inventory", "router-board"], icon: { icon: "streamline-flex-color:router-wifi-network" }, data: { type: "router" } }, initialSpace: "inventory" },
    { config: { id: "pc-2", name: "PC-2", allowedPlaces: ["inventory", "pc-2-board"], icon: { icon: "twemoji:laptop-computer" }, data: { type: "pc" } }, initialSpace: "inventory" },
  ],
  phaseRules: [
    { kind: "set", when: { kind: "eq", key: "questionStatus", value: "completed" }, to: "completed" },
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "finished" }, to: "terminal" },
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "started" }, to: "playing" },
  ],
  behaviors: DHCP_BEHAVIORS,
};
```

## Bootstrap Side Effects

When `useQuestionRuntime(engineId, definition)` is called, the following
actions are dispatched once on mount:

1. `SET_QUESTION` — Sets question ID and status to "in_progress"
2. `SET_PHASE` — Sets initialPhase
3. `SPACE_CREATED` — One per space in definition.spaces
4. `ENTITY_CREATED` + `ENTITY_ADDED` — One pair per entity in definition.entities

Bootstrap runs exactly once (guarded by ref). Subsequent renders do not
re-bootstrap.

## Validation

The runtime validates the definition on every render and throws if invalid:

- `meta.id` must be non-empty
- Each space must have a non-empty `config.id`
- Each entity must have a non-empty `config.id`
- Entity `initialSpace` must reference a defined space ID
- No duplicate space IDs
- No duplicate entity IDs
