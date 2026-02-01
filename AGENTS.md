# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

<!-- END BEADS INTEGRATION -->

## Task Creation
When creating a task, each task should:
- Assumed that the one that will work on it, ISN'T YOU, but someone else, so be holistic about the context
- Fulfill the principles
    - Maintainability
    - Usability
    - Accessiblity
    - Performance
    - Scalablity
    - Security
    - Reliability
- Document
    - Problem that we're trying to solve
    - References of the problem
    - Goal
    - Detailed task description
    - What to do
    - Do's and don't
    - References to related files
    - Current progress
    - `pnpm check:biome` and `pnpm check:tsc`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Verify** - All changes committed AND pushed
5. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git commit` succeeds
- NEVER stop before commit - that leaves work stranded locally
- If commit fails, resolve and retry until it succeeds
- I code alongside you, so if there's unrelated changes, it's from me
- You will often get get limited by the token limit midway, so update the progress frequently
- If midway you found task that could be split midway, then split it by creating a new task and update the existing

## Knowledge Updates (2026-02-01)

### FP Migration Complete (Phases 0-7)

The game architecture has been fully migrated from OOP classes to **plain data + pure functions**.

**Old OOP patterns (DEPRECATED):**
```typescript
// DON'T use these patterns anymore
const space = new GridSpace({ id: "...", rows: 4, cols: 6 });
space.add(entity, position);
const pos = space.getPosition(entityId);
```

**New FP patterns (CURRENT):**
```typescript
// ✅ Use factory functions
import { createGridSpaceData } from "@/components/game/domain/space/space-fns";

const space = createGridSpaceData({
  id: "...",
  name: "...",
  rows: 4,
  cols: 6,
  metrics: {
    cellWidth: 64,
    cellHeight: 64,
    gapX: 4,
    gapY: 4,
  },
  maxCapacity: 1,
});

// ✅ Use domain functions (inside Immer reducers)
import { gridAdd, gridGetPosition, gridContains } from "@/components/game/domain";

gridAdd(space, entityId, position);
const pos = gridGetPosition(space, entityId);
const hasEntity = gridContains(space, entityId);
```

**Key FP Patterns:**

1. **Space Data Types** (discriminated union):
   - `GridSpaceData` - 2D grid layouts with `kind: "grid"`
   - `PoolSpaceData` - Unordered collections with `kind: "pool"`
   - Type guards: `isGridSpace()`, `isPoolSpace()`
   - Factory: `createGridSpaceData()`, `createPoolSpaceData()`

2. **Entity Data Types**:
   - `EntityData` - Base entity type
   - `ItemData` - Item subtype with allowedPlaces
   - Factory: `createEntityData()`, `createItemData()`
   - Type guard: `isItemData()`

3. **Space Functions** (all in `src/components/game/domain/space/space-fns.ts`):
   - `gridAdd()`, `gridRemove()`, `gridContains()`, `gridGetPosition()`
   - `gridCanAccept()`, `gridGetEntitiesAt()`, `gridIsOccupied()`
   - `poolAdd()`, `poolRemove()`, `poolContains()`
   - Polymorphic: `spaceContains()`, `spaceRemove()`, `spaceGetEntityCount()`

4. **Entity Functions** (all in `src/components/game/domain/entity/entity-fns.ts`):
   - `getEntityStateValue()`, `setEntityStateValue()`, `updateEntityState()`
   - `resetEntityState()`, `cloneEntityData()`, `cloneItemData()`
   - `isDraggable()`, `canPlaceIn()`, `isInCategory()`
   - `getItemTooltip()`, `getItemIcon()`

5. **In Immer Reducers** (space functions mutate drafts):
```typescript
import { produce } from "immer";
import { gridAdd, isGridSpace } from "@/components/game/domain/space";

const reducer = produce((draft: GameState, action: Action) => {
  switch (action.type) {
    case "ADD_ENTITY": {
      const space = draft.spaces[action.payload.spaceId];
      if (space && isGridSpace(space)) {
        gridAdd(space, action.payload.entityId, action.payload.position);
      }
      break;
    }
  }
});
```

6. **Networking Questions - Direct GridSpaceData**:
   - Networking questions define `CANVAS_CONFIGS` as `Record<string, GridSpaceData>`
   - Each config uses `createGridSpaceData()` directly with `rows`, `cols`, and `metrics`
   - Example (from `src/routes/questions/networking/dhcp/-utils/constants.ts`):
   ```typescript
   export const CANVAS_CONFIGS: Record<string, GridSpaceData> = {
     pc1: createGridSpaceData({
       id: "pc-1-board",
       name: "PC-1",
       rows: 1,
       cols: 1,
       metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
       maxCapacity: 1,
     }),
     // ...
   };
   ```

**Documentation Updated:**
- `src/components/game/doc/09-space-architecture.md` - Explains FP data-first approach
- `src/components/game/doc/10-adding-new-spaces.md` - How to add new space types with discriminated unions
- `src/components/game/doc/07-usage-guide.md` - All examples use FP patterns

### Declarative Game Engine (Post-Refactoring)

After FP migration (Phases 3-4), the game engine now uses a **declarative API** that eliminates ~200 lines of adapter boilerplate per question.

**Key Components:**

1. **GameBoard** - Top-level wrapper providing:
   - DragProvider (drag-and-drop context)
   - BoardArrowSurface (arrow visualization layer)

2. **GridSpace** - Declarative wrapper for GridSpaceView:
   - Integrates with `useGameState()` and `useGameDispatch()`
   - Auto-handles entity clicks, drag actions
   - Renders space title and grid cells

3. **PoolSpace** - Declarative wrapper for PoolSpaceView:
   - Displays inventory items
   - Auto-handles drag initiation

**Quick Example:**

```tsx
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";

const MyQuestion = () => {
  const dispatch = useGameDispatch();
  const state = useGameState();

  const handleEntityClick = (entity: EntityData) => {
    dispatch({ type: "OPEN_MODAL", payload: buildModal(entity.id) });
  };

  const isEntityClickable = (entity: EntityData) =>
    ["router", "pc"].includes(entity.type);

  return (
    <Box>
      <GameBoard>
        <Grid templateAreas={{ base: `"pc1 pc2 pc3"` }}>
          {CANVAS_ORDER.map((canvasId) => (
            <GridItem key={canvasId} area={canvasId}>
              <GridSpace
                spaceId={canvasId}
                title={config.name ?? canvasId}
                onEntityClick={handleEntityClick}
                isEntityClickable={isEntityClickable}
              />
            </GridItem>
          ))}
        </Grid>
        <PoolSpace title="Inventory" />
        <ContextualHint />
        <DragOverlay getEntityLabel={(type) => type} />
      </GameBoard>
    </Box>
  );
};
```

**Props Reference:**

| Component | Prop | Type | Required | Description |
|-----------|------|------|----------|-------------|
| GridSpace | spaceId | string | ✅ | Space ID to render from state |
| GridSpace | title | string | ❌ | Display name (defaults to spaceId) |
| GridSpace | onEntityClick | (entity: EntityData) => void | ❌ | Click handler for entities |
| GridSpace | isEntityClickable | (entity: EntityData) => boolean | ❌ | Check if entity is clickable |

| Component | Prop | Type | Required | Description |
|-----------|------|------|----------|-------------|
| PoolSpace | title | string | ❌ | Display name |

**Migration Pattern (for legacy questions):**

**Before (with adapters):**
```tsx
// ~200 lines of adapter boilerplate
const GridSpaceAdapter = ({ config, onItemClick }: { ... }) => { /* ... */ };
const InventoryAdapter = ({ onItemClick }: { ... }) => { /* ... */ };

<DragProvider>
  <Grid templateAreas={{ ... }}>
    <GridArea pc1>
      <GridSpaceAdapter config={config.pc1} onItemClick={onItemClick} />
    </GridArea>
  </Grid>
  <Box mt={4}>
    <InventoryGroup>
      <InventoryAdapter onItemClick={onItemClick} />
    </InventoryGroup>
  </Box>
</DragProvider>
```

**After (declarative):**
```tsx
// No adapters needed
<GameBoard>
  <Grid templateAreas={{ ... }}>
    {CANVAS_ORDER.map((canvasId) => (
      <GridItem key={canvasId} area={canvasId}>
        <GridSpace spaceId={canvasId} title={config.name} />
      </GridItem>
    ))}
  </Grid>
  <PoolSpace title="Inventory" />
</GameBoard>
```

**Action Types (for drag-drop):**

- `ADD_ENTITY_TO_SPACE` - Place entity into space
- `MOVE_ENTITY_BETWEEN_SPACES` - Drag entity between spaces
- `UPDATE_ENTITY_POSITION` - Update entity position in grid

**Note:** Adapters are **no longer needed**. All game state integration and drag logic is handled by GameBoard, GridSpace, and PoolSpace components.
