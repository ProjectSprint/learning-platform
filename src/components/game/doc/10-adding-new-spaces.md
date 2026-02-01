# Adding New Space Types

This guide walks through creating custom space types for new question types using the FP (data-first) approach.

## When to Create a New Space

Create a new space type when you need:
- **Different positioning logic**: Queue (FIFO), Stack (LIFO), Tree (hierarchical)
- **Custom constraints**: Time-based positions, priority ordering
- **Special rendering**: Network graphs, timelines, state machines

Use existing spaces when possible:
- **GridSpaceData**: Any 2D grid layout
- **PoolSpaceData**: Unordered collections

## Step 1: Define the Space Data Type

Create the type definition in `src/components/game/domain/space/space-data.ts`:

```typescript
// Add to space-data.ts

export type QueuePosition = {
  index: number;
};

export interface QueueSpaceData extends SpaceBase {
  kind: "queue";  // Discriminator for the union
  maxCapacity?: number;
  fifo?: boolean; // true = FIFO, false = LIFO
  entityOrder: string[]; // Ordered list of entity IDs
}
```

Also update the main `SpaceData` union type:

```typescript
export type SpaceData = GridSpaceData | PoolSpaceData | QueueSpaceData;
```

## Step 2: Add Type Guard

Add a type guard function in `space-data.ts`:

```typescript
export function isQueueSpace(space: unknown): space is QueueSpaceData {
  return (
    typeof space === "object" &&
    space !== null &&
    (space as QueueSpaceData).kind === "queue"
  );
}
```

## Step 3: Add Factory Function

Add a factory function in `space-data.ts`:

```typescript
export function createQueueSpaceData(
  config: Omit<QueueSpaceData, "kind" | "entityOrder">,
): QueueSpaceData {
  return {
    kind: "queue",
    entityOrder: [],
    ...config,
  };
}
```

## Step 4: Implement Space Functions

Add functions in `src/components/game/domain/space/space-fns.ts`:

```typescript
import type { QueueSpaceData } from "./space-data";

/**
 * Adds an entity to the queue.
 */
export function queueAdd(
  space: QueueSpaceData,
  entityId: string,
): boolean {
  // Check capacity
  if (space.maxCapacity && space.entityOrder.length >= space.maxCapacity) {
    return false;
  }

  // Check for duplicates
  if (space.entityOrder.includes(entityId)) {
    return false;
  }

  // Add to queue
  space.entityOrder.push(entityId);
  return true;
}

/**
 * Removes an entity from the queue.
 */
export function queueRemove(
  space: QueueSpaceData,
  entityId: string,
): boolean {
  const index = space.entityOrder.indexOf(entityId);
  if (index === -1) {
    return false;
  }

  space.entityOrder.splice(index, 1);
  return true;
}

/**
 * Gets the position of an entity in the queue.
 */
export function queueGetPosition(
  space: QueueSpaceData,
  entityId: string,
): QueuePosition | null {
  const index = space.entityOrder.indexOf(entityId);
  if (index === -1) {
    return null;
  }
  return { index };
}

/**
 * Checks if the queue contains an entity.
 */
export function queueContains(
  space: QueueSpaceData,
  entityId: string,
): boolean {
  return space.entityOrder.includes(entityId);
}

/**
 * Queue-specific: Peeks at the first/last entity.
 */
export function queuePeek(
  space: QueueSpaceData,
): string | null {
  return space.entityOrder[0] ?? null;
}

/**
 * Queue-specific: Dequeues an entity (FIFO or LIFO).
 */
export function queueDequeue(
  space: QueueSpaceData,
): string | null {
  if (space.fifo ?? true) {
    return space.entityOrder.shift() ?? null;
  }
  return space.entityOrder.pop() ?? null;
}

/**
 * Queue-specific: Gets all entity IDs in order.
 */
export function queueGetEntityIds(
  space: QueueSpaceData,
): readonly string[] {
  return space.entityOrder;
}
```

## Step 5: Update Polymorphic Dispatchers

Update the polymorphic functions in `space-fns.ts` to handle the new space type:

```typescript
export function spaceContains(
  space: SpaceData,
  entityId: string,
): boolean {
  if (isGridSpace(space)) {
    return gridContains(space, entityId);
  }
  if (isPoolSpace(space)) {
    return poolContains(space, entityId);
  }
  if (isQueueSpace(space)) {
    return queueContains(space, entityId);
  }
  return false;
}

export function spaceRemove(
  space: SpaceData,
  entityId: string,
): boolean {
  if (isGridSpace(space)) {
    return gridRemove(space, entityId);
  }
  if (isPoolSpace(space)) {
    return poolRemove(space, entityId);
  }
  if (isQueueSpace(space)) {
    return queueRemove(space, entityId);
  }
  return false;
}

export function spaceGetEntityCount(space: SpaceData): number {
  if (isGridSpace(space)) {
    return gridGetEntityCount(space);
  }
  if (isPoolSpace(space)) {
    return poolGetEntityCount(space);
  }
  if (isQueueSpace(space)) {
    return space.entityOrder.length;
  }
  return 0;
}
```

## Step 6: Export From Index

Update `src/components/game/domain/space/index.ts`:

```typescript
// Add type to type exports
export type { QueueSpaceData, QueuePosition } from "./space-data";

// Add type guard
export { isQueueSpace } from "./space-data";

// Add factory function
export { createQueueSpaceData } from "./space-data";

// Add functions
export {
  queueAdd,
  queueRemove,
  queueContains,
  queueGetPosition,
  queuePeek,
  queueDequeue,
  queueGetEntityIds,
} from "./space-fns";
```

## Step 7: Create View Component

Create `QueueSpaceView.tsx` in `src/components/game/presentation/space/`:

```typescript
import { Box, VStack } from "@chakra-ui/react";
import type { QueueSpaceData } from "@/components/game/domain/space/space-data";
import { useEntities } from "@/components/game/game-provider";
import { EntityCard } from "../entity/EntityCard";

type QueueSpaceViewProps = {
  space: QueueSpaceData;
  onEntityClick?: (entityId: string) => void;
};

export const QueueSpaceView = ({
  space,
  onEntityClick,
}: QueueSpaceViewProps) => {
  const entities = useEntities(space.entityOrder);

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

## Step 8: Write Tests

Create tests in `src/components/game/domain/space/__tests__/queue-space.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  createQueueSpaceData,
  queueAdd,
  queueContains,
  queueDequeue,
  queueGetEntityIds,
  queuePeek,
  queueRemove,
} from "../index";

describe("QueueSpace", () => {
  it("enqueues entities in order", () => {
    const queue = createQueueSpaceData({
      id: "queue-1",
      fifo: true,
    });

    queueAdd(queue, "entity-1");
    queueAdd(queue, "entity-2");

    expect(queueGetEntityIds(queue)).toEqual(["entity-1", "entity-2"]);
  });

  it("dequeues FIFO", () => {
    const queue = createQueueSpaceData({ id: "queue-1", fifo: true });

    queueAdd(queue, "entity-1");
    queueAdd(queue, "entity-2");

    const dequeued = queueDequeue(queue);
    expect(dequeued).toBe("entity-1");
    expect(queueGetEntityIds(queue)).toEqual(["entity-2"]);
  });

  it("dequeues LIFO", () => {
    const queue = createQueueSpaceData({ id: "queue-1", fifo: false });

    queueAdd(queue, "entity-1");
    queueAdd(queue, "entity-2");

    const dequeued = queueDequeue(queue);
    expect(dequeued).toBe("entity-2");
    expect(queueGetEntityIds(queue)).toEqual(["entity-1"]);
  });

  it("respects max capacity", () => {
    const queue = createQueueSpaceData({ id: "queue-1", maxCapacity: 2 });

    expect(queueAdd(queue, "entity-1")).toBe(true);
    expect(queueAdd(queue, "entity-2")).toBe(true);
    expect(queueAdd(queue, "entity-3")).toBe(false);
  });

  it("prevents duplicates", () => {
    const queue = createQueueSpaceData({ id: "queue-1" });

    expect(queueAdd(queue, "entity-1")).toBe(true);
    expect(queueAdd(queue, "entity-1")).toBe(false);
  });

  it("checks contains", () => {
    const queue = createQueueSpaceData({ id: "queue-1" });

    expect(queueContains(queue, "entity-1")).toBe(false);
    queueAdd(queue, "entity-1");
    expect(queueContains(queue, "entity-1")).toBe(true);
  });
});
```

## Step 9: Document the Space

Add JSDoc comments to your types and functions:

```typescript
/**
 * A queue-based space that maintains entities in FIFO or LIFO order.
 * Useful for packet queues, task lists, or message buffers.
 *
 * @example
 * ```typescript
 * const packetQueue = createQueueSpaceData({
 *   id: "router-queue",
 *   maxCapacity: 10,
 *   fifo: true,
 * });
 *
 * // In reducer (Immer draft)
 * queueAdd(packetQueue, "packet-1");
 * queueAdd(packetQueue, "packet-2");
 *
 * const next = queueDequeue(packetQueue); // Gets packet-1
 * ```
 */
export interface QueueSpaceData extends SpaceBase {
  // ...
}
```

## Using Your New Space

### In Question Config

```typescript
import { createQueueSpaceData } from "@/components/game/domain/space";

export const SPACE_CONFIGS = {
  routerQueue: createQueueSpaceData({
    id: "router-queue",
    maxCapacity: 10,
    fifo: true,
  }),
};
```

### In Reducer with Immer

```typescript
import { produce } from "immer";
import { queueAdd, isQueueSpace } from "@/components/game/domain/space";

const applicationReducer = produce((draft: GameState, action: Action) => {
  switch (action.type) {
    case "ENQUEUE_ENTITY": {
      const { spaceId, entityId } = action.payload;
      const space = draft.spaces[spaceId];

      if (space && isQueueSpace(space)) {
        queueAdd(space, entityId);
      }
      break;
    }
  }
});
```

### In Question Component

```typescript
import { useSpace } from "@/components/game/game-provider";
import { isQueueSpace } from "@/components/game/domain/space";
import { QueueSpaceView } from "@/components/game/presentation/space/QueueSpaceView";

function RouterQuestion() {
  const space = useSpace("router-queue");

  if (!space || !isQueueSpace(space)) {
    return null;
  }

  return (
    <QueueSpaceView
      space={space}
      onEntityClick={(id) => {
        // Handle click
      }}
    />
  );
}
```

## Best Practices

### 1. Discriminated Union Pattern

Always use a `kind` discriminator for type safety:

```typescript
export interface QueueSpaceData extends SpaceBase {
  kind: "queue";  // Required
  // ...
}
```

### 2. Type Guards

Always provide a type guard:

```typescript
export function isQueueSpace(space: unknown): space is QueueSpaceData {
  return typeof space === "object" &&
    space !== null &&
    (space as QueueSpaceData).kind === "queue";
}
```

### 3. Factory Functions

Always provide a factory function:

```typescript
export function createQueueSpaceData(
  config: Omit<QueueSpaceData, "kind" | "entityOrder">
): QueueSpaceData {
  return {
    kind: "queue",
    entityOrder: [],
    ...config,
  };
}
```

### 4. Mutation in Immer Drafts

Space functions mutate in-place (intended for Immer drafts):

```typescript
// Pure (outside Immer)
const newSpace = { ...space };
queueAdd(newSpace, entityId);

// Mutating (inside Immer draft)
queueAdd(draft.spaces[id], entityId);
```

### 5. Polymorphic Support

Update polymorphic dispatchers to support your new space:

```typescript
export function spaceContains(space: SpaceData, entityId: string): boolean {
  if (isQueueSpace(space)) return queueContains(space, entityId);
  // ... other space types
}
```

## Common Space Patterns

### Grid Variants

- **HexGridSpace**: Hexagonal tile grids
- **IsometricGridSpace**: 2.5D isometric layouts
- **InfiniteGridSpace**: Dynamically expanding grids

### Collections

- **StackSpaceData**: LIFO ordering (extend queue with fifo: false)
- **PriorityQueueSpace**: Priority-based ordering
- **SetSpaceData**: Unique, unordered entities

### Graphs

- **TreeSpaceData**: Hierarchical parent-child relationships
- **GraphSpaceData**: Arbitrary node connections
- **PathSpaceData**: Directed paths through nodes

## Checklist

Before submitting your new space:

- [ ] Type defined with `kind` discriminator
- [ ] Added to `SpaceData` union
- [ ] Type guard implemented (`isQueueSpace`)
- [ ] Factory function implemented (`createQueueSpaceData`)
- [ ] Space functions implemented in `space-fns.ts`
- [ ] Polymorphic dispatchers updated
- [ ] Exports added to `index.ts`
- [ ] View component created
- [ ] Unit tests written (80%+ coverage)
- [ ] JSDoc comments added
- [ ] Example usage documented

## See Also

- [Space Architecture](./09-space-architecture.md)
- [State Management](./03-state-management.md)
- [Core Concepts](./02-core-concepts.md)