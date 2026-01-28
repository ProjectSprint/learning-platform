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
   - Puzzle system fundamentals
   - Inventory system
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
   - Puzzle actions (PLACE_ITEM, REMOVE_ITEM, etc.)
   - Inventory actions
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

// Components
import { PuzzleBoard } from '@/components/game/puzzle/board';
import { InventoryPanel } from '@/components/game/puzzle/inventory';
import { TerminalView } from '@/components/game/terminal';

// Types
import type {
  GameState,
  GameAction,
  PuzzleConfig,
  InventoryItem,
  ModalInstance
} from '@/components/game/game-provider';
```

### Basic Setup

```tsx
import { GameProvider, useGameDispatch } from '@/components/game/game-provider';

function App() {
  return (
    <GameProvider>
      <YourGame />
    </GameProvider>
  );
}

function YourGame() {
  const dispatch = useGameDispatch();

  // Initialize game
  useEffect(() => {
    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'game-1',
        canvases: {
          'puzzle-1': {
            id: 'puzzle-1',
            columns: 5,
            rows: 4
          }
        },
        inventoryGroups: [
          {
            id: 'items',
            title: 'Items',
            items: [/* ... */]
          }
        ],
        phase: 'playing'
      }
    });
  }, [dispatch]);

  return <div>Your game content</div>;
}
```

---

## Feature Matrix

| Feature | Supported | Documentation |
|---------|-----------|---------------|
| Single puzzle | ✅ Yes | [State Management](./03-state-management.md) |
| Multiple puzzles | ✅ Yes | [State Management](./03-state-management.md#multi-puzzle-management) |
| Drag and drop | ✅ Yes | [Engines](./05-engines.md#drag-engine) |
| Terminal interface | ✅ Yes | [Engines](./05-engines.md#terminal-engine) |
| Modal dialogs | ✅ Yes | [Core Concepts](./02-core-concepts.md#modal-system) |
| Inventory management | ✅ Yes | [Core Concepts](./02-core-concepts.md#inventory-system) |
| Item validation | ✅ Yes | [Limitations](./06-limitations.md#validation-rules) |
| Custom engines | ✅ Yes | [Engines](./05-engines.md#creating-custom-engines) |
| State persistence | ⚠️ Manual | [Limitations](./06-limitations.md#5-no-built-in-persistence) |
| Undo/Redo | ❌ No | [Limitations](./06-limitations.md#2-no-undoredo) |
| Multiplayer | ❌ No | - |

---

## Common Use Cases

### Network Topology Builder
Build interactive network diagrams with drag-and-drop device placement.

**See:** [Usage Guide - Network Topology Example](./07-usage-guide.md#example-1-network-topology-builder)

**Key Features:**
- Drag and drop network devices
- Multi-item inventory
- Item validation
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

### Puzzle Games
Create grid-based puzzle games with item placement.

**See:** [Usage Guide - Drag and Drop Game](./07-usage-guide.md#pattern-1-drag-and-drop-game)

**Key Features:**
- Grid-based layout
- Item placement rules
- Completion checking
- Score tracking

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     GameProvider                         │
│  ┌────────────────────────────────────────────────┐    │
│  │              GameState (Context)               │    │
│  │                                                 │    │
│  │  • phase                                        │    │
│  │  • inventory { groups }                        │    │
│  │  • puzzle / puzzles                            │    │
│  │  • terminal                                    │    │
│  │  • overlay (modals)                            │    │
│  │  • question                                    │    │
│  └────────────────────────────────────────────────┘    │
│                          │                               │
│                          ↓                               │
│  ┌────────────────────────────────────────────────┐    │
│  │           Reducer Pipeline                     │    │
│  │                                                 │    │
│  │  CoreReducer → InventoryReducer → PuzzleReducer  │
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
    │ • PuzzleBoard│                  │ • Terminal  │
    │ • Inventory  │                  │ • Drag      │
    │ • Terminal   │                  │ • Custom    │
    │ • Modal      │                  │             │
    └──────────────┘                  └─────────────┘
```

---

## Capabilities Summary

### ✅ What the Engine Can Do

1. **Puzzle Management**
   - Create single or multiple puzzle boards
   - Configure grid size (columns × rows)
   - Set maximum item limits per puzzle
   - Support horizontal/vertical orientation
   - Initialize with pre-placed items

2. **Item Management**
   - Organize items in groups
   - Control item visibility
   - Track item quantities
   - Define placement rules (allowedPlaces)
   - Store custom metadata
   - Display icons (emoji or lucide)

3. **Item Interactions**
   - Place items from inventory to puzzle
   - Remove items from puzzle
   - Reposition items on same puzzle
   - Transfer items between puzzles
   - Swap items
   - Configure placed items

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
