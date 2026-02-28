# Game Author Guide (Single Canonical Doc)

This is the single canonical guide for building questions under `src/routes/questions/**`.

Maintenance order is backward from contract stability:

1. Section **4) API Reference**
2. Section **3) Configuration**
3. Section **2) Getting Started**
4. Section **1) Principles**

## 1) Principles and Mental Model

### 1.1 Core model

1. One runtime per question page (`useQuestionRuntime(...)` once).
2. `QuestionDefinition` is the source of truth for spaces/entities/phase rules/behaviors.
3. Gameplay logic belongs in behavior rules, not route-level event loops.
4. Mutations go through `ctx.cmd.*` inside behavior handlers, or `runtime.cmd.*` outside.
5. Route imports are restricted to the public facades listed below.

### 1.2 CQRS Contract

Handler context exposes three surfaces with distinct consistency guarantees:

- **`ctx.snapshot`** — stale Redux point-in-time. Captured at the start of the event batch. `cmd` mutations do not update `snapshot` within the same handler.
- **`ctx.cmd`** — eventual fire-and-forget dispatch. All mutations (entity, space, modal, phase, terminal) flow through this single flat surface.
- **`ctx.store`** — live in-memory behavior state. Mutations via `ctx.mutate(fn)` are synchronously visible within the same handler tick.

### 1.3 Public import boundary

Route-level imports are limited to:

- `@/components/game/engine`
- `@/components/game/engine/game-provider`
- `@/components/game/engine/runtime`
- `@/components/game/types/*` (types only)

Enforced by tests:

- `src/components/game/engine/__tests__/public-api-boundary.test.ts`
- `src/routes/questions/networking/__tests__/-runtime-boundaries.test.ts`

## 2) Getting Started (Build One Question)

### 2.1 Recommended file shape

```text
src/routes/questions/<category>/<question>/
  index.tsx
  -page.tsx
  -utils/
    constants.ts
    definition.ts
    behaviors.ts
    modal-builders.ts
    entity-label.ts
    entity-badge.ts
    get-contextual-hint.ts
```

### 2.2 Minimal definition

```ts
import {
  ConditionFactory,
  EntityFactory,
  PhaseRuleFactory,
  SpaceFactory,
} from "@/components/game/engine/runtime";
import type {
  QuestionDefinitionFor,
  QuestionTypeSpec,
} from "@/components/game/types/question";

type DemoConditionKey = "dragStatus" | "questionStatus";
type DemoBehaviorContext = { navigateAway: boolean };

type DemoQuestionSpec = QuestionTypeSpec & {
  conditionKey: DemoConditionKey;
  context: DemoBehaviorContext;
  phase: "setup" | "completed";
  spaceId: "board" | "inventory";
  entityType: "router";
  questionId: "demo";
  conditionValue: string;
};

export const DEMO_DEFINITION: QuestionDefinitionFor<DemoQuestionSpec> = {
  meta: { id: "demo", title: "Demo", description: "Demo question" },
  initialPhase: "setup",
  spaces: [
    SpaceFactory.grid({
      id: "board",
      name: "Board",
      rows: 1,
      cols: 2,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    }),
    SpaceFactory.pool({ id: "inventory", name: "Inventory" }),
  ],
  entities: [
    EntityFactory.config(
      {
        id: "router-1",
        name: "Router",
        allowedPlaces: ["inventory", "board"],
        data: { type: "router" },
      },
      { initialSpace: "inventory" },
    ),
  ],
  phaseRules: [
    PhaseRuleFactory.set(
      ConditionFactory.eq("questionStatus", "completed"),
      "completed",
    ),
  ],
  behaviors: { initialContext: { navigateAway: false }, rules: [] },
};
```

`SpaceFactory.pool(...)` follows runtime defaults (for example, omitted
`allowReorder` resolves to `true`).

### 2.3 Minimal page wiring

```tsx
import { useEffect } from "react";
import {
  DragOverlay,
  GameBoard,
  GridSpace,
  Modal,
  PoolSpace,
  useDragEngine,
} from "@/components/game/engine";
import { GameProvider, useGameCtx } from "@/components/game/engine/game-provider";
import { resolveQuestionPhase, useQuestionRuntime } from "@/components/game/engine/runtime";
import type { ConditionContext } from "@/components/game/types/question";

const PageInner = () => {
  const { cmd, snapshot, store } = useQuestionRuntime("demo-page", DEMO_DEFINITION);
  const dragEngine = useDragEngine();
  const gameCtx = useGameCtx();

  useEffect(() => {
    if (store.navigateAway) onQuestionComplete();
  }, [store.navigateAway]);

  useEffect(() => {
    const context: ConditionContext<"dragStatus" | "questionStatus"> = {
      dragStatus: dragEngine.progress.status,
      questionStatus: snapshot.question.status,
    };
    const resolved = resolveQuestionPhase(DEMO_DEFINITION.phaseRules, context, snapshot.phase, "setup");
    if (resolved.nextPhase !== snapshot.phase) {
      cmd.setPhase(resolved.nextPhase, "demo.phase_rules");
    }
  }, [dragEngine.progress.status, cmd, snapshot.phase, snapshot.question.status]);

  return (
    <>
      <GameBoard>
        <GridSpace ctx={gameCtx} id="board" />
        <PoolSpace ctx={gameCtx} id="inventory" />
        <DragOverlay getEntityLabel={(entityType) => entityType} />
      </GameBoard>
      <Modal />
    </>
  );
};

export const Page = () => (
  <GameProvider>
    <PageInner />
  </GameProvider>
);
```

### 2.4 Behavior authoring rules

- Rule evaluation is ordered and first-match-wins per event.
- Put specific guards before broad guards.
- Use `schedule`/`cancelSchedule` from behavior context for delayed effects.
- Keep route pages focused on UI composition and phase wiring.
- For `MODAL_SUBMITTED`, use a typed contract parser (`parseModalSubmission`) and avoid reading `event.values.*` directly in handlers.
- For `TERMINAL_INPUT`, use `parseTerminalInput` and avoid direct string parsing from raw event payloads.
- For entity payload writes, use `createEntityPayloadWriter` so `data`/`state` updates are typed at the route boundary.

## 3) Configuration (Grouped by ADT + methods)

### 3.1 Root ADT: `QuestionDefinition`

| Field | Purpose | Main methods/components |
|---|---|---|
| `meta` | identity and display metadata | `useQuestionRuntime`, `bootstrapQuestion` |
| `initialPhase` | initial runtime phase | `useQuestionRuntime`, `bootstrapQuestion` |
| `spaces` | available spaces in state | `GridSpace`, `PoolSpace`, `PathSpace`, `CustomSpace` |
| `entities` | initial entities and placement | `cmd.spawnEntity`, `cmd.placeInSpace` |
| `phaseRules` | declarative phase resolution | `resolveQuestionPhase`, `cmd.setPhase` |
| `behaviors` | event-driven gameplay logic | trigger builders + behavior reactor |
| `dragRules` | drag gating policy | runtime drag gating evaluation |
| `layoutRules` | visibility by context | runtime layout evaluation |
| `shapeRules` | dynamic space shape overlays | runtime shape evaluation |

### 3.2 Space ADTs

- **GridSpaceConfig**: `rows`, `cols`, `metrics`, optional `allowMultiplePerCell`, `maxCapacity`.
- **PoolSpaceConfig**: `layout`, `columns`, `allowReorder`, optional `maxCapacity`.
- **PathSpaceConfig**: `path`, `viewBox`, `duration`, `speedMultiplier`, `showDropzone`.
- **CustomSpaceConfig**: display container keyed by `id`.
- **QueueSpaceConfig**: queue data model (`maxDepth`, `direction`), no dedicated exported UI component.
- **MeterSpaceConfig**: meter data model (`min`, `max`, `unit`, `thresholds`), no dedicated exported UI component.

Primary mutation methods for space/entity relationships:

- `cmd.placeInSpace(entityId, spaceId, position?)`
- `cmd.removeFromSpace(entityId, spaceId)`
- `cmd.moveEntity(entityId, toSpaceId, position?)`
- `cmd.moveEntityToGrid(entityId, spaceId)`

### 3.3 Entity ADT (`EntityDefinition` / `ItemDataConfig`)

- Identity: `id`, `name`
- Placement rules: `allowedPlaces`, `initialSpace`, `initialPosition`
- Metadata: `icon`, `tooltip`, `category`
- Runtime payload: `data`, `draggable`

Primary entity methods:

- `cmd.spawnEntity`, `cmd.patchEntity`, `cmd.patchEntityState`, `cmd.destroyEntities`
- Read hooks: `useEntity*`, `useEntities*`, `useItem`

### 3.4 Behavior ADT (`BehaviorDefinition`)

- Configure `initialContext` and ordered `rules[]`.
- Rule shape: `id`, `on` (trigger), optional `guard`, `handler`.

Trigger builders:

- `buildEntityClickTrigger(entityType?, spaceId?)`
- `buildModalSubmitTrigger(modalId?, modalActionId?)`
- `parseModalSubmission(event, contract)` for typed modal value parsing at behavior boundaries
- `buildTerminalInputTrigger(match?)`
- `parseTerminalInput(event, contract)` for typed terminal command parsing
- `buildEntityPlacedTrigger(spaceId?, entityType?)`
- `buildEntityArrivedTrigger(spaceId?, entityType?)`

### 3.7 Payload Contract Pattern (Hard Migration)

Dynamic payload channels are now contract-driven in route behavior code:

- Modal values: parse with `parseModalSubmission(...)`
- Terminal commands: parse with `parseTerminalInput(...)`
- Entity data/state writes: go through `createEntityPayloadWriter(...)`
- Registry typing: define one app registry (`ContractRegistry`) and derive payloads with `InferModal`/`InferTerminal` or keyed helpers (`ModalPayload`/`TerminalPayload`)

Minimal pattern:

```ts
import {
  buildModalSubmitTrigger,
  buildTerminalInputTrigger,
  type ContractRegistry,
  createEntityPayloadWriter,
  type InferModal,
  type InferTerminal,
  type ModalPayload,
  parseModalSubmission,
  parseTerminalInput,
  type TerminalPayload,
  type ModalSubmissionContract,
  type TerminalInputContract,
} from "@/components/game/engine/runtime";

type AppRegistry = ContractRegistry & {
  modal: {
    routerSave: ModalSubmissionContract<{
      deviceId: string;
      dhcpEnabled: boolean;
      startIp: string;
      endIp: string;
    }>;
  };
  terminal: {
    shell: TerminalInputContract<{ command: string; args: string[] }>;
  };
  entity: {
    router: {
      data: { dhcpEnabled: boolean; startIp: string; endIp: string };
      state: Record<string, never>;
    };
  };
};

type RouterSaveValues = ModalPayload<AppRegistry, "routerSave">;
type ShellCommand = TerminalPayload<AppRegistry, "shell">;

// one-by-one usage if a single contract type is already in hand
type RouterSaveValuesOneByOne = InferModal<AppRegistry["modal"]["routerSave"]>;
type ShellCommandOneByOne = InferTerminal<AppRegistry["terminal"]["shell"]>;

type DeviceDataByType = {
  router: { dhcpEnabled: boolean; startIp: string; endIp: string };
};

const ROUTER_SAVE_CONTRACT: AppRegistry["modal"]["routerSave"] = {
  actionId: "save",
  modalIdStartsWith: "router-config-",
  parse: (values, event) => ({
    ok: true,
    value: {
      deviceId: event.modalId.replace("router-config-", ""),
      dhcpEnabled: values.dhcpEnabled === true,
      startIp: String(values.startIp ?? ""),
      endIp: String(values.endIp ?? ""),
    },
  }),
};

const TERMINAL_CONTRACT: AppRegistry["terminal"]["shell"] = {
  parse: (input) => {
    const trimmed = input.trim();
    if (!trimmed) return { ok: false, errors: ["empty command"] };
    const parts = trimmed.split(/\s+/);
    return { ok: true, value: { command: parts[0].toLowerCase(), args: parts.slice(1) } };
  },
};

// inside behavior handler
const modal = parseModalSubmission(event, ROUTER_SAVE_CONTRACT);
if (!modal || !modal.ok) return;
const payloadWriter = createEntityPayloadWriter<DeviceDataByType, Record<string, never>>(cmd);
payloadWriter.updateData(modal.value.deviceId, "router", {
  dhcpEnabled: modal.value.dhcpEnabled,
  startIp: modal.value.startIp,
  endIp: modal.value.endIp,
});

const terminalCmd = parseTerminalInput(event, TERMINAL_CONTRACT);
if (!terminalCmd || !terminalCmd.ok) return;
```

### 3.5 UI interaction ADTs

- **DrawerConfig**: id/space binding + placement/sizing behavior.
- **Arrow**: endpoints and style for board links.
- **Terminal state**: prompt/history/visibility via terminal provider hooks.

### 3.6 Validation currently guaranteed

Definition validation currently enforces:

- non-empty `meta.id`
- unique `spaces[*].config.id`
- valid `entities[*].initialSpace` references

Validation implementation:

- `src/components/game/internal/runtime/definition/validate.ts`
- `src/components/game/internal/runtime/definition/schema.ts`

## 4) API Reference (Canonical Contract)

### 4.1 Runtime module: `@/components/game/engine/runtime`

| Export | Contract | Usage example | Description | Side effects |
|---|---|---|---|---|
| `useQuestionRuntime` | `useQuestionRuntime(engineId, definition?)` | `useQuestionRuntime("dhcp-page", DHCP_DEFINITION)` | Main runtime entrypoint | validates definition, bootstraps once, consumes events, runs behaviors, manages scheduler |
| `bootstrapQuestion` | `bootstrapQuestion(definition, dispatch): void` | `bootstrapQuestion(def, dispatch)` | Deterministic bootstrap from definition | dispatches `SET_QUESTION`, `SET_PHASE`, `SPACE_CREATED`, `ENTITY_CREATED`, optional `ENTITY_ADDED` |
| `resolveQuestionPhase` | `resolveQuestionPhase(rules, context, currentPhase, fallback?)` | `resolveQuestionPhase(def.phaseRules, ctx, snapshot.phase, "setup")` | Resolve next phase from rules | none (pure) |
| `SpaceFactory` | `{ grid,pool,path,custom,queue,meter }` | `SpaceFactory.grid(config)` | Build typed `SpaceDefinition` entries | none (pure) |
| `EntityFactory` | `{ config,item,itemInSpace }` | `EntityFactory.itemInSpace(item, "inventory")` | Build typed `EntityDefinition` entries | none (pure) |
| `ConditionFactory` | `{ eq,flag,and,or,not }` | `ConditionFactory.eq("questionStatus", "completed")` | Build declarative conditions | none (pure) |
| `PhaseRuleFactory` | `{ set,retain }` | `PhaseRuleFactory.set(cond, "completed")` | Build declarative phase rules | none (pure) |
| `getEntitySpaceId` | `(state, entityId) => string \| null` | `getEntitySpaceId(state, "router-1")` | Find owning space for entity | none (pure) |
| `getSpaceEntityIds` | `(state, spaceId) => string[]` | `getSpaceEntityIds(state, "inventory")` | List entity IDs in a space | none (pure) |
| `isEntityInSpace` | `(state, entityId, spaceId) => boolean` | `isEntityInSpace(state, "pc-1", "pc-board")` | Membership check | none (pure) |
| `isItem` | type guard | `if (isItem(entity)) ...` | Narrow entity union to `ItemData` | none (pure) |
| `isGridSpace` | type guard | `if (isGridSpace(space)) ...` | Narrow space union to `GridSpaceData` | none (pure) |
| `buildEntityClickTrigger` | `(entityType?, spaceId?) => EventTrigger` | `buildEntityClickTrigger("router")` | Trigger factory for clicked entities | none (pure) |
| `buildModalSubmitTrigger` | `(modalId?, modalActionId?) => EventTrigger` | `buildModalSubmitTrigger("success", "primary")` | Trigger factory for modal submissions | none (pure) |
| `parseModalSubmission` | `(event, contract) => ParseResult \| null` | `parseModalSubmission(event, ROUTER_SAVE_CONTRACT)` | Parse and validate `MODAL_SUBMITTED` payload into typed values | none (pure) |
| `buildTerminalInputTrigger` | `(match?) => EventTrigger` | `buildTerminalInputTrigger(/^ping\s+/)` | Trigger factory for terminal input | none (pure) |
| `parseTerminalInput` | `(event, contract) => ParseResult \| null` | `parseTerminalInput(event, TERMINAL_CONTRACT)` | Parse and validate terminal command payloads into typed values | none (pure) |
| `buildEntityPlacedTrigger` | `(spaceId?, entityType?) => EventTrigger` | `buildEntityPlacedTrigger("router-board", "router")` | Trigger factory for enter-space events | none (pure) |
| `buildEntityArrivedTrigger` | `(spaceId?, entityType?) => EventTrigger` | `buildEntityArrivedTrigger("egress-path")` | Trigger factory for entered/moved arrival | none (pure) |
| `pickLane` | `(input) => LaneSelectionResult` | `pickLane(input)` | Lane scheduler policy helper | none (pure) |
| `createEntityReader` | `(cmd) => { find, byType, inSpace }` | `const read = createEntityReader(cmd)` | Typed entity read facade by id/type/space | none (pure) |
| `createEntityPayloadWriter` | `(cmd) => { updateData, updateState }` | `createEntityPayloadWriter<DataMap, StateMap>(cmd)` | Typed writer facade for dynamic `data` and `state` payload updates | dispatches via `cmd.patchEntity`/`cmd.patchEntityState` |

### 4.2 `cmd` object (from `useQuestionRuntime` or `ctx.cmd` inside handlers)

All mutations go through the single flat `cmd` surface.

#### Entity and Space Commands

| Method | Contract | Usage | Description | Side effects |
|---|---|---|---|---|
| `spawnEntity` | `(config) => RuntimeApiResult` | `cmd.spawnEntity(cfg)` | Create entity | dispatch `ENTITY_CREATED` |
| `patchEntity` | `(entityId, updates) => RuntimeApiResult` | `cmd.patchEntity(id, { data: ... })` | Patch entity | dispatch `ENTITY_UPDATED` |
| `patchEntityState` | `(entityId, state) => RuntimeApiResult` | `cmd.patchEntityState(id, { ip: ... })` | Patch dynamic state | dispatch `ENTITY_STATE_UPDATED` |
| `destroyEntities` | `(entityIds) => RuntimeApiResult` | `cmd.destroyEntities([id])` | Delete entities | dispatch `ENTITIES_DELETED` |
| `placeInSpace` | `(entityId, spaceId, position?) => RuntimeApiResult` | `cmd.placeInSpace(id, "inventory")` | Add entity to space | dispatch `ENTITY_ADDED` |
| `removeFromSpace` | `(entityId, spaceId) => RuntimeApiResult` | `cmd.removeFromSpace(id, "board")` | Remove entity from space | dispatch `ENTITY_REMOVED` |
| `moveEntity` | `(entityId, toSpaceId, position?) => RuntimeApiResult` | `cmd.moveEntity(id, "board")` | Move across spaces | dispatch `ENTITY_MOVED` or `ENTITY_ADDED` |
| `moveEntityToGrid` | `(entityId, spaceId) => RuntimeApiResult` | `cmd.moveEntityToGrid(id, "board")` | Move to first empty grid slot | may dispatch move/add; returns failure when invalid/full |

#### Interaction Commands

| Method | Contract | Usage | Description | Side effects |
|---|---|---|---|---|
| `openModal` | `(modal) => RuntimeApiResult` | `cmd.openModal(modal)` | Open modal | dispatch `OPEN_MODAL` |
| `closeModal` | `(modalId?) => RuntimeApiResult` | `cmd.closeModal("id")` | Close modal(s) | dispatch `CLOSE_MODAL` |
| `setPhase` | `(phase, source?) => RuntimeApiResult` | `cmd.setPhase("terminal", "rule")` | Request validated phase change | dispatch `SET_PHASE` on success; may emit warnings on invalid intents |
| `showTerminal` | `(visible) => RuntimeApiResult` | `cmd.showTerminal(true)` | Toggle terminal visibility flag | updates interaction state |
| `setModalGateOpen` | `(open) => RuntimeApiResult` | `cmd.setModalGateOpen(false)` | Toggle modal gate flag | updates interaction state |
| `dispatchIntent` | `(intent) => RuntimeApiResult` | `cmd.dispatchIntent(intent)` | Low-level execution-flow dispatch | same as setPhase path |

#### Progress Commands

| Method | Contract | Usage | Description | Side effects |
|---|---|---|---|---|
| `completeQuestion` | `() => RuntimeApiResult` | `cmd.completeQuestion()` | Mark question completed | dispatch `COMPLETE_QUESTION` |
| `setQuestionStatus` | `({ id, status? }) => RuntimeApiResult` | `cmd.setQuestionStatus({ id: "q1" })` | Set question metadata/status | dispatch `SET_QUESTION` |

#### Terminal Commands

| Method | Contract | Usage | Description | Side effects |
|---|---|---|---|---|
| `terminal.write` | `(content, type?) => void` | `cmd.terminal.write("output")` | Append to terminal | updates terminal provider |
| `terminal.clearHistory` | `() => void` | `cmd.terminal.clearHistory()` | Clear terminal history | updates terminal provider |
| `terminal.finish` | `() => void` | `cmd.terminal.finish()` | Signal terminal engine done | updates terminal provider |

### 4.3 Provider module: `@/components/game/engine/game-provider`

| Export | Contract | Usage example | Description | Side effects |
|---|---|---|---|---|
| `GameProvider` | `({ children, initialState? }) => JSX.Element` | `<GameProvider><Page/></GameProvider>` | Root provider for game state + supporting providers | mounts reducer + arrow/drawer/hint/terminal/drag providers |
| `useGameState` | `() => GameState` | `const state = useGameState()` | Read full game state | rerenders on state changes; throws outside provider |
| `useGameDispatch` | `() => Dispatch<Action>` | `const dispatch = useGameDispatch()` | Access reducer dispatcher | dispatch mutates state when called; throws outside provider |
| `useGameCtx` | `() => { state, dispatch }` | `const ctx = useGameCtx()` | Combined state + dispatch | combines above behaviors |
| `useEngineEvents` | `(engineId) => { events, cursor, ack }` | `useEngineEvents("terminal")` | Event-batch cursor reader | `ack()` dispatches `ACK_EVENTS` |
| `useDrawerManager` | `() => drawer manager` | `const { registerDrawer } = useDrawerManager()` | Register/control drawer instances | updates drawer store + drawer events |
| `useDrawerEvents` | `(drawerId?) => { events, cursor, ack }` | `useDrawerEvents("inventory")` | Read drawer-local event stream | manages drawer cursor state |
| `useEntity`, `useEntities`, `useEntitiesByType` | hooks | `useEntity("router-1")` | Entity reads | rerender on relevant state changes |
| `useEntityState`, `useEntityStateValue` | hooks | `useEntityStateValue(id, "ip")` | Entity state reads | rerender on relevant state changes |
| `useEntityExists`, `useEntitySpace`, `useEntityPosition` | hooks | `useEntitySpace(id)` | Presence/placement reads | rerender on relevant state changes |
| `useItem`, `useEntityIsDraggable`, `useEntityAllowedPlaces` | hooks | `useEntityAllowedPlaces(id)` | Item-specific reads | rerender on relevant state changes |
| `useSpace`, `useSpaces`, `useSpaceEntities` | hooks | `useSpace("inventory")` | Space reads | rerender on relevant state changes |
| `useSpaceIsFull`, `useSpaceIsEmpty`, `useSpaceCapacity`, `useEntityGridPosition` | hooks | `useSpaceCapacity("board")` | Capacity/position reads | rerender on relevant state changes |
| `findPoolItem` | `(groups, itemId) => Item \| null` | `findPoolItem(groups, id)` | Inventory lookup helper | none (pure) |

### 4.4 Engine module: `@/components/game/engine`

| Export | Contract | Usage example | Description | Side effects |
|---|---|---|---|---|
| `GameBoard` | component | `<GameBoard>...</GameBoard>` | Board wrapper with arrow/registry context | mounts board registration/arrow surfaces |
| `GridSpace` | component | `<GridSpace id="board" />` | Grid renderer with drop handling | dispatches placement/move actions; dev warning on missing space |
| `PoolSpace` | component | `<PoolSpace id="inventory" />` | Pool renderer and drag source | starts drag sessions; may dispatch return-to-pool move |
| `PathSpace` | component | `<PathSpace id="path-1" />` | Path transit renderer | drop moves/adds; midpoint update event; completion remove event |
| `CustomSpace` | component | `<CustomSpace id="x">...</CustomSpace>` | Custom layout container | registers board node; dev warning/null when invalid space |
| `DragOverlay` | component | `<DragOverlay getEntityLabel={...} />` | Drag preview overlay | tracks drag pointer/context |
| `Modal` | component | `<Modal />` | Modal renderer from `overlay.modals` | portal/focus/escape/backdrop dispatch handling |
| `DrawerLayout`, `DrawerPanel` | components | `<DrawerLayout drawerId="inventory">...</DrawerLayout>` | Drawer UI and event-aware layout | open/close/toggle reactions and drawer event acknowledgements |
| `PlacedEntity` | component | `<PlacedEntity ... />` | Entity presentation primitive | visual only |
| `ContextualHint` | component | `<ContextualHint />` | Hint bubble renderer | `aria-live` updates when content changes |
| `TerminalInput`, `TerminalLayout`, `TerminalView` | components | `<TerminalLayout ... />` | Terminal UI primitives | auto-focus, rendering, input event propagation |
| `DrawerProvider`, `useDrawerStore`, `useDrawerEvents` | provider/hooks | `<DrawerProvider>...</DrawerProvider>` | Standalone drawer state APIs | maintain drawer reducer/events |
| `HintProvider`, `useHintStore`, `useContextualHint` | provider/hooks | `useContextualHint(message)` | Hint state and delayed hint updates | timers and hint visibility updates |
| `TerminalProvider`, `useTerminalStore`, `useTerminalInput` | provider/hooks | `const input = useTerminalInput()` | Terminal state and command input controller | emits `TERMINAL_INPUT` via `EMIT_EVENTS` |
| `ArrowProvider`, `useBoardArrows`, `ArrowLayer`, `BoardArrowSurface`, `BoardRegistryProvider`, `useBoardRegistry` | provider/hooks/components | `useBoardArrows().setArrows([...])` | Arrow/registry surfaces | stores arrow list, tracks board nodes, renders arrow layer |
| `useDragEngine` | hook | `const drag = useDragEngine()` | Drag lifecycle engine | emits lifecycle events; optional auto-start |
| `useTerminalEngine` | hook | `useTerminalEngine({ onCommand })` | Terminal lifecycle engine | consumes terminal events, invokes callback, acks events |
| `useEngineProgress` | hook | `const engine = useEngineProgress()` | Generic lifecycle helper | emits `ENGINE_STARTED`/`ENGINE_FINISHED` |

## Capability quick map

| Intent | Use |
|---|---|
| Change phase from behavior | `ctx.cmd.setPhase(...)` |
| Complete question | `ctx.cmd.completeQuestion()` |
| Update entity data/state | `ctx.cmd.patchEntity(...)`, `ctx.cmd.patchEntityState(...)` |
| Typed entity data/state update | `createEntityPayloadWriter(...).updateData/.updateState` |
| Move entities between spaces | `ctx.cmd.placeInSpace(...)`, `ctx.cmd.moveEntity(...)`, `ctx.cmd.removeFromSpace(...)` |
| Handle modal submit | `buildModalSubmitTrigger(...)` + `parseModalSubmission(...)` + behavior handler |
| Handle terminal command | `buildTerminalInputTrigger(...)` + `parseTerminalInput(...)` + behavior handler |

## Troubleshooting quick map

| Symptom | Likely cause | Check |
|---|---|---|
| Space renders empty | Space ID mismatch or not bootstrapped | Section 3 + `QuestionDefinition.spaces` IDs |
| Rule never fires | Trigger mismatch or guard false | Section 3.4 + Section 4 runtime trigger builders |
| Entity cannot drop | `allowedPlaces`, capacity, or placement guard | Section 3.2 and 3.3 |
| Phase never changes | No explicit transition request on resolved phase | Section 2.3 and 4.2 |
| `ctx.snapshot` shows old state | Expected — snapshot is stale by design; listen for resulting event in next rule | Section 1.2 CQRS Contract |
