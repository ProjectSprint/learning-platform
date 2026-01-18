# Canvas Refactor Plan: Multi-Canvas, Shared State, and Orientation

## Quick Reference: Key Line Numbers

These are exact locations for major changes. Use these for quick navigation:

| File | Function/Type | Lines | What to do |
|------|---------------|-------|-----------|
| `game-provider.tsx` | CanvasConfig | 25-33 | Add `orientation` prop |
| `game-provider.tsx` | Connection type | 64-70 | Copy location, add CrossCanvasConnection after |
| `game-provider.tsx` | GameState | 108-117 | Add `crossConnections` and `sharedZone` |
| `game-provider.tsx` | GameAction | 127-189 | Add 6 new action types |
| `game-provider.tsx` | createDefaultState | ~203 | Search for it, add new state properties |
| `game-provider.tsx` | reducer switch | 485-911 | Add 5 new case handlers |
| `game-provider.tsx` | useGameState | 936 | Copy after, add 5 selector hooks at line 955+ |
| `play-canvas.tsx` | Grid rendering | 731-737 | Add orientation logic |
| `drag-context.tsx` | DragState type | Early (search) | Add 2 properties |

---

## Overview

This refactor removes `GameLayout` and gives questions full control over canvas layout. It adds support for:
- Multiple canvases per question with question-defined layout
- Cross-canvas shared state (connections, data zone, item transfer)
- Question-level validation across all canvases
- Canvas orientation (horizontal/vertical)

---

## File Inventory

### Files to MODIFY
| File | Purpose |
|------|---------|
| `src/components/game/game-provider.tsx` | Add shared state, cross-canvas connections, orientation |
| `src/components/game/play-canvas.tsx` | Add orientation prop, expose as standalone component |
| `src/components/game/inventory-panel.tsx` | Make usable without GameLayout |
| `src/components/game/terminal-panel.tsx` | Make usable without GameLayout |
| `src/components/game/drag-context.tsx` | Support cross-canvas drag |
| `src/components/game/drag-overlay.tsx` | Support cross-canvas drag |
| `src/routes/questions/networking/internet/-page.tsx` | Migrate from GameLayout |
| `src/routes/questions/networking/dhcp/-page.tsx` | Migrate from GameLayout |

### Files to DELETE
| File | Reason |
|------|--------|
| `src/components/game/game-layout.tsx` | Questions will own their layout |
| `src/components/game/game-layout.md` | Documentation for deleted file |

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/components/game/game-shell.tsx` | Minimal wrapper for DragProvider, OverlayLayer, DragOverlay |
| `src/components/game/shared-zone.tsx` | Shared data zone component |

---

## Part 1: Type Changes in game-provider.tsx

### 1.1 Add Orientation to CanvasConfig

**Location**: `src/components/game/game-provider.tsx` lines 25-33

**Current type**:
```typescript
export type CanvasConfig = {
    id: string;
    columns: number;
    rows: number;
    stateKey?: string;
    allowedItemTypes?: string[];
    maxItems?: number;
    initialPlacements?: Placement[];
};
```

**Add this property** after `rows`:
```typescript
orientation?: 'horizontal' | 'vertical';
```

**Default value**: `'horizontal'`

**What orientation means**:
- `horizontal`: Items flow left-to-right. Grid is wider than tall. This is the DEFAULT.
- `vertical`: Items flow top-to-bottom. Grid is taller than wide.

The orientation affects:
1. How the CSS grid renders (already handled by columns/rows)
2. How auto-connections are made between adjacent items
3. Visual hints for the user

---

### 1.2 Add Cross-Canvas Connection Type

**Location**: `src/components/game/game-provider.tsx` after line 70 (after Connection type)

**Add new type**:
```typescript
export type CrossCanvasConnection = {
    id: string;
    type: 'cable' | 'wireless';
    from: {
        canvasKey: string;  // stateKey of source canvas
        x: number;
        y: number;
    };
    to: {
        canvasKey: string;  // stateKey of target canvas
        x: number;
        y: number;
    };
    cableId?: string;
};
```

---

### 1.3 Add SharedZone Type

**Location**: `src/components/game/game-provider.tsx` after CrossCanvasConnection type

**Add new type**:
```typescript
export type SharedZoneItem = {
    id: string;
    key: string;           // unique key for the data
    value: unknown;        // the actual data
    sourceCanvas?: string; // which canvas set this (optional)
    timestamp: number;     // when it was set
};

export type SharedZoneState = {
    items: Record<string, SharedZoneItem>;
};
```

---

### 1.4 Modify GameState Type

**Location**: `src/components/game/game-provider.tsx` lines 108-117

**Current type**:
```typescript
export type GameState = {
    phase: GamePhase;
    inventory: { items: InventoryItem[] };
    canvas: CanvasState;
    canvases?: Record<string, CanvasState>;
    terminal: TerminalState;
    overlay: OverlayState;
    question: { id: string; status: QuestionStatus };
    sequence: number;
};
```

**Add these properties** after `canvases`:
```typescript
crossConnections: CrossCanvasConnection[];
sharedZone: SharedZoneState;
```

**Updated type**:
```typescript
export type GameState = {
    phase: GamePhase;
    inventory: { items: InventoryItem[] };
    canvas: CanvasState;
    canvases?: Record<string, CanvasState>;
    crossConnections: CrossCanvasConnection[];
    sharedZone: SharedZoneState;
    terminal: TerminalState;
    overlay: OverlayState;
    question: { id: string; status: QuestionStatus };
    sequence: number;
};
```

---

### 1.5 Add New Actions to GameAction Type

**Location**: `src/components/game/game-provider.tsx` after line 189 (inside GameAction union)

**Add these action types**:

```typescript
| {
    type: 'MAKE_CROSS_CONNECTION';
    payload: {
        from: { canvasKey: string; x: number; y: number };
        to: { canvasKey: string; x: number; y: number };
        cableId?: string;
    };
  }
| {
    type: 'REMOVE_CROSS_CONNECTION';
    payload: { connectionId: string };
  }
| {
    type: 'SET_SHARED_DATA';
    payload: {
        key: string;
        value: unknown;
        sourceCanvas?: string;
    };
  }
| {
    type: 'REMOVE_SHARED_DATA';
    payload: { key: string };
  }
| {
    type: 'TRANSFER_ITEM';
    payload: {
        itemId: string;
        fromCanvas: string;
        fromBlockX: number;
        fromBlockY: number;
        toCanvas: string;
        toBlockX: number;
        toBlockY: number;
    };
  }
| {
    type: 'INIT_MULTI_CANVAS';
    payload: {
        questionId: string;
        canvases: Record<string, CanvasConfig>;
        inventory?: InventoryItem[];
        terminal?: Partial<TerminalState>;
        phase?: GamePhase;
        questionStatus?: QuestionStatus;
    };
  }
```

---

## Part 2: Reducer Changes in game-provider.tsx

### 2.1 Update createDefaultState Function

**Location**: `src/components/game/game-provider.tsx` lines 203-217 (or search for `const createDefaultState`)

**Add to the returned object**:
```typescript
crossConnections: [],
sharedZone: { items: {} },
```

---

### 2.2 Add INIT_MULTI_CANVAS Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside the reducer switch statement, around line 512 after INIT_QUESTION case)

**Logic**:
1. Validate all canvas configs have unique stateKey
2. Create CanvasState for each config using existing `createCanvasState` function
3. Store first canvas as `state.canvas` (for backwards compatibility)
4. Store all canvases in `state.canvases` keyed by stateKey
5. Initialize `crossConnections` as empty array
6. Initialize `sharedZone` as `{ items: {} }`

**Validation rules**:
- Each canvas MUST have a `stateKey` property
- All `stateKey` values MUST be unique
- At least one canvas is required

---

### 2.3 Add MAKE_CROSS_CONNECTION Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside reducer switch, after INIT_MULTI_CANVAS case)

**Logic**:
1. Validate `from.canvasKey` exists in `state.canvases`
2. Validate `to.canvasKey` exists in `state.canvases`
3. Validate `from.canvasKey !== to.canvasKey` (cross-canvas only; same-canvas uses MAKE_CONNECTION)
4. Validate positions are within respective canvas bounds
5. Validate both positions have placed items
6. Generate unique connection ID using `crypto.randomUUID()`
7. Add to `state.crossConnections` array

**Return**: New state with updated `crossConnections`

---

### 2.4 Add REMOVE_CROSS_CONNECTION Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside reducer switch, after MAKE_CROSS_CONNECTION case)

**Logic**:
1. Filter `state.crossConnections` to remove connection with matching ID
2. Return new state with updated `crossConnections`

---

### 2.5 Add SET_SHARED_DATA Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside reducer switch, after REMOVE_CROSS_CONNECTION case)

**Logic**:
1. Create new SharedZoneItem:
   ```typescript
   {
       id: crypto.randomUUID(),
       key: action.payload.key,
       value: action.payload.value,
       sourceCanvas: action.payload.sourceCanvas,
       timestamp: Date.now(),
   }
   ```
2. Update `state.sharedZone.items[key]` with new item
3. Return new state

---

### 2.6 Add REMOVE_SHARED_DATA Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside reducer switch, after SET_SHARED_DATA case)

**Logic**:
1. Create copy of `state.sharedZone.items`
2. Delete the key from the copy
3. Return new state with updated sharedZone

---

### 2.7 Add TRANSFER_ITEM Handler

**Location**: `src/components/game/game-provider.tsx` lines 485-911 (inside reducer switch, after REMOVE_SHARED_DATA case)

**This is the most complex handler**. Logic:

1. Validate source canvas exists (`fromCanvas` in `state.canvases`)
2. Validate target canvas exists (`toCanvas` in `state.canvases`)
3. Find item in source canvas at `(fromBlockX, fromBlockY)`
4. Validate target position is empty in target canvas
5. Validate target canvas allows this item type (check `allowedItemTypes`)
6. Validate target canvas has room (check `maxItems`)
7. Remove item from source canvas:
   - Remove from `placedItems` array
   - Update block at `(fromBlockX, fromBlockY)` to `status: 'empty'`, remove `itemId`
8. Add item to target canvas:
   - Add to `placedItems` array with new `blockX`, `blockY`
   - Update block at `(toBlockX, toBlockY)` to `status: 'occupied'`, set `itemId`
9. Remove any connections involving this item in source canvas
10. Remove any cross-connections involving this item
11. Return new state with both canvases updated

---

## Part 3: Create game-shell.tsx

**Location**: `src/components/game/game-shell.tsx`

**Purpose**: Minimal wrapper that provides drag context and overlay layers. Questions use this instead of GameLayout.

**Component structure**:
```
GameShell
  DragProvider (from drag-context.tsx)
    {children}       <-- Question renders its own layout here
    OverlayLayer
    DragOverlay
```

**Props**:
```typescript
type GameShellProps = {
    children: ReactNode;
    getItemLabel?: (itemType: string) => string;
};
```

**What to copy from game-layout.tsx**:
- The outer `Box` with `height="100vh"`, `bg="gray.950"`, `color="gray.100"`
- The `DragProvider` wrapper
- The `OverlayLayer` component
- The `DragOverlay` component

**What NOT to copy**:
- Title/description rendering
- Fixed layout structure
- PlayCanvas rendering (questions do this)
- InventoryPanel rendering (questions do this)
- TerminalPanel rendering (questions do this)
- SkipLink (questions can add if needed)
- SegmentErrorBoundary (questions can add if needed)

---

## Part 4: Modify play-canvas.tsx

### 4.1 Add Orientation Support

**Location**: `src/components/game/play-canvas.tsx` lines 731-737 (grid rendering in PlayCanvas component)

**Find the grid rendering**:
```typescript
gridTemplateColumns={`repeat(${canvas.config.columns}, minmax(0, 1fr))`}
gridTemplateRows={`repeat(${canvas.config.rows}, ${BLOCK_HEIGHT}px)`}
```

**Add orientation-aware rendering**:

When `orientation === 'vertical'`:
- Swap the meaning of columns/rows visually
- Use `gridAutoFlow: 'column'` CSS property
- This makes items fill top-to-bottom first, then left-to-right

When `orientation === 'horizontal'` (default):
- Keep current behavior
- Items fill left-to-right first, then top-to-bottom

**Do NOT change**:
- Block coordinate system (x, y still mean column, row)
- Connection logic
- Item placement logic

---

### 4.2 Export Additional Components

**Location**: `src/components/game/play-canvas.tsx` - at the end of file

The file already exports `PlayCanvas`. Verify these are also exported (add if missing):
- `PlayCanvasProps` type

---

## Part 5: Create shared-zone.tsx

**Location**: `src/components/game/shared-zone.tsx`

**Purpose**: Visual component for displaying shared data zone. Questions can optionally render this.

**Component**:
```typescript
type SharedZoneProps = {
    title?: string;
    renderItem?: (key: string, value: unknown) => ReactNode;
};
```

**Behavior**:
1. Read from `useGameState().sharedZone`
2. Display items as a list/grid
3. If `renderItem` prop provided, use it to render each item
4. Otherwise, display key-value pairs as text

**Styling**: Match game aesthetic (dark background, gray borders)

---

## Part 6: Modify drag-context.tsx for Cross-Canvas Drag

### 6.1 Update DragState Type

**Location**: `src/components/game/drag-context.tsx` (search for `type DragState` or find in first 50 lines)

**Find DragState type** and add:
```typescript
sourceCanvasKey?: string;  // which canvas the drag started from
targetCanvasKey?: string;  // which canvas the drag is currently over
```

---

### 6.2 Update Drag Handlers

**When drag starts**:
- Store `sourceCanvasKey` from the canvas where drag originated

**When dragging over a canvas**:
- Update `targetCanvasKey` to that canvas's stateKey
- If `targetCanvasKey !== sourceCanvasKey`, this is a cross-canvas drag

**When drag ends**:
- If `sourceCanvasKey !== targetCanvasKey`, dispatch `TRANSFER_ITEM` action
- If same canvas, dispatch existing `REPOSITION_ITEM` action

---

## Part 7: Modify inventory-panel.tsx

**Location**: `src/components/game/inventory-panel.tsx`

**Changes needed**:
- Remove any dependency on GameLayout
- Ensure it works as standalone component
- Accept all necessary props directly (don't rely on parent context)

**Verify these props exist**:
```typescript
type InventoryPanelProps = {
    tooltips?: Record<string, TooltipInfo>;
};
```

The component already reads from `useGameState()` for inventory items, which is correct.

---

## Part 8: Modify terminal-panel.tsx

**Location**: `src/components/game/terminal-panel.tsx`

**Changes needed**:
- Remove any dependency on GameLayout
- Ensure it works as standalone component
- Component already reads from `useGameState()` for terminal state

No changes likely needed - verify it works standalone.

---

## Part 9: Add Selector Hooks to game-provider.tsx

**Location**: `src/components/game/game-provider.tsx` lines 936-955 (after `useGame()` hook, before end of file)

**Add these selector hooks**:

```typescript
export const useCanvasState = (stateKey?: string) => {
    const state = useGameState();
    if (!stateKey) {
        return state.canvas;
    }
    return state.canvases?.[stateKey] ?? state.canvas;
};

export const useCrossConnections = () => {
    const state = useGameState();
    return state.crossConnections;
};

export const useSharedZone = () => {
    const state = useGameState();
    return state.sharedZone;
};

export const useSharedData = <T = unknown>(key: string): T | undefined => {
    const state = useGameState();
    return state.sharedZone.items[key]?.value as T | undefined;
};

export const useAllCanvases = () => {
    const state = useGameState();
    return state.canvases ?? { default: state.canvas };
};
```

---

## Part 9.5: Find All Existing GameLayout Usage

**CRITICAL: Do this FIRST before any migrations**

### 9.5.1 Search for all GameLayout imports

**Command**: Search codebase for `GameLayout`

**Expected results** (these MUST be migrated):
```
src/routes/questions/networking/internet/-page.tsx
src/routes/questions/networking/dhcp/-page.tsx
```

If other files appear, add them to your migration list.

### 9.5.2 Verify no other questions use GameLayout

**Search for pattern**: Look in `src/routes/questions/*/` for files importing GameLayout

**If found**: List them in migration plan before starting implementation

### 9.5.3 Create Migration Checklist

Before starting, create a document like this:

```
MIGRATION CHECKLIST
===================

Questions to migrate:
- [ ] Internet question (src/routes/questions/networking/internet/-page.tsx)
- [ ] DHCP question (src/routes/questions/networking/dhcp/-page.tsx)
- [ ] [List any others found]

For each question:
- [ ] Backup original file
- [ ] Replace imports
- [ ] Replace GameLayout with GameShell
- [ ] Compose own layout
- [ ] Test locally
- [ ] Verify all functionality
```

---

## Part 10: Migrate Internet Question

**Location**: `src/routes/questions/networking/internet/-page.tsx`

### 10.1 Replace GameLayout Import

**Change**:
```typescript
import { GameLayout } from "@/components/game/game-layout";
```

**To**:
```typescript
import { GameShell } from "@/components/game/game-shell";
import { PlayCanvas } from "@/components/game/play-canvas";
import { InventoryPanel } from "@/components/game/inventory-panel";
import { TerminalPanel } from "@/components/game/terminal-panel";
```

### 10.2 Replace GameLayout Usage

**Current** (around line 308-319):
```typescript
return (
    <GameLayout
        title={QUESTION_TITLE}
        description={QUESTION_DESCRIPTION}
        getItemLabel={getInternetItemLabel}
        getStatusMessage={getInternetStatusMessage}
        onPlacedItemClick={handlePlacedItemClick}
        isItemClickable={isItemClickable}
        contextualHint={contextualHint}
        inventoryTooltips={INVENTORY_TOOLTIPS}
    />
);
```

**Replace with**:
```typescript
return (
    <GameShell getItemLabel={getInternetItemLabel}>
        <Flex direction="column" height="100vh" px={{ base: 4, md: 12, lg: 24 }} py={{ base: 4, md: 6 }}>
            {/* Title section */}
            <Box textAlign="left" mb={4}>
                <Text fontSize={{ base: "2xl", md: "4xl" }} fontWeight="bold" color="gray.50">
                    {QUESTION_TITLE}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
                    {QUESTION_DESCRIPTION}
                </Text>
            </Box>

            {/* Canvas section */}
            <Box flex="1">
                <PlayCanvas
                    getItemLabel={getInternetItemLabel}
                    getStatusMessage={getInternetStatusMessage}
                    onPlacedItemClick={handlePlacedItemClick}
                    isItemClickable={isItemClickable}
                />
            </Box>

            {/* Inventory section */}
            <Box alignSelf="center" my={4}>
                <InventoryPanel tooltips={INVENTORY_TOOLTIPS} />
            </Box>

            {/* Hint section */}
            {contextualHint && (
                <Box bg="gray.800" border="1px solid" borderColor="gray.700" borderRadius="md" px={4} py={2} textAlign="center" mb={4}>
                    <Text fontSize="sm" color="gray.100">{contextualHint}</Text>
                </Box>
            )}

            {/* Terminal section */}
            <TerminalPanel />
        </Flex>
    </GameShell>
);
```

### 10.3 Add Missing Imports

Add to imports:
```typescript
import { Box, Flex, Text } from "@chakra-ui/react";
```

---

## Part 11: Migrate DHCP Question

**Location**: `src/routes/questions/networking/dhcp/-page.tsx`

**Apply the exact same migration pattern as Internet question (Part 10)**:

1. Replace imports (same as 10.1)
2. Replace GameLayout usage with GameShell wrapper (same as 10.2)
3. Add Chakra imports (same as 10.3)
4. Verify the question works (test locally)

**Key difference** (if any):
- Check if DHCP has different props than Internet (title, description, inventoryTooltips, etc.)
- If yes, maintain those same props in the new layout
- If no, it's identical migration

**After DHCP is migrated, both questions should follow the same pattern**.

---

## Part 12: Delete Old Files

After migration is complete and tested:

1. Delete `src/components/game/game-layout.tsx`
2. Delete `src/components/game/game-layout.md`

---

## Part 13: Update Exports

**Location**: `src/components/game/index.ts` (if it exists - check by listing `src/components/game/` directory; if no index.ts, components are imported directly)

**If index.ts exists, remove**:
```typescript
export { GameLayout } from "./game-layout";
```

**If index.ts exists, add**:
```typescript
export { GameShell } from "./game-shell";
export { SharedZone } from "./shared-zone";
export {
    useCanvasState,
    useCrossConnections,
    useSharedZone,
    useSharedData,
    useAllCanvases,
} from "./game-provider";
```

---

## Migration Verification Checklist

**Before starting implementation**:
- [ ] Run grep for all GameLayout usages and update Part 9.5
- [ ] Create a migration checklist (see Part 9.5.3)
- [ ] Verify which questions need migration
- [ ] Backup all question files

**During migration**:
- [ ] Part 9.5 - Find all usages and document
- [ ] Part 1-9 - Implement core changes
- [ ] Part 10 - Migrate Internet question
- [ ] Part 11 - Migrate DHCP question
- [ ] Part 12 - Delete old files (ONLY after all questions migrated)
- [ ] Part 13 - Update exports (ONLY after deletion)

**For each question migrated**:
- [ ] Old import removed (`import { GameLayout }`)
- [ ] New imports added (`GameShell`, `PlayCanvas`, etc.)
- [ ] GameLayout replaced with GameShell
- [ ] Question own layout composed (Flex/Box structure)
- [ ] All props passed correctly (title, description, tooltips, etc.)
- [ ] No TypeScript errors
- [ ] Runs locally without errors
- [ ] Can place items on canvas
- [ ] Can make connections
- [ ] Can configure devices
- [ ] Terminal works
- [ ] Inventory visible and functional

**After all migrations**:
- [ ] Search confirms no GameLayout references in questions
- [ ] No import errors in any question
- [ ] All questions work as before
- [ ] game-layout.tsx deleted
- [ ] game-layout.md deleted
- [ ] exports updated in index.ts

---

## Validation Checklist

After full implementation, verify:

### Type Safety
- [ ] All new types compile without errors
- [ ] All new actions are handled in reducer
- [ ] No TypeScript errors in modified files

### Single Canvas (Backwards Compatibility)
- [ ] Internet question works as before
- [ ] DHCP question works as before
- [ ] Items can be placed
- [ ] Items can be configured
- [ ] Connections work
- [ ] Terminal works

### Multi-Canvas
- [ ] Can create question with 2+ canvases
- [ ] Each canvas maintains separate state
- [ ] Inventory is shared across canvases
- [ ] `useCanvasState(stateKey)` returns correct canvas

### Cross-Canvas Connections
- [ ] Can create connection between items on different canvases
- [ ] Cross-connections are stored in `crossConnections` array
- [ ] Can remove cross-connections
- [ ] Cross-connections persist across re-renders

### Shared Zone
- [ ] Can set shared data from any canvas
- [ ] Can read shared data from any canvas
- [ ] SharedZone component renders data
- [ ] Can remove shared data

### Item Transfer
- [ ] Can drag item from canvas A to canvas B
- [ ] Item is removed from source canvas
- [ ] Item is added to target canvas
- [ ] Connections involving transferred item are cleaned up

### Orientation
- [ ] Horizontal orientation renders left-to-right (default)
- [ ] Vertical orientation renders top-to-bottom
- [ ] Block coordinates remain consistent regardless of orientation

---

## Testing Strategy

### Unit Tests
Write tests for:
1. `INIT_MULTI_CANVAS` action
2. `MAKE_CROSS_CONNECTION` action
3. `REMOVE_CROSS_CONNECTION` action
4. `SET_SHARED_DATA` action
5. `REMOVE_SHARED_DATA` action
6. `TRANSFER_ITEM` action
7. Each new selector hook

### Integration Tests
1. Create a test question with 2 canvases side-by-side
2. Verify items can be placed on both canvases
3. Verify items can be transferred between canvases
4. Verify cross-canvas connections work
5. Verify shared zone updates propagate

### Manual Testing
1. Run existing questions (internet, dhcp) - should work unchanged
2. Create new multi-canvas question for testing

---

## Order of Implementation

**Execute in this EXACT order to minimize breakage**:

### Phase 1: Pre-Implementation (NO CODE CHANGES)
0. **Find all usages** (Part 9.5) - Search and document all GameLayout imports
   - DO THIS FIRST before any code changes
   - Update Part 9.5 with actual results
   - Create migration checklist

### Phase 2: Core Infrastructure (SAFE - no breaking changes)
1. **Types first** (Part 1) - Add all new types (backward compatible)
2. **Reducer handlers** (Part 2) - Add all new action handlers (isolated switch cases)
3. **Selector hooks** (Part 9) - Add convenience hooks (new exports)
4. **GameShell** (Part 3) - Create new minimal wrapper (new component)
5. **SharedZone** (Part 5) - Create shared zone component (new component)

### Phase 3: Feature Implementation
6. **PlayCanvas orientation** (Part 4) - Add orientation support
7. **Drag context** (Part 6) - Add cross-canvas drag support
8. **Standalone components** (Part 7, 8) - Verify inventory/terminal work standalone

### Phase 4: Migration (BREAKING CHANGES - questions affected)
9. **Migrate Internet question** (Part 10) - Update first question
   - Test thoroughly before moving to next
   - Verify all functionality works
10. **Migrate DHCP question** (Part 11) - Update second question
    - Apply same pattern as Internet
    - Test thoroughly

### Phase 5: Cleanup (ONLY after all questions migrated)
11. **Delete old files** (Part 12) - Remove GameLayout
    - Only do this after confirming NO questions use it
12. **Update exports** (Part 13) - Update index.ts
    - Only do this after files are deleted

**CRITICAL CHECKPOINT**: After Phase 2, the codebase compiles and all old questions still work. Migration doesn't break anything until Phase 4.

---

## Backward Compatibility & Rollback

### What stays the same?
- `state.canvas` still exists (primary canvas)
- Single-canvas questions work unchanged
- `PLACE_ITEM`, `REMOVE_ITEM`, `REPOSITION_ITEM` work the same
- `MAKE_CONNECTION`, `REMOVE_CONNECTION` work the same
- Block coordinate system unchanged

### What breaks without migration?
- Questions using `GameLayout` will fail to import
- Questions depending on fixed layout will need layout code added

### If migration fails:
1. **Restore from git** - `git checkout src/components/game/game-layout.tsx`
2. **Keep the new types** - They're backward compatible
3. **Remove new action handlers** from reducer
4. **Delete new components** (GameShell, SharedZone)
5. **Test all questions** to confirm they work

### Why safe to migrate?
- New types don't affect existing state
- New actions are in reducer switch (isolated)
- GameShell is just a wrapper around existing components
- Each question controls its own layout, so no dependencies break

---

## Common Mistakes to Avoid

1. **Do NOT** modify block coordinate system - x is always column, y is always row
2. **Do NOT** change how `PLACE_ITEM` works for single canvas - backwards compatibility
3. **Do NOT** remove `state.canvas` - keep it for backwards compatibility
4. **Do NOT** forget to initialize `crossConnections` and `sharedZone` in default state
5. **Do NOT** allow cross-connections within same canvas - use regular `MAKE_CONNECTION` for that
6. **Do NOT** forget to clean up connections when transferring items
7. **Do NOT** mutate state directly - always return new objects
8. **Do NOT** forget to validate canvas exists before operations
