# Domain Layer

The domain layer contains the core business logic and domain models for the game system. It provides abstractions for organizing game entities in different spatial configurations and defining behaviors.

## Architecture Overview

```
domain/
├── space/          # Containers that organize entities
│   ├── Space.ts         # Abstract base class
│   ├── GridSpace.ts     # 2D grid organization (composes SquareGrid)
│   ├── PoolSpace.ts     # Unordered collection (current inventory)
│   ├── QueueSpace.ts    # FIFO/LIFO queue (stub)
│   └── PathSpace.ts     # Movement along paths (stub)
├── entity/         # Game objects that exist in spaces
│   ├── Entity.ts        # Base entity class
│   └── Item.ts          # Item entity (maps current inventory items)
└── behavior/       # Actions that entities can perform
    └── Behavior.ts      # Behavior interface and base implementation
```

## Key Concepts

### Space

A **Space** is a container that organizes entities. Different space types provide different organization strategies:

- **GridSpace**: 2D grid with positional constraints (e.g., puzzle boards)
- **PoolSpace**: Unordered collection without positions (e.g., inventory)
- **QueueSpace**: FIFO/LIFO ordered collection (stub - for future use)
- **PathSpace**: Sequential positions along a path (stub - for future use)

All spaces share a common interface:
- `add(entity, position?)`: Add an entity to the space
- `remove(entity)`: Remove an entity from the space
- `contains(entity)`: Check if space contains an entity
- `getPosition(entity)`: Get entity's position in the space
- `setPosition(entity, position)`: Move entity to a new position
- `canAccept(entity, position?)`: Check if entity can be added
- `capacity()`: Get current and maximum capacity
- `getEntities()`: Get all entities in the space

### Entity

An **Entity** is any game object that can exist in a space. The base `Entity` class provides:

- **Identity**: Unique ID and type
- **State Management**: Dynamic state that can change during gameplay
- **Behaviors**: Actions the entity can perform
- **Visual Properties**: Rendering hints (icon, color, size, etc.)
- **Custom Data**: Type-specific data

The `Item` class extends `Entity` and maps to the current inventory system:
- Maps current `Item` type from `inventory.ts`
- Includes `allowedPlaces`, `icon`, `tooltip`, `draggable`
- Provides migration helpers: `fromLegacyItem()` and `toLegacyItem()`

### Behavior

A **Behavior** defines an action that an entity can perform. The behavior system provides:

- `canExecute(context)`: Check if behavior can run in current context
- `execute(context)`: Execute the behavior
- `animate(context)`: Get animation data for visualization

This is currently a stub implementation - full functionality will be added in a future phase.

## Usage Examples

### Creating a Pool Space (Inventory)

```typescript
import { PoolSpace, Item } from "@/components/game/domain";

// Create a pool space (like the current inventory)
const inventory = new PoolSpace({
  id: "player-inventory",
  name: "Inventory",
  maxCapacity: 20,
  layout: "grid",
  columns: 4,
});

// Create an item
const router = new Item({
  id: "router-1",
  name: "Router",
  allowedPlaces: ["network-puzzle"],
  icon: { name: "router" },
  tooltip: { content: "A network router" },
  draggable: true,
});

// Add item to inventory
inventory.add(router);

// Check capacity
console.log(inventory.capacity()); // { current: 1, max: 20 }
```

### Creating a Grid Space (Puzzle Board)

```typescript
import { GridSpace, Item } from "@/components/game/domain";

// Create a grid space (like a puzzle board)
const puzzleBoard = new GridSpace({
  id: "network-puzzle",
  name: "Network Puzzle",
  rows: 5,
  cols: 5,
  metrics: {
    cellWidth: 64,
    cellHeight: 64,
    gapX: 4,
    gapY: 4,
  },
  allowMultiplePerCell: false,
});

// Place an item at a specific position
const position = { row: 2, col: 3 };
puzzleBoard.add(router, position);

// Check if position is occupied
console.log(puzzleBoard.isOccupied(position)); // true

// Get all empty positions
const emptySpots = puzzleBoard.getEmptyPositions();
```

### Working with Entity State

```typescript
import { Entity } from "@/components/game/domain";

const server = new Entity({
  id: "server-1",
  type: "server",
  name: "Web Server",
  state: {
    running: false,
    connections: 0,
    load: 0,
  },
});

// Update state
server.setStateValue("running", true);
server.updateState({ connections: 5, load: 0.3 });

// Get state
console.log(server.getStateValue("running")); // true
console.log(server.getState()); // { running: true, connections: 5, load: 0.3 }
```

### Migrating from Legacy Items

```typescript
import { Item } from "@/components/game/domain";

// Convert existing inventory item to new Item entity
const legacyItem = {
  id: "router-1",
  type: "router",
  name: "Router",
  allowedPlaces: ["network-puzzle"],
  icon: { name: "router" },
  data: { bandwidth: "1Gbps" },
};

const item = Item.fromLegacyItem(legacyItem);

// Use the new item...
// Then convert back if needed for compatibility
const backToLegacy = item.toLegacyItem();
```

## Composition Over Inheritance

The domain layer uses **composition** over inheritance:

- **GridSpace** composes `SquareGrid` from the infrastructure layer (has-a relationship)
- **Entity** composes behaviors instead of inheriting behavior-specific functionality
- This makes the system more flexible and easier to extend

## Future Enhancements

### QueueSpace (Stub)
- FIFO/LIFO queue operations
- Priority queue variant
- Useful for packet queues, task lists, etc.

### PathSpace (Stub)
- Movement along predefined paths
- Waypoint-based positioning
- Useful for network routing, conveyor belts, etc.

### Behavior System (Stub)
- Full behavior execution pipeline
- Behavior conditions and cooldowns
- Behavior composition and chaining
- Integration with animation system

## Testing

Run the integration tests:

```bash
npx vitest src/components/game/domain/__tests__/domain-integration.test.ts
```

All tests should pass, verifying:
- Entity creation and state management
- Space operations (add, remove, contains, etc.)
- Grid positioning and collision detection
- Pool capacity management
- Behavior execution

## Design Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Open/Closed**: Open for extension, closed for modification
3. **Dependency Inversion**: Depend on abstractions, not concretions
4. **Composition over Inheritance**: Use has-a instead of is-a relationships
5. **Immutability**: GridSpace operations return new instances when possible

## Migration Path

The domain layer provides a smooth migration path from the current system:

1. **Item** maps directly to the current inventory `Item` type
2. **PoolSpace** represents the current inventory system
3. **GridSpace** will replace the current puzzle board grid
4. Helper methods (`fromLegacyItem`, `toLegacyItem`) enable gradual migration

## Related Documentation

- Infrastructure Layer: `../infrastructure/README.md`
- Geometry System: `../infrastructure/geometry/README.md`
- Grid System: `../infrastructure/grid/README.md`
