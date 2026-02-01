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
import { createGridSpaceData, createEntityData } from "@/components/game/domain";

const space = createGridSpaceData({
  id: "...",
  layout: {
    size: { rows: 4, cols: 6 },
    cellSize: { width: 64, height: 64 },
    gap: { x: 4, y: 4 },
  },
});

const entity = createEntityData({
  id: "router-1",
  type: "router",
  name: "Router A",
  visual: { icon: "router-icon" },
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

6. **Networking Questions - Shared Helper**:
   - `src/routes/questions/networking/-utils/grid-space.ts` provides:
     - `createGridCanvasConfig()` - Creates GridSpaceData from grid dimensions
     - `createPuzzleConfigs()` - Derives CANVAS_PUZZLES from CANVAS_CONFIGS
   - Networking questions define `CANVAS_CONFIGS` as GridSpace configs

**Documentation Updated:**
- `src/components/game/doc/09-space-architecture.md` - Explains FP data-first approach
- `src/components/game/doc/10-adding-new-spaces.md` - How to add new space types with discriminated unions
- `src/components/game/doc/07-usage-guide.md` - All examples use FP patterns
