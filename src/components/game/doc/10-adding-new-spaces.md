# Adding New Space Types

This guide walks through creating custom space types for new question types.

## When to Create a New Space

Create a new space type when you need:
- **Different positioning logic**: Queue (FIFO), Stack (LIFO), Tree (hierarchical)
- **Custom constraints**: Time-based positions, priority ordering
- **Special rendering**: Network graphs, timelines, state machines

Use existing spaces when possible:
- **GridSpace**: Any 2D grid layout
- **PoolSpace**: Unordered collections

## Step 1: Define the Space Class

Create a new file in `src/components/game/domain/space/`:

```typescript
// QueueSpace.ts
import type { Entity } from "../entity/Entity";
import { Space, type SpaceConfig, type SpacePosition } from "./Space";

export type QueueSpaceConfig = SpaceConfig & {
  maxCapacity?: number;
  fifo?: boolean; // true = FIFO, false = LIFO
};

export type QueuePosition = {
  index: number;
};

export class QueueSpace extends Space {
  private entities: Entity[] = [];
  private readonly fifo: boolean;

  constructor(config: QueueSpaceConfig) {
    super(config);
    this.fifo = config.fifo ?? true;
  }

  add(entity: Entity, position?: SpacePosition): boolean {
    if (this.contains(entity)) {
      return false;
    }

    if (this.maxCapacity && this.entities.length >= this.maxCapacity) {
      return false;
    }

    // Add to end of queue
    this.entities.push(entity);
    return true;
  }

  remove(entity: Entity): boolean {
    const index = this.entities.findIndex(e => e.id === entity.id);
    if (index === -1) return false;

    this.entities.splice(index, 1);
    return true;
  }

  contains(entity: Entity | string): boolean {
    const id = typeof entity === "string" ? entity : entity.id;
    return this.entities.some(e => e.id === id);
  }

  getPosition(entityId: string): QueuePosition | null {
    const index = this.entities.findIndex(e => e.id === entityId);
    return index >= 0 ? { index } : null;
  }

  getAllEntities(): Entity[] {
    return [...this.entities];
  }

  // Queue-specific methods
  peek(): Entity | null {
    return this.entities[0] ?? null;
  }

  dequeue(): Entity | null {
    return this.fifo ? this.entities.shift() ?? null : this.entities.pop() ?? null;
  }
}
```

## Step 2: Add State Actions

Create actions in `src/components/game/application/state/actions/space.ts`:

```typescript
export const queueEnqueue = (spaceId: string, entity: Entity) => ({
  type: "QUEUE_ENQUEUE" as const,
  payload: { spaceId, entity },
});

export const queueDequeue = (spaceId: string) => ({
  type: "QUEUE_DEQUEUE" as const,
  payload: { spaceId },
});
```

## Step 3: Update Reducers

Add cases to the space reducer:

```typescript
case "QUEUE_ENQUEUE": {
  const space = state.spaces[action.payload.spaceId];
  if (!space || !(space instanceof QueueSpace)) {
    return state;
  }

  space.add(action.payload.entity);
  return { ...state }; // Trigger re-render
}
```

## Step 4: Create View Component

Create `QueueSpaceView.tsx` in `src/components/game/presentation/space/`:

```typescript
import { Box, VStack } from "@chakra-ui/react";
import type { QueueSpace } from "@/components/game/domain/space";
import { EntityCard } from "../entity/EntityCard";

type QueueSpaceViewProps = {
  space: QueueSpace;
  onEntityClick?: (entityId: string) => void;
};

export const QueueSpaceView = ({ space, onEntityClick }: QueueSpaceViewProps) => {
  const entities = space.getAllEntities();

  return (
    <VStack spacing={2} align="stretch">
      {entities.map((entity, index) => (
        <Box key={entity.id} position="relative">
          <EntityCard
            entity={entity}
            onClick={() => onEntityClick?.(entity.id)}
          />
          <Box position="absolute" top={0} left={-8} fontSize="xs">
            {index}
          </Box>
        </Box>
      ))}
    </VStack>
  );
};
```

## Step 5: Write Tests

Create tests in `src/components/game/domain/space/__tests__/`:

```typescript
// QueueSpace.test.ts
import { describe, expect, it } from "vitest";
import { Entity } from "../../entity/Entity";
import { QueueSpace } from "../QueueSpace";

describe("QueueSpace", () => {
  it("enqueues entities in order", () => {
    const queue = new QueueSpace({ id: "queue-1" });
    const e1 = new Entity({ id: "1", type: "packet" });
    const e2 = new Entity({ id: "2", type: "packet" });

    queue.add(e1);
    queue.add(e2);

    expect(queue.peek()).toBe(e1);
  });

  it("dequeues FIFO", () => {
    const queue = new QueueSpace({ id: "queue-1", fifo: true });
    const e1 = new Entity({ id: "1", type: "packet" });
    const e2 = new Entity({ id: "2", type: "packet" });

    queue.add(e1);
    queue.add(e2);

    expect(queue.dequeue()).toBe(e1);
    expect(queue.dequeue()).toBe(e2);
  });

  it("respects max capacity", () => {
    const queue = new QueueSpace({ id: "queue-1", maxCapacity: 2 });
    const e1 = new Entity({ id: "1", type: "packet" });
    const e2 = new Entity({ id: "2", type: "packet" });
    const e3 = new Entity({ id: "3", type: "packet" });

    expect(queue.add(e1)).toBe(true);
    expect(queue.add(e2)).toBe(true);
    expect(queue.add(e3)).toBe(false);
  });
});
```

## Step 6: Document the Space

Add JSDoc comments to your space class:

```typescript
/**
 * A queue-based space that maintains entities in FIFO or LIFO order.
 * Useful for packet queues, task lists, or message buffers.
 *
 * @example
 * ```typescript
 * const packetQueue = new QueueSpace({
 *   id: "router-queue",
 *   maxCapacity: 10,
 *   fifo: true,
 * });
 *
 * packetQueue.add(packet1);
 * packetQueue.add(packet2);
 *
 * const next = packetQueue.dequeue(); // Gets packet1
 * ```
 */
export class QueueSpace extends Space {
  // ...
}
```

## Using Your New Space

### In Question Config

```typescript
import { QueueSpace } from "@/components/game/domain/space";

export const SPACE_CONFIGS = {
  routerQueue: {
    id: "router-queue",
    type: "queue",
    maxCapacity: 10,
    fifo: true,
  },
};

export const initializeQuestion = (dispatch: Dispatch) => {
  const queue = new QueueSpace(SPACE_CONFIGS.routerQueue);
  dispatch(addSpace(queue));
};
```

### In Question Component

```typescript
import { QueueSpaceView } from "@/components/game/presentation/space";

function RouterQuestion() {
  const queue = useSpace("router-queue") as QueueSpace;

  return (
    <QueueSpaceView
      space={queue}
      onEntityClick={(id) => {
        // Handle click
      }}
    />
  );
}
```

## Best Practices

### 1. Immutability

Make space operations return new instances or use internal immutable updates:

```typescript
add(entity: Entity): QueueSpace {
  const newEntities = [...this.entities, entity];
  return new QueueSpace({
    ...this.config,
    entities: newEntities,
  });
}
```

### 2. Type Safety

Export position types for compile-time checking:

```typescript
export type QueuePosition = { index: number };

// Users get type errors for invalid positions
space.add(entity, { row: 0 }); // Error: wrong position type
```

### 3. Validation

Check constraints before accepting entities:

```typescript
private canAccept(entity: Entity): boolean {
  if (this.entities.length >= this.maxCapacity) {
    return false;
  }
  if (this.contains(entity)) {
    return false;
  }
  return true;
}
```

### 4. Clear API

Provide domain-specific methods beyond base Space API:

```typescript
class QueueSpace extends Space {
  // Base API
  add(entity: Entity): boolean { /* ... */ }
  remove(entity: Entity): boolean { /* ... */ }

  // Queue-specific API
  enqueue(entity: Entity): boolean { return this.add(entity); }
  dequeue(): Entity | null { /* ... */ }
  peek(): Entity | null { /* ... */ }
  size(): number { return this.entities.length; }
}
```

## Common Space Patterns

### Grid Variants

- **HexGrid**: Hexagonal tile grids
- **IsometricGrid**: 2.5D isometric layouts
- **InfiniteGrid**: Dynamically expanding grids

### Collections

- **Stack**: LIFO ordering
- **PriorityQueue**: Priority-based ordering
- **Set**: Unique, unordered entities

### Graphs

- **TreeSpace**: Hierarchical parent-child relationships
- **GraphSpace**: Arbitrary node connections
- **PathSpace**: Directed paths through nodes

## Checklist

Before submitting your new space:

- [ ] Space class extends `Space` base class
- [ ] All required methods implemented
- [ ] Position type exported
- [ ] Actions added for space operations
- [ ] Reducer handles new action types
- [ ] View component created
- [ ] Unit tests written (80%+ coverage)
- [ ] JSDoc comments added
- [ ] Example usage in comments
- [ ] Type exports in index.ts

## See Also

- [Space Architecture](./09-space-architecture.md)
- [State Management](./03-state-management.md)
- [Core Concepts](./02-core-concepts.md)
