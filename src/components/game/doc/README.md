# Game Engine Documentation

Complete documentation for the interactive game engine framework.

## Table of Contents

### Getting Started

1. **[Overview](./01-overview.md)**
   - Introduction to the game engine
   - Key features and capabilities
   - Architecture overview
   - Directory structure

2. **[Core Concepts](./02-core-concepts.md)**
   - Game state structure
   - Game phases
   - Actions and dispatch
   - Space/Entity architecture
   - Terminal system
   - Modal system
   - Engines

### Reference Documentation

3. **[State Management](./03-state-management.md)**
   - Provider setup
   - Accessing state
   - Dispatching actions
   - Multi-puzzle management
   - State immutability
   - Performance considerations

4. **[Actions API](./04-actions-api.md)**
   - Core actions
   - Space actions (add entity, remove entity, move entity)
   - Entity actions
   - Terminal actions
   - Modal actions
   - Action patterns and examples

5. **[Engines](./05-engines.md)**
   - Engine lifecycle
   - Terminal Engine
   - Drag Engine
   - Creating custom engines
   - Engine patterns

6. **[Limitations](./06-limitations.md)**
   - System limits
   - Validation rules
   - Known limitations
   - Performance considerations
   - Browser compatibility
   - Security considerations

### Practical Guides

7. **[Usage Guide](./07-usage-guide.md)**
   - Quick start
   - Common patterns
   - Complete examples
   - Best practices

8. **[API Contract](./08-api-contract.md)**
   - State guarantees
   - Action contracts
   - Engine contracts
   - Validation rules
   - Error handling
   - Type safety

---

## Quick Reference

### Essential Imports

```tsx
// Core provider and hooks
import {
  GameProvider,
  useGameState,
  useGameDispatch,
  usePuzzleState,
  useAllPuzzles
} from '@/components/game/game-provider';

// Engines
import { useTerminalEngine } from '@/components/game/engines/terminal/use-terminal-engine';
import { useDragEngine } from '@/components/game/engines/drag/use-drag-engine';

// Space/Entity Components
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { PoolSpaceView } from '@/components/game/presentation/space/PoolSpaceView';
import { TerminalView } from '@/components/game/presentation/terminal';

// Domain Models
import { GridSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';

// Types
import type {
  GameState,
  GameAction,
  ModalInstance
} from '@/components/game/game-provider';
```

### Basic Setup

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { GridSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { useSpace } from '@/components/game/hooks';

function App() {
  return (
    <GameProvider>
      <YourGame />
    </GameProvider>
  );
}

function YourGame() {
  const [spaces, setSpaces] = useState({});

  useEffect(() => {
    // Create a grid space
    const gridSpace = new GridSpace({
      id: 'game-grid',
      rows: 4,
      cols: 5,
      metrics: {
        cellWidth: 64,
        cellHeight: 64,
        gapX: 4,
        gapY: 4,
      },
    });

    // Create entities
    const entity = new Entity({
      id: 'item-1',
      type: 'game-piece',
      visual: { icon: '🎮' },
    });

    setSpaces({ 'game-grid': gridSpace });
  }, []);

  return (
    <div>
      {spaces['game-grid'] && (
        <GridSpaceView space={spaces['game-grid']} />
      )}
    </div>
  );
}
```

---

## Feature Matrix

| Feature | Supported | Documentation |
|---------|-----------|---------------|
| GridSpace (2D layouts) | ✅ Yes | [Space Architecture](./09-space-architecture.md) |
| PoolSpace (collections) | ✅ Yes | [Space Architecture](./09-space-architecture.md) |
| Multiple spaces | ✅ Yes | [Space Architecture](./09-space-architecture.md) |
| Drag and drop | ✅ Yes | [Engines](./05-engines.md#drag-engine) |
| Terminal interface | ✅ Yes | [Engines](./05-engines.md#terminal-engine) |
| Modal dialogs | ✅ Yes | [Core Concepts](./02-core-concepts.md#modal-system) |
| Entity management | ✅ Yes | [Space Architecture](./09-space-architecture.md) |
| Custom spaces | ✅ Yes | [Adding New Spaces](./10-adding-new-spaces.md) |
| State persistence | ⚠️ Manual | [Limitations](./06-limitations.md#5-no-built-in-persistence) |
| Undo/Redo | ❌ No | [Limitations](./06-limitations.md#2-no-undoredo) |
| Multiplayer | ❌ No | - |

---

## Common Use Cases

### Network Topology Builder
Build interactive network diagrams with drag-and-drop device placement.

**See:** [Space Architecture](./09-space-architecture.md)

**Key Features:**
- GridSpace for network layout
- Entity-based devices
- Position validation
- Completion detection

### Terminal Simulator
Create command-line interface simulations for learning.

**See:** [Usage Guide - Command-Line Example](./07-usage-guide.md#example-2-command-line-simulation)

**Key Features:**
- Command parsing
- Output formatting
- Command history
- Custom commands

### Configuration Wizard
Guide users through device or system configuration.

**See:** [Usage Guide - Modal Configuration](./07-usage-guide.md#pattern-4-modal-configuration)

**Key Features:**
- Multi-field forms
- Field validation
- Conditional logic
- Data persistence

### Interactive Games
Create grid-based games with entity placement and interaction.

**See:** [Space Architecture](./09-space-architecture.md)

**Key Features:**
- Flexible space types (Grid, Pool, custom)
- Entity state management
- Placement constraints
- Completion checking

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     GameProvider                         │
│  ┌────────────────────────────────────────────────┐    │
│  │              GameState (Context)               │    │
│  │                                                 │    │
│  │  • phase                                        │    │
│  │  • spaces { [id]: Space }                      │    │
│  │  • entities { [id]: Entity }                   │    │
│  │  • terminal                                    │    │
│  │  • overlay (modals)                            │    │
│  │  • question                                    │    │
│  └────────────────────────────────────────────────┘    │
│                          │                               │
│                          ↓                               │
│  ┌────────────────────────────────────────────────┐    │
│  │           Reducer Pipeline                     │    │
│  │                                                 │    │
│  │  CoreReducer → SpaceReducer → EntityReducer      │
│  │  → TerminalReducer → ModalReducer             │    │
│  └────────────────────────────────────────────────┘    │
│                          ↑                               │
│                          │                               │
│  ┌────────────────────────────────────────────────┐    │
│  │           dispatch(GameAction)                 │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴────────────────┐
           │                                 │
    ┌──────▼──────┐                  ┌──────▼──────┐
    │  Components  │                  │   Engines   │
    │              │                  │             │
    │ • SpaceView  │                  │ • Terminal  │
    │ • EntityCard │                  │ • Drag      │
    │ • Terminal   │                  │ • Custom    │
    │ • Modal      │                  │             │
    └──────────────┘                  └─────────────┘
```

---

## Capabilities Summary

### ✅ What the Engine Can Do

1. **Space Management**
   - Create multiple spaces (Grid, Pool, custom types)
   - Configure space dimensions and constraints
   - Set capacity limits per space
   - Support different layouts (grid, flow, custom)
   - Position entities within spaces

2. **Entity Management**
   - Create entities with types and properties
   - Store entity state (dynamic data)
   - Store entity data (static properties)
   - Visual configuration (icons, colors)
   - Behavior attachment

3. **Entity Interactions**
   - Add entities to spaces
   - Remove entities from spaces
   - Move entities within/between spaces
   - Query entity positions
   - Update entity state
   - Validate placements

4. **Terminal Features**
   - Process user commands
   - Display output, errors, hints
   - Maintain command history
   - Clear history
   - Customizable prompt

5. **Modal System**
   - Create data-driven modals
   - Multiple field types
   - Field validation
   - Custom actions with callbacks
   - Blocking modals

6. **Game Flow**
   - Five distinct game phases
   - Question tracking
   - Completion detection
   - Action sequencing

7. **Engines**
   - Terminal command processing
   - Drag-and-drop tracking
   - Lifecycle management (pending → started → finished)
   - Custom engine creation

### ⚠️ What the Engine Cannot Do

1. **No Network/Multiplayer**
   - No built-in server communication
   - No real-time collaboration
   - No player synchronization

2. **No Animations**
   - No built-in item animations
   - No transition effects
   - UI layer handles animations

3. **No Persistence**
   - No automatic state saving
   - No localStorage integration
   - Must implement manually

4. **No Undo/Redo**
   - No built-in history tracking
   - No action reversal
   - Must implement manually

5. **Limited Drag Constraints**
   - No grid snapping
   - No drag boundaries
   - Implemented in UI layer

6. **Single Modal Only**
   - Only one modal at a time
   - No modal stacking
   - No nested modals

---

## Getting Help

### Troubleshooting

1. **Check the documentation section that matches your issue:**
   - State not updating? → [State Management](./03-state-management.md)
   - Action not working? → [Actions API](./04-actions-api.md)
   - Validation failing? → [Limitations](./06-limitations.md#validation-rules)
   - Engine not starting? → [Engines](./05-engines.md)

2. **Common Issues:**
   - Item won't place → Check `allowedPlaces` and block availability
   - Terminal not responding → Ensure terminal engine is initialized
   - Modal not closing → Check `closesModal` flag on actions
   - Puzzle not found → Verify `puzzleId` matches canvas ID

### Code Examples

Every documentation page includes practical examples. Start with:
- [Usage Guide](./07-usage-guide.md) - Complete working examples
- [Actions API](./04-actions-api.md) - Action usage examples
- [Engines](./05-engines.md) - Engine patterns

---

## Contributing to Documentation

If you find issues or want to improve this documentation:

1. Documentation is located in `src/components/game/doc/`
2. Each file covers a specific topic
3. Follow the existing structure and formatting
4. Include code examples where relevant
5. Keep examples practical and tested

---

## Version Information

This documentation reflects the current state of the game engine as of the latest refactoring.

**Last Updated:** 2026-01-29

**Engine Version:** Post-refactoring (multi-puzzle support, modal system, engines)

---

## License

This documentation and the game engine are part of the learning platform project.
