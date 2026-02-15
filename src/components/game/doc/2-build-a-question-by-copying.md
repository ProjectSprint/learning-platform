# 2) Build a Question by Copying (Step-by-Step)

This guide is the "copy and run" phase of onboarding.
Use it to get a working question quickly, then adapt from there.

For real examples, see `src/routes/questions/networking/dhcp/`.

Method-level runtime contracts are canonical in
`3.1-runtime-api-reference.md`. This file is the build workflow guide.

## File Structure

Every question follows this organization:

```
src/routes/questions/<category>/<question>/
  index.tsx              # Route handler (wraps page, handles navigation)
  -page.tsx              # Main game component
  -utils/
    constants.ts         # IDs, configs, inventory items
    definition.ts        # QuestionDefinition
    behaviors.ts         # BehaviorDefinition + rules
    modal-builders.ts    # ModalInstance factory functions
    entity-label.ts      # Display labels per entity type
    entity-badge.ts      # Status messages per entity type
    get-contextual-hint.ts   # Hint text based on game state
    selectors.ts             # Pure helpers to derive UI data from behaviorContext/state (optional)
```

---

## Step 1: Define Constants

Create `constants.ts` with all static configuration. This file has no runtime
dependencies and is imported by both definition and page.

```typescript
// -utils/constants.ts
import type { GridSpaceConfig, PoolSpaceConfig } from "@/components/game/domain/space";
import type { Item, TerminalEntry } from "@/components/game/game-provider";

export const QUESTION_ID = "my-question";
export const QUESTION_TITLE = "My Question Title";
export const QUESTION_DESCRIPTION = "Build a network topology";

// Space IDs — use a const object for type safety
export const SPACE_IDS = {
  board: "main-board",
  target: "target-zone",
} as const;

// Grid space configs
export const SPACE_CONFIGS: Record<string, GridSpaceConfig> = {
  [SPACE_IDS.board]: {
    id: SPACE_IDS.board,
    name: "Board",
    rows: 2,
    cols: 3,
    metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    maxCapacity: 6,
  },
  [SPACE_IDS.target]: {
    id: SPACE_IDS.target,
    name: "Target",
    rows: 1,
    cols: 1,
    metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    maxCapacity: 1,
  },
};

// Pool (inventory) config
export const INVENTORY_POOL_CONFIG: PoolSpaceConfig = {
  id: "inventory",
  name: "Items",
};

// Inventory items
export const INVENTORY_ITEMS: Item[] = [
  {
    id: "router-1",
    type: "router",
    name: "Router",
    allowedPlaces: ["inventory", SPACE_IDS.board],
    icon: { icon: "streamline-flex-color:router-wifi-network" },
    tooltip: { content: "A router connects devices in a network." },
  },
  {
    id: "pc-1",
    type: "pc",
    name: "PC-1",
    allowedPlaces: ["inventory", SPACE_IDS.target],
    icon: { icon: "twemoji:laptop-computer" },
  },
];

// Terminal config (optional)
export const TERMINAL_PROMPT = "Verify the connection using ping.";
export const TERMINAL_INTRO_ENTRIES: TerminalEntry[] = [
  { id: "intro-1", type: "output", content: "Commands: ping <ip>, help", timestamp: 0 },
];
```

**Key rules:**
- Entity `allowedPlaces` MUST include "inventory" AND the target space ID.
- Entity `type` is used by behaviors to match `entityClicked("router")`.
- Space `id` must be globally unique across all spaces.

---

## Step 2: Define Behaviors

Create `behaviors.ts` with event-driven interaction handlers. This is where
all game logic lives.

Naming reminder:

- Inside behavior handlers (`EffectContext`), use `interaction`.
- In page runtime (`useQuestionRuntime`), use `interactionSession`.

```typescript
// -utils/behaviors.ts
import type { TerminalInputEvent } from "@/components/game/application/state/types/events";
import type { BehaviorDefinition, BehaviorRule } from "@/components/game/runtime";
import { entityClicked, modalSubmitted, terminalInput, whenEntityPlacedInSpace } from "@/components/game/runtime";
import { buildConfigModal, buildSuccessModal } from "./modal-builders";

// Context type — tracks cross-rule state
export type MyBehaviorContext = {
  navigateAway: boolean;          // Signals page to call onQuestionComplete
  lastConfiguredId: string | null; // Track last configured entity
};

const rules: BehaviorRule<MyBehaviorContext>[] = [
  // Handle entity click → open config modal
  {
    id: "my.entity-click",
    on: entityClicked("router"),
    handler: ({ entity, interaction }) => {
      if (!entity) return;
      interaction.openModal(buildConfigModal(entity.id, entity.data));
    },
  },

  // Handle modal save → update entity
  {
    id: "my.config-save",
    on: modalSubmitted(undefined, "save"),
    guard: ({ event }) =>
      event.type === "MODAL_SUBMITTED" && event.modalId.startsWith("config-"),
    handler: ({ event, world, updateContext }) => {
      if (event.type !== "MODAL_SUBMITTED") return;
      const entityId = event.modalId.replace("config-", "");
      world.updateEntity(entityId, {
        data: { configured: true, ip: String(event.values.ip ?? "") },
      });
      updateContext(ctx => { ctx.lastConfiguredId = entityId; });
    },
  },

  // Handle terminal command (active phase only)
  {
    id: "my.terminal-command",
    on: terminalInput(),
    guard: ({ phase, state }) =>
      phase === "terminal" && state.question.status !== "completed",
    handler: ({ event, state, terminal, interaction, progress }) => {
      const input = (event as TerminalInputEvent).input.trim().toLowerCase();

      if (input === "help") {
        terminal.writeOutput("Commands: ping <ip>, help");
        return;
      }

      if (input.startsWith("ping ")) {
        const target = input.split(" ")[1];
        const expectedIp = state.entities["pc-1"]?.state.ip as string | null;
        if (expectedIp && target === expectedIp) {
          terminal.writeOutput(`Reply from ${target}: bytes=32 time<1ms TTL=64`);
          interaction.openModal(buildSuccessModal());
          terminal.finishEngine();
          progress.completeQuestion();
          return;
        }
        terminal.writeOutput(`Error: Host ${target} unreachable`, "error");
        return;
      }

      terminal.writeOutput("Unknown command. Type 'help'.", "error");
    },
  },

  // Terminal input when not in terminal phase
  {
    id: "my.terminal-not-ready",
    on: terminalInput(),
    guard: ({ phase }) => phase !== "terminal",
    handler: ({ terminal }) => {
      terminal.writeOutput("Terminal is not ready yet.", "error");
    },
  },

  // Handle success modal → navigate away
  {
    id: "my.success-navigate",
    on: modalSubmitted("success", "primary"),
    handler: ({ updateContext }) => {
      updateContext(ctx => { ctx.navigateAway = true; });
    },
  },

  // Deferred side effects with keyed scheduler (replaces raw setTimeout)
  {
    id: "my.delayed-reset",
    on: whenEntityPlacedInSpace("transit"),
    handler: ({ event, schedule }) => {
      if (event.type !== "ENTITY_ENTERED_SPACE") return;
      schedule(`reset:${event.entityId}`, 1200, (sctx) => {
        sctx.world.removeFromSpace(event.entityId, "transit");
      });
    },
  },
];

export const MY_BEHAVIORS: BehaviorDefinition<MyBehaviorContext> = {
  initialContext: { navigateAway: false, lastConfiguredId: null },
  rules,
};
```

**Rule ordering matters:**
- Put specific guards before general ones (e.g. terminal-command before terminal-not-ready).
- First matching rule wins per event.
- Prefer `schedule`/`cancelSchedule` for deferred effects so runtime owns timer cleanup.

---

## Step 3: Create QuestionDefinition

Create `definition.ts` that assembles constants and behaviors into a
QuestionDefinition.

```typescript
// -utils/definition.ts
import type { QuestionDefinition } from "@/components/game/runtime";
import { MY_BEHAVIORS, type MyBehaviorContext } from "./behaviors";
import {
  INVENTORY_ITEMS,
  INVENTORY_POOL_CONFIG,
  QUESTION_DESCRIPTION,
  QUESTION_ID,
  QUESTION_TITLE,
  SPACE_CONFIGS,
} from "./constants";

export type MyConditionKey = "dragStatus" | "questionStatus";

export const MY_DEFINITION: QuestionDefinition<MyConditionKey, MyBehaviorContext> = {
  meta: {
    id: QUESTION_ID,
    title: QUESTION_TITLE,
    description: QUESTION_DESCRIPTION,
  },
  initialPhase: "setup",
  spaces: [
    ...Object.values(SPACE_CONFIGS).map(config => ({
      kind: "grid" as const,
      config,
    })),
    { kind: "pool" as const, config: INVENTORY_POOL_CONFIG },
  ],
  entities: INVENTORY_ITEMS.map(item => ({
    config: {
      id: item.id,
      name: item.name,
      icon: item.icon,
      tooltip: item.tooltip,
      allowedPlaces: item.allowedPlaces,
      data: { ...item.data, type: item.type },
    },
    initialSpace: "inventory",
  })),
  phaseRules: [
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "started" }, to: "playing" },
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "finished" }, to: "terminal" },
    { kind: "set", when: { kind: "eq", key: "questionStatus", value: "completed" }, to: "completed" },
  ],
  behaviors: MY_BEHAVIORS,
};
```

**Important:** Entity `data.type` is what becomes `entity.type`. Include
`data: { type: item.type }` in entity config.

---

## Step 4: Create Modal Builders

Create `modal-builders.ts` with factory functions for each modal type.

```typescript
// -utils/modal-builders.ts
import type { ModalInstance } from "@/components/game/presentation/modal";

export const buildConfigModal = (
  entityId: string,
  currentData: Record<string, unknown>,
): ModalInstance => ({
  id: `config-${entityId}`,
  title: "Router Configuration",
  content: [
    { kind: "field", field: { id: "dhcpEnabled", kind: "checkbox", label: "Enable DHCP" } },
    { kind: "field", field: { id: "startIp", kind: "text", label: "Start IP", placeholder: "192.168.1.10" } },
    { kind: "field", field: { id: "endIp", kind: "text", label: "End IP", placeholder: "192.168.1.50" } },
  ],
  actions: [
    { id: "save", label: "Save", variant: "primary", validate: true },
    { id: "cancel", label: "Cancel", closesModal: true },
  ],
  initialValues: {
    dhcpEnabled: currentData.dhcpEnabled ?? false,
    startIp: currentData.startIp ?? "",
    endIp: currentData.endIp ?? "",
  },
});

export const buildSuccessModal = (
  title = "Congratulations!",
  message = "You completed the question!",
  buttonLabel = "Continue",
): ModalInstance => ({
  id: "success",
  title,
  content: [{ kind: "text", text: message }],
  actions: [
    { id: "primary", label: buttonLabel, variant: "primary" },
  ],
  blocking: true,
});
```

**Modal ID convention:** Use `config-{entityId}` pattern so behaviors can
extract the entity ID from `event.modalId.replace("config-", "")`.

**closesModal vs regular actions:**
- Button click emits `MODAL_SUBMITTED` first.
- If `closesModal !== false` (default), reducer close path runs after submit and
  emits `MODAL_CLOSED`.
- Use `closesModal: false` when you need submit-without-closing behavior.
- Use `closesModal: true` explicitly for readability on Cancel buttons.

---

## Step 5: Create Entity Label/Badge Helpers

```typescript
// -utils/entity-label.ts
export const getEntityLabel = (entityType: string): string => {
  const labels: Record<string, string> = {
    router: "Router",
    pc: "PC",
    cable: "Cable",
  };
  return labels[entityType] ?? entityType;
};

// -utils/entity-badge.ts
import type { SpaceItemLocation } from "@/components/game/game-provider";

export const getStatusMessage = (item: SpaceItemLocation): string | null => {
  if (item.type === "router") {
    if (item.status === "success") return "configured";
    if (item.status === "warning") return "needs config";
  }
  if (item.type === "pc") {
    const ip = item.data?.ip;
    if (typeof ip === "string" && ip) return ip;
    return "no ip";
  }
  return null;
};
```

---

## Step 6: Create Contextual Hints

```typescript
// -utils/get-contextual-hint.ts
type HintState = {
  hasRouter: boolean;
  routerConfigured: boolean;
  allPlaced: boolean;
  phase: string;
};

export const getContextualHint = (state: HintState): string | null => {
  if (!state.hasRouter) return "Drag a router to the board";
  if (!state.routerConfigured) return "Click the router to configure it";
  if (!state.allPlaced) return "Place all devices on the board";
  if (state.phase === "terminal") return "Use the terminal to verify connectivity";
  return null;
};
```

---

## Step 7: Build the Page Component

The page component wires everything together. It should be thin — all game
logic lives in behaviors.

```tsx
// -page.tsx
import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { type ConditionContext, resolvePhase } from "@/components/game/domain/question";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import { type Arrow, GameProvider, useDrawerManager, useGameCtx } from "@/components/game/game-provider";
import { DrawerLayout } from "@/components/game/presentation/drawer";
import { ContextualHint, useContextualHint } from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import { useBoardArrows } from "@/components/game/presentation/space/arrow";
import {
  TerminalInput, TerminalLayout, TerminalView,
  useTerminalInput, useTerminalStore,
} from "@/components/game/presentation/terminal";
import { useQuestionRuntime } from "@/components/game/runtime";
import type { QuestionProps } from "@/components/module";
import { MY_DEFINITION, type MyConditionKey } from "./-utils/definition";
import { getEntityLabel } from "./-utils/entity-label";
import { SPACE_CONFIGS, INVENTORY_POOL_CONFIG, TERMINAL_PROMPT } from "./-utils/constants";

// ── Exported route component ──

export const MyQuestion = ({ onQuestionComplete }: QuestionProps) => (
  <GameProvider>
    <MyPage onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);

// ── Internal page component ──

const DRAWER_ID = "inventory-drawer";

const MyPage = ({ onQuestionComplete }: { onQuestionComplete: () => void }) => {
  // 1. Initialize runtime (bootstraps state, activates behaviors)
  const {
    world,
    interactionSession,
    state,
    behaviorContext,
    isCompleted,
    registerTerminalFinish,
  } = useQuestionRuntime("my-page", MY_DEFINITION);

  const gameCtx = useGameCtx();
  const dragEngine = useDragEngine();
  const terminalEngine = useTerminalEngine({});
  const terminalInput = useTerminalInput();
  const { terminal, openTerminal, closeTerminal, setPrompt } = useTerminalStore();
  const { registerDrawer } = useDrawerManager();
  const { setArrows, clearArrows } = useBoardArrows();

  // 2. Wire terminal finish to behavior system
  registerTerminalFinish.current = terminalEngine.finish;

  // 3. Register drawer
  useLayoutEffect(() => {
    registerDrawer({
      id: DRAWER_ID,
      contentType: "space",
      spaceId: "inventory",
      title: "Items",
      position: "bottom",
      initialState: "expanded",
      expandedSize: { base: "65vh", md: "40vh" },
      mouseAware: true,
      showFloatingButton: true,
      floatingButtonLabel: "Items",
    });
  }, [registerDrawer]);

  // 4. Navigate away when behavior signals
  useEffect(() => {
    if (behaviorContext.navigateAway) {
      onQuestionComplete();
    }
  }, [behaviorContext.navigateAway, onQuestionComplete]);

  // 5. Phase management (resolve declarative phase rules)
  useEffect(() => {
    const context: ConditionContext<MyConditionKey> = {
      dragStatus: dragEngine.progress.status,
      questionStatus: state.question.status,
    };
    const resolved = resolvePhase(
      MY_DEFINITION.phaseRules, context, state.phase, "setup",
    );
    if (state.phase !== resolved.nextPhase) {
      interactionSession.requestPhaseTransition(resolved.nextPhase, "my.phase_rules");
    }
  }, [dragEngine.progress.status, interactionSession, state.phase, state.question.status]);

  // 6. Terminal visibility
  const shouldShowTerminal = state.phase === "terminal" || state.phase === "completed";
  useEffect(() => {
    if (shouldShowTerminal && !terminal.visible) openTerminal();
    if (!shouldShowTerminal && terminal.visible) closeTerminal();
  }, [shouldShowTerminal, terminal.visible, openTerminal, closeTerminal]);

  // 7. Terminal prompt
  useEffect(() => {
    setPrompt(TERMINAL_PROMPT);
    closeTerminal();
  }, [setPrompt, closeTerminal]);

  // 8. Contextual hint
  const hint = useMemo(() => {
    // Derive hint from state...
    return null;
  }, []);
  useContextualHint(hint);

  // 9. Arrows (optional)
  const arrows = useMemo<Arrow[]>(() => [
    {
      id: "board-to-target",
      from: { spaceId: "main-board", anchor: { base: "br", lg: "tr" } },
      to: { spaceId: "target-zone", anchor: { base: "tl" } },
      style: { stroke: "rgba(56, 189, 248, 0.85)", strokeWidth: 2, headSize: 12, bow: 0.1 },
    },
  ], []);
  useEffect(() => { setArrows(arrows); return () => clearArrows(); }, [arrows, setArrows, clearArrows]);

  // 10. Entity callbacks
  const labelFn = useCallback((entity: EntityData) => getEntityLabel(entity.type), []);
  const isClickable = useCallback((entity: EntityData) => entity.type === "router", []);

  // 11. Render
  return (
    <Box as="main" display="flex" flexDirection="column" bg="gray.950" color="gray.100">
      <Flex direction="column" px={{ base: 4, md: 12 }} py={{ base: 4, md: 6 }}>
        <Text fontSize="2xl" fontWeight="bold">{MY_DEFINITION.meta.title}</Text>
        <Text fontSize="sm" color="gray.400">{MY_DEFINITION.meta.description}</Text>

        <GameBoard>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            {Object.values(SPACE_CONFIGS).map(config => (
              <GridItem key={config.id}>
                <GridSpace
                  ctx={gameCtx}
                  config={config}
                  getEntityLabel={labelFn}
                  isEntityClickable={isClickable}
                />
              </GridItem>
            ))}
          </Grid>

          <ContextualHint />
          <DragOverlay getEntityLabel={getEntityLabel} />
          <DrawerLayout drawerId={DRAWER_ID}>
            <PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
          </DrawerLayout>
        </GameBoard>

        <TerminalLayout
          visible={terminal.visible}
          focusRef={terminalInput.inputRef}
          view={<TerminalView history={terminal.history} prompt={terminal.prompt} isCompleted={isCompleted} />}
          input={
            <TerminalInput
              value={terminalInput.value}
              onChange={terminalInput.onChange}
              onKeyDown={terminalInput.onKeyDown}
              inputRef={terminalInput.inputRef}
              placeholder={isCompleted ? "Terminal disabled" : "Type a command"}
              disabled={isCompleted}
            />
          }
        />
      </Flex>
      <Modal />
    </Box>
  );
};
```

---

## Step 8: Create Route Handler

```tsx
// index.tsx
import { useNavigate } from "@tanstack/react-router";
import { MyQuestion } from "./-page";

const MyQuestionRoute = () => {
  const navigate = useNavigate();
  const handleComplete = () => {
    markQuestionComplete("my-question");
    void navigate({ to: "/questions/next" });
  };
  return <MyQuestion onQuestionComplete={handleComplete} />;
};

export default MyQuestionRoute;
```

---

## Lifecycle Summary

```
Mount
  │
  ├── GameProvider creates reducer + nested providers
  │
  ├── useQuestionRuntime("my-page", DEFINITION)
  │     ├── validates definition (throws if invalid)
  │     ├── bootstrapQuestion(definition, dispatch) → dispatches:
  │     │     SET_QUESTION, SET_PHASE, SPACE_CREATED×N, ENTITY_CREATED×N, ENTITY_ADDED×K (entities with initialSpace only)
  │     └── useBehaviorReactor() starts watching events
  │
  ├── useLayoutEffect: registerDrawer() → drawer ready
  ├── useEffect: setPrompt(), closeTerminal() → terminal initialized
  ├── useEffect: setArrows() → arrows drawn
  │
  User drags item from pool → engine dispatches ENTITY_MOVED
  │
  ├── Behavior reactor matches event → runs handler
  │     (e.g. entityClicked → openModal → MODAL_SUBMITTED → updateEntity)
  │
  ├── useEffect: resolvePhase() → requestPhaseTransition() if phase changed
  │
  ├── Phase reaches "terminal" → openTerminal()
  │     User types command → TERMINAL_INPUT event → behavior handler
  │     Handler calls terminal.writeOutput(), progress.completeQuestion()
  │
  ├── Behavior opens success modal → user clicks Continue
  │     MODAL_SUBMITTED → handler sets navigateAway = true
  │
  └── useEffect: behaviorContext.navigateAway → onQuestionComplete()
```

---

## Bootstrap-Safe + Behavior-First Checklist

Before finalizing a question, validate these two architectural constraints:

1. **Bootstrap-safe rendering**
   - Space-dependent UI does not assume spaces exist on the first render.
   - Complex board sections are gated by a minimal readiness condition
     (`state.spaces.<id>` checks) when needed.
2. **Behavior-first gameplay logic**
   - Rule decisions and state mutations live in behavior handlers.
   - Page-level effects focus on orchestration, not domain rule branching.

This keeps flow deterministic and avoids split-brain logic between `useEffect`
and behavior rules.

---

## Checklist for New Questions

- [ ] `constants.ts` — Space IDs, configs, inventory items, terminal config
- [ ] `behaviors.ts` — BehaviorDefinition with all interaction rules
- [ ] `definition.ts` — QuestionDefinition assembling constants + behaviors
- [ ] `modal-builders.ts` — Factory functions for each modal type
- [ ] `entity-label.ts` — Display labels per entity type
- [ ] `entity-badge.ts` — Status messages per entity type (optional)
- [ ] `get-contextual-hint.ts` — Hint logic based on game state (optional)
- [ ] `-page.tsx` — Page component with runtime, drawer, terminal, arrows
- [ ] `index.tsx` — Route handler with navigation
- [ ] Entity `allowedPlaces` includes "inventory" and target space
- [ ] Entity `data.type` is set for behavior trigger matching
- [ ] Phase rules ordered for resolver semantics: broad/default first, overrides later (last matching `set` wins)
- [ ] Bootstrap-safe render guard applied if board contains dynamic custom/grid spaces
- [ ] Gameplay rule mutations are behavior-driven (page effects are orchestration-only)
- [ ] All imported game methods are documented in `3.1-runtime-api-reference.md` (no undocumented helper reliance)
- [ ] `registerTerminalFinish.current = terminalEngine.finish` wired
- [ ] `behaviorContext.navigateAway` watched in useEffect
- [ ] `<Modal />` rendered (outside GameBoard is fine)
- [ ] Quality gates: `pnpm check:tsc` and `pnpm check:biome`
