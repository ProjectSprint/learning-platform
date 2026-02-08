# Function Contracts

> Authoritative reference for all pure functions in the game engine domain layer.
> Source: `domain/entity/entity-fns.ts`, `domain/space/space-fns.ts`, `domain/space/validation.ts`,
> `infrastructure/geometry/coordinates.ts`

## When to Read

- You need to create or manipulate entities or spaces
- You need to validate placement before dispatching an action
- You are writing a reducer and need the mutation primitives
- You need geometry helpers for grid math

---

## Design Principles

All functions in the domain layer follow these rules:

1. **Pure or Immer-compatible mutations** - Functions either return new values (factory/query)
   or mutate in-place for use inside `produce()` (mutation)
2. **No side effects** - No events emitted, no state dispatches, no DOM access
3. **Plain data only** - Accept and return plain objects (`Record`, arrays), never classes
4. **Typed with generics** - Use TypeScript for full type safety

Functions are categorized:

| Category | Signature Pattern | Use Context |
|----------|-------------------|-------------|
| Factory | `(config) => Data` | Outside produce, creates initial data |
| Query | `(data) => value` | Anywhere, reads without mutation |
| Mutation | `(data, ...) => void \| boolean` | Inside `produce()` only |
| Validation | `(gameState, ...) => boolean` | Before dispatching actions |

---

## Entity Functions

Source: `domain/entity/entity-fns.ts`

### Factories

#### createEntityData

Creates a base entity.

```typescript
createEntityData(config: EntityDataConfig): EntityData
```

```
EntityDataConfig              EntityData
{                             {
  id: "router-1"        -->    id: "router-1"
  type: "router"               type: "router"
  name?: "Main Router"         name: "Main Router"
  visual?: { color }           visual: { color }     // defaults to {}
  data?: { ip }                data: { ip }          // defaults to {}
  state?: { status }           state: { status }     // defaults to {}
  behaviorIds?: []             behaviorIds: []       // defaults to []
}                             }
```

#### createItemData

Creates a draggable item entity (extends EntityData).

```typescript
createItemData(config: ItemDataConfig): ItemData
```

Additional fields beyond EntityData:

| Config Field | Default | Result Field |
|-------------|---------|--------------|
| `allowedPlaces` | (required) | `allowedPlaces` |
| `icon?` | undefined | `icon` |
| `tooltip?` | undefined | `tooltip` |
| `draggable?` | `true` | `draggable` |
| `category?` | undefined | `category` |

Sets `type` from `config.data.type` or `"item"`.

---

### Query Functions

#### getEntityStateValue

```typescript
getEntityStateValue<T>(entity: EntityData, key: string): T | undefined
```

Reads a single value from `entity.state`.

#### canPlaceIn

```typescript
canPlaceIn(item: ItemData, placeId: string): boolean
```

Checks if `placeId` is in `item.allowedPlaces`.

#### isDraggable

```typescript
isDraggable(item: ItemData): boolean
```

Returns `item.draggable`.

#### getItemTooltip

```typescript
getItemTooltip(item: ItemData): ItemTooltip | undefined
```

#### getItemIcon

```typescript
getItemIcon(item: ItemData): IconInfo | undefined
```

#### isInCategory

```typescript
isInCategory(item: ItemData, category: string): boolean
```

Returns `item.category === category`.

#### isItemData (Type Guard)

```typescript
isItemData(entity: EntityData): entity is ItemData
```

Checks for `allowedPlaces` and `draggable` properties.

---

### Mutation Functions (Immer Only)

These mutate data in-place. Only use inside `produce()`.

#### setEntityStateValue

```typescript
setEntityStateValue(entity: EntityData, key: string, value: unknown): void
```

Sets `entity.state[key] = value`.

#### updateEntityState

```typescript
updateEntityState(entity: EntityData, updates: Record<string, unknown>): void
```

Merges updates: `entity.state = { ...entity.state, ...updates }`.

#### resetEntityState

```typescript
resetEntityState(entity: EntityData, initialState?: Record<string, unknown>): void
```

Replaces `entity.state` with `initialState` or `{}`.

---

### Clone Functions

#### cloneEntityData

```typescript
cloneEntityData(entity: EntityData, newId: string): EntityData
```

Deep copies all fields with a new ID.

#### cloneItemData

```typescript
cloneItemData(item: ItemData, newId: string): ItemData
```

Deep copies including item-specific fields (`allowedPlaces`, `icon`, `tooltip`).

---

## Space Functions

Source: `domain/space/space-fns.ts`

### Factories

#### createGridSpaceData

```typescript
createGridSpaceData(config: GridSpaceConfig): GridSpaceData
```

```
GridSpaceConfig                GridSpaceData
{                              {
  id: "board"                    id: "board"
  rows: 3                       rows: 3
  cols: 4                       cols: 4
  metrics: { ... }               metrics: { ... }
  allowMultiplePerCell?: f       allowMultiplePerCell: false
  maxCapacity?: 6                maxCapacity: 6
}                                kind: "grid"
                                 entityPositions: {}
                                 metadata: {}
                               }
```

#### createPoolSpaceData

```typescript
createPoolSpaceData(config: PoolSpaceConfig): PoolSpaceData
```

```
PoolSpaceConfig                PoolSpaceData
{                              {
  id: "inventory"                id: "inventory"
  layout?: "grid"                layout: "grid"       // default
  columns?: 3                    columns: 3
  allowReorder?: true            allowReorder: true   // default
  maxCapacity?: 10               maxCapacity: 10
}                                kind: "pool"
                                 entityIds: []
                                 metadata: {}
                               }
```

---

### Grid Functions

#### gridAdd (Mutation)

```typescript
gridAdd(space: GridSpaceData, entityId: string, position: GridPosition): boolean
```

Adds entity at position. Returns `false` if:
- Position out of bounds
- Capacity full (and entity not already in space)
- Cell occupied (unless `allowMultiplePerCell`)

```
gridAdd(space, "router-1", { row: 0, col: 2 })
  |
  v
isInBounds({ row: 0, col: 2 }, rows, cols)?
  |  no -> return false
  v
maxCapacity reached (excluding this entity)?
  |  yes -> return false
  v
Cell occupied by another entity (allowMultiplePerCell: false)?
  |  yes -> return false
  v
Remove entity if already in space (move case)
  |
  v
space.entityPositions["router-1"] = { row: 0, col: 2 }
  |
  v
return true
```

#### gridRemove (Mutation)

```typescript
gridRemove(space: GridSpaceData, entityId: string): boolean
```

Removes entity. Returns `false` if entity not in space.

#### gridContains (Query)

```typescript
gridContains(space: GridSpaceData, entityId: string): boolean
```

#### gridGetPosition (Query)

```typescript
gridGetPosition(space: GridSpaceData, entityId: string): GridPosition | undefined
```

#### gridCanAccept (Query)

```typescript
gridCanAccept(space: GridSpaceData, entityId: string, position: GridPosition): boolean
```

Same validation as `gridAdd` but without mutation. Use to check before dispatching.

#### gridGetEntitiesAt (Query)

```typescript
gridGetEntitiesAt(space: GridSpaceData, position: GridPosition): string[]
```

Returns all entity IDs at a grid cell.

#### gridIsOccupied (Query)

```typescript
gridIsOccupied(space: GridSpaceData, position: GridPosition): boolean
```

#### gridGetEmptyPositions (Query)

```typescript
gridGetEmptyPositions(space: GridSpaceData): GridPosition[]
```

Returns all cells with no entities.

#### gridGetOccupiedPositions (Query)

```typescript
gridGetOccupiedPositions(space: GridSpaceData): GridPosition[]
```

#### gridGetEntityCount (Query)

```typescript
gridGetEntityCount(space: GridSpaceData): number
```

#### gridIsFull (Query)

```typescript
gridIsFull(space: GridSpaceData): boolean
```

Returns `true` if `entityCount >= maxCapacity`. Always `false` if no capacity limit.

#### gridIsEmpty (Query)

```typescript
gridIsEmpty(space: GridSpaceData): boolean
```

---

### Pool Functions

#### poolAdd (Mutation)

```typescript
poolAdd(space: PoolSpaceData, entityId: string, index?: number): boolean
```

Adds entity to pool. Returns `false` only if capacity full. If entity already present,
moves it to new index.

```
poolAdd(space, "packet-1", 2)
  |
  v
maxCapacity reached (excluding this entity)?
  |  yes -> return false
  v
Entity already in pool? -> splice out first
  |
  v
Insert at index (clamped to [0, length]) or append
  |
  v
return true
```

#### poolRemove (Mutation)

```typescript
poolRemove(space: PoolSpaceData, entityId: string): boolean
```

#### poolContains (Query)

```typescript
poolContains(space: PoolSpaceData, entityId: string): boolean
```

#### poolGetEntityCount (Query)

```typescript
poolGetEntityCount(space: PoolSpaceData): number
```

#### poolIsFull (Query)

```typescript
poolIsFull(space: PoolSpaceData): boolean
```

#### poolIsEmpty (Query)

```typescript
poolIsEmpty(space: PoolSpaceData): boolean
```

---

### Polymorphic Functions

These work with any `SpaceData` and dispatch based on `space.kind`.

| Function | Grid Delegate | Pool Delegate |
|----------|--------------|---------------|
| `spaceContains(space, entityId)` | `gridContains` | `poolContains` |
| `spaceRemove(space, entityId)` | `gridRemove` | `poolRemove` |
| `spaceGetEntityCount(space)` | `gridGetEntityCount` | `poolGetEntityCount` |
| `spaceIsFull(space)` | `gridIsFull` | `poolIsFull` |
| `spaceIsEmpty(space)` | `gridIsEmpty` | `poolIsEmpty` |

---

## Validation Functions

Source: `domain/space/validation.ts`

### canEntityBePlaced

The primary validation function for drag-and-drop. Call this before dispatching placement actions.

```typescript
canEntityBePlaced(
  gameState: GameState,
  entityId: string,
  toSpaceId: string,
  toPosition?: GridPosition,
): boolean
```

```
canEntityBePlaced(state, "router-1", "board", { row: 0, col: 2 })
  |
  v
Entity exists?
  |  no -> false
  v
Target space exists?
  |  no -> false
  v
Entity is ItemData? (has allowedPlaces)
  |  no -> false (only items can be placed)
  v
toSpaceId in entity.allowedPlaces?
  |  no -> false
  v
GridSpace + position provided?
  |  yes -> gridCanAccept(targetSpace, entityId, position)
  v
PoolSpace?
  |  yes -> capacity check (skip if entity already in pool)
  v
false (unknown space type)
```

### findEntitySpace

Locates which space contains an entity.

```typescript
findEntitySpace(gameState: GameState, entityId: string): string | null
```

Iterates all spaces, returns the first `spaceId` where `spaceContains()` is true.

---

## Geometry Functions

Source: `infrastructure/geometry/coordinates.ts`

### Factories

| Function | Signature |
|----------|-----------|
| `createPoint(x, y)` | `Point2D` |
| `createGridCoord(row, col)` | `GridCoordinate` |

### Comparison

| Function | Signature |
|----------|-----------|
| `pointsEqual(a, b)` | `boolean` |
| `gridCoordsEqual(a, b)` | `boolean` |

### Distance

| Function | Description |
|----------|-------------|
| `distance(a, b)` | Euclidean distance between Point2D |
| `manhattanDistance(a, b)` | Manhattan distance between GridCoordinate |

### Arithmetic

| Function | Description |
|----------|-------------|
| `addPoints(a, b)` | Vector addition |
| `subtractPoints(a, b)` | Vector subtraction |
| `scalePoint(p, factor)` | Scalar multiplication |

### Grid Snapping

| Function | Description |
|----------|-------------|
| `snapToGrid(value, gridSize, offset?)` | Snaps 1D value to nearest grid step |
| `snapPointToGrid(point, w, h, ox?, oy?)` | Snaps 2D point |

### Bounds

| Function | Description |
|----------|-------------|
| `isInBounds(coord, rows, cols)` | Grid coordinate within `[0, rows) x [0, cols)` |
| `clamp(value, min, max)` | Clamps number |
| `clampPoint(point, minX, minY, maxX, maxY)` | Clamps Point2D |
