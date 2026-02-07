# Game Engine Overview

## What Is This?

A **functional programming**-based React framework for building interactive educational games with networked simulations (DHCP, TCP/IP, routing, etc.).

Think: **Visual programming meets networking education** - students drag items to build network topologies, configure routers, and see packets flow in real-time.

## When To Use

✅ **Use when building:**
- Network simulation games (DHCP, DNS, routing)
- Interactive technical tutorials with drag-and-drop
- Puzzle-based learning with terminal interaction
- Games requiring complex state machines and validation

❌ **Don't use for:**
- Simple static content
- Traditional arcade games
- Projects without educational components

## Quick Start (30 Seconds)

```tsx
import { GameProvider, useGameState, useGameDispatch } from '@/components/game/game-provider';

function MyNetworkGame() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  // Spaces = game boards (router board, PC board, internet)
  // Entities = draggable items (routers, PCs, cables)
  // Actions = state changes (PLACE_ITEM, CONFIGURE_ROUTER)

  return (
    <GameProvider>
      {/* Your game UI */}
    </GameProvider>
  );
}
```

## Core Capabilities

### 1. Spaces & Entities (Not "Canvases")

**Spaces** = Game boards where items are placed
- **GridSpace**: 2D grid (e.g., network diagram with rows/cols)
- **PoolSpace**: Inventory/item pool (e.g., available equipment)

**Entities** = Draggable game objects
- Routers, PCs, cables, packets, servers
- Each has `state` (configuration), `data` (static properties), `visual` (appearance)

### 2. Functional State Management

- **Pure functions** for all operations (see [contracts/functions](../contracts/functions.md))
- **Immer.js** for mutation-like syntax with immutability
- **Action-reducer** pattern (Redux-style)
- **Event queue** for deterministic ordering

### 3. Terminal Interface

Command-line interaction within games:
```
> ping 192.168.1.1
Reply from 192.168.1.1: bytes=32 time=1ms TTL=64
> show ip route
192.168.1.0/24 via eth0
```

### 4. Modal System

Configuration dialogs for entities:
- Router DHCP configuration
- PC network settings
- Certificate requests

### 5. Engines (Reactive Automation)

Engines listen to state changes and execute logic:
- **Terminal Engine**: Process commands, maintain history
- **Drag Engine**: Handle drag-and-drop interactions
- **Custom Engines**: Build your own reactive behaviors

## Architecture at a Glance

```
Presentation (React UI)
       ↓
Application (Hooks, State Management)
       ↓
Domain (Pure Functions, Business Logic)
       ↓
Infrastructure (Grid System, Geometry)
```

**Unidirectional flow:** User action → Dispatch → Reducer → Pure functions → State update → Re-render

For details, see [Architecture](./architecture.md).

## Key Principles

1. **Functional, not Object-Oriented**
   - Plain data types (no classes)
   - Pure functions (no side effects)
   - Immutable updates (with Immer)

2. **Single Source of Truth**
   - All state in `GameState`
   - Accessed via hooks (`useGameState`, `useGameDispatch`)

3. **Type-Safe**
   - Full TypeScript
   - Discriminated unions for safety
   - Validation at boundaries

4. **Event-Driven**
   - Events emitted on state changes
   - Engines consume events
   - Deterministic ordering

## What's Next?

- **New to the engine?** → Read [Core Concepts](./core-concepts.md)
- **Building a question?** → Read [Building Questions](../guides/building-questions.md)
- **Understanding state?** → Read [State Management](../guides/state-management.md)
- **Need API details?** → Read [Contracts](../contracts/) (types, functions, actions, events)

## Real Examples

- **DHCP Question**: Demonstrates router configuration, IP assignment, ping commands
- **TCP Question**: Shows packet flow, window management, retransmission
- **Internet Gateway**: Routing, NAT, DNS resolution

See `./src/routes/questions/networking/` for complete implementations.
