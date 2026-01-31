# Game Engine Architecture - Quick Reference

This guide helps you understand where to place new code in the game engine.

## 📁 Folder Structure

```
src/components/game/
├── domain/              # Business Logic
├── infrastructure/      # Low-Level Utilities
├── application/         # State Management
├── presentation/        # UI Components
├── core/               # Foundation (types, providers)
├── engines/            # Specialized Mechanics
├── ui/                 # Shared UI Widgets
└── doc/                # Documentation
```

## 🎯 Where Does New Code Go?

### Business Logic → `domain/`
**What belongs here:**
- Entity models (routers, packets, devices)
- Space models (GridSpace, PoolSpace, QueueSpace)
- Behavior systems
- Question specifications (AST, rules)
- Validation rules (sanitization, normalization)

**Examples:**
```typescript
// domain/entity/Entity.ts
export class Entity {
  constructor(config: EntityConfig) { /* ... */ }
}

// domain/space/GridSpace.ts
export class GridSpace extends Space {
  add(entity: Entity, position: GridPosition) { /* ... */ }
}

// domain/question/question-ast.ts
export const evaluateCondition = (condition, context) => { /* ... */ }

// domain/validation/sanitize.ts
export const sanitizeText = (text: string) => { /* ... */ }
```

---

### Low-Level Utilities → `infrastructure/`
**What belongs here:**
- Grid mathematics
- Coordinate systems
- Geometry calculations
- Data structures

**Examples:**
```typescript
// infrastructure/grid/SquareGrid.ts
export class SquareGrid<T> implements GridBase<T> {
  coordToPixel(coord: GridCoordinate): Point2D { /* ... */ }
}

// infrastructure/geometry/Point2D.ts
export const distance = (a: Point2D, b: Point2D) => { /* ... */ }
```

---

### State Management → `application/`
**What belongs here:**
- React hooks (useSpace, useEntity)
- Redux actions
- Redux reducers
- State selectors

**Examples:**
```typescript
// application/hooks/useSpace.ts
export const useSpace = (spaceId: string) => { /* ... */ }

// application/actions/arrows.ts
export const setBoardArrows = (dispatch, arrows) => { /* ... */ }

// application/state/reducers/space.ts
export const spaceReducer = (state, action) => { /* ... */ }
```

---

### UI Components → `presentation/`
**What belongs here:**
- Space view components (GridSpaceView, PoolSpaceView)
- Entity view components (EntityCard)
- Terminal UI (input, layout, view)
- Hint UI (contextual hints)
- Modal UI (dialogs, forms)
- Drag-and-drop overlays

**Examples:**
```typescript
// presentation/space/GridSpaceView.tsx
export const GridSpaceView = ({ space }: Props) => { /* ... */ }

// presentation/terminal/view.tsx
export const TerminalView = () => { /* ... */ }

// presentation/modal/modal.tsx
export const Modal = () => { /* ... */ }
```

---

### Foundation → `core/`
**What belongs here:**
- TypeScript type definitions (GameState, GameAction)
- Game provider (React Context)
- Constants
- Legacy compatibility utilities

**Examples:**
```typescript
// core/types/state.ts
export type GameState = { /* ... */ }

// core/game-provider.tsx
export const GameProvider = ({ children }) => { /* ... */ }
```

---

### Specialized Mechanics → `engines/`
**What belongs here:**
- Terminal command processor
- Drag-and-drop engine
- Game-specific mechanics

**Examples:**
```typescript
// engines/terminal/use-terminal-engine.ts
export const useTerminalEngine = (config) => { /* ... */ }

// engines/drag/use-drag-engine.ts
export const useDragEngine = (config) => { /* ... */ }
```

---

### Shared UI Widgets → `ui/`
**What belongs here:**
- Help components (HelpLink, InfoTooltip)
- Reusable UI elements used across features

**Examples:**
```typescript
// ui/help/help-components.tsx
export const HelpLink = ({ href, label }) => { /* ... */ }
export const InfoTooltip = ({ text }) => { /* ... */ }
```

---

## 🔄 Data Flow Example

```
User Action
    ↓
[presentation/] Component dispatches action
    ↓
[application/] Action → Reducer
    ↓
[domain/] Business logic executes
    ↓
[infrastructure/] Grid math validates
    ↓
[application/] New state returned
    ↓
[presentation/] Component re-renders
```

---

## 📋 Decision Tree

**I'm adding...**

| What? | Where? | Example |
|-------|--------|---------|
| New game object type | `domain/entity/` | Router, Packet, Cable |
| New container type | `domain/space/` | QueueSpace, TreeSpace |
| Grid coordinate math | `infrastructure/grid/` | Distance calculations |
| React component for rendering | `presentation/` | EntityCard, GridView |
| Redux action/reducer | `application/state/` | spaceAddEntity action |
| Command processor | `engines/` | Custom game mechanic |
| Reusable UI widget | `ui/` | Custom tooltip |

---

## ✅ Architecture Rules

1. **Unidirectional dependencies** - Upper layers import from lower layers, never reverse:
   ```
   presentation → application → domain → infrastructure
   ```

2. **Domain is pure** - No React, no UI code in domain/
3. **Infrastructure is reusable** - No business logic in infrastructure/
4. **Presentation is thin** - Just rendering and event handling
5. **Application orchestrates** - Connects UI to domain

---

## 🚫 Anti-Patterns

**❌ Don't:**
- Put UI code in domain/ (e.g., `<Button>` in Entity class)
- Put business logic in presentation/ (e.g., validation in components)
- Import from presentation/ in domain/ (violates unidirectional flow)
- Create "utils" folders - be specific about layer

**✅ Do:**
- Keep layers separate and focused
- Follow existing patterns (domain/space ↔ presentation/space)
- Use index.ts for convenient imports
- Document public APIs with JSDoc

---

## 📚 More Documentation

- [Space Architecture](./doc/09-space-architecture.md) - Space/Entity patterns
- [Adding New Spaces](./doc/10-adding-new-spaces.md) - How-to guide
- [State Management](./doc/03-state-management.md) - Redux patterns
- [Core Concepts](./doc/02-core-concepts.md) - Fundamentals

---

## 🎓 Learning Path

1. **Start here:** [Overview](./doc/01-overview.md)
2. **Understand core:** [Core Concepts](./doc/02-core-concepts.md)
3. **See patterns:** [Space Architecture](./doc/09-space-architecture.md)
4. **Build something:** [Adding New Spaces](./doc/10-adding-new-spaces.md)

---

**Last Updated:** 2026-02-01
**Architecture Version:** Post-refactoring (integrated folders)
