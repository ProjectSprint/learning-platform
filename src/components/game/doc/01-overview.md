# Game Engine Overview

## Introduction

The Game Engine is a state-driven, React-based framework for building interactive educational puzzle games. It provides a complete system for managing game state, user interactions, inventory, terminals, and modals through a centralized action-dispatch architecture.

## Key Features

### 1. **Multi-Canvas Puzzle System**
- Support for multiple independent puzzle boards
- Grid-based layout with configurable rows and columns
- Drag-and-drop item placement
- Item validation and placement rules
- Item transfer between puzzle canvases

### 2. **Inventory Management**
- Organized item groups with visibility controls
- Item quantity tracking
- Drag-and-drop from inventory to puzzle
- Item purging and group management
- Configurable item metadata and icons

### 3. **Terminal Interface**
- Command-line style interaction
- Command history tracking
- Multiple output types (output, error, hint)
- Customizable prompt
- Clear history functionality

### 4. **Modal System**
- Data-driven modal definitions
- Multiple field types (text, textarea, checkbox, select, readonly)
- Field validation
- Custom actions with callbacks
- Blocking and non-blocking modals

### 5. **Engine Lifecycle Management**
- Terminal Engine for command processing
- Drag Engine for puzzle interactions
- Progress tracking (pending → started → finished)
- Lifecycle callbacks (onStarted, onFinished)

### 6. **Game Phases**
The engine supports distinct game phases:
- `setup` - Initial configuration
- `configuring` - User customization phase
- `playing` - Active gameplay
- `terminal` - Terminal-focused mode
- `completed` - Game finished

## Architecture

```
┌─────────────────────────────────────────┐
│         GameProvider (Context)          │
│                                         │
│  ┌───────────┐      ┌───────────┐     │
│  │GameState  │◄────►│  Reducer  │     │
│  └───────────┘      └───────────┘     │
│                           ▲             │
│                           │             │
│  ┌────────────────────────┴──────────┐ │
│  │        GameAction (Dispatch)      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │                    │
    ┌──────▼────────┐    ┌─────▼──────┐
    │  Components   │    │  Engines   │
    │  (UI Layer)   │    │  (Logic)   │
    └───────────────┘    └────────────┘
```

### Core Principles

1. **Unidirectional Data Flow**: All state changes flow through actions
2. **Centralized State**: Single source of truth via React Context
3. **Type Safety**: Full TypeScript support with strict types
4. **Validation**: Built-in sanitization and validation
5. **Extensibility**: Plugin-style engines for custom behavior

## Getting Started

```tsx
import { GameProvider, useGameState, useGameDispatch } from '@/components/game/game-provider';

function App() {
  return (
    <GameProvider>
      <YourGameComponent />
    </GameProvider>
  );
}

function YourGameComponent() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  // Access state and dispatch actions
  return <div>...</div>;
}
```

## Directory Structure

```
game/
├── core/
│   ├── types/          # TypeScript type definitions
│   ├── actions/        # Action type definitions
│   └── reducers/       # State reducers
├── engines/            # Engine implementations
│   ├── terminal/       # Terminal engine
│   └── drag/          # Drag-and-drop engine
├── puzzle/            # Puzzle components
│   ├── grid/          # Grid system
│   ├── board/         # Board components
│   ├── drag/          # Drag system
│   └── inventory/     # Inventory UI
├── terminal/          # Terminal UI
├── modal/             # Modal system
├── validation/        # Validation utilities
└── doc/              # Documentation (you are here)
```

## What's Next

- [Core Concepts](./02-core-concepts.md) - Understanding the fundamental concepts
- [State Management](./03-state-management.md) - How state is organized
- [Actions API](./04-actions-api.md) - Available actions and how to use them
- [Engines](./05-engines.md) - Terminal and Drag engines
- [Usage Guide](./09-usage-guide.md) - Practical examples
