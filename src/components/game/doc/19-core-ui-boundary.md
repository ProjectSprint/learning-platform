# Core vs UI Responsibilities (Interaction Split)

This document defines the boundary between **core state** (progression) and
**UI interaction** (transient, local).

## Principles
- Core tracks **progression-relevant facts only**.
- UI owns **transient interaction** and derives visuals locally.
- Core provides **pure helpers** for validation, but does not store hover/preview.

## Core Responsibilities
- Final placements (which entity is in which space, at which grid position).
- Progression state (phase, completion, modal submissions that advance the state).
- Validation helpers (e.g. `canEntityBePlaced`).
- Events for progression-relevant transitions:
  - `ENTITY_ENTERED_SPACE`, `ENTITY_MOVED`, `ENTITY_LEFT_SPACE`
  - `MODAL_SUBMITTED`, `PHASE_CHANGED`

## UI Responsibilities
- Pointer position, hover highlights, drag previews.
- Drag proxy position, ghost rendering, drop animations.
- Layout-driven behavior (drawer hover/fold, responsive visuals).
- Drawer open/close state and events (handled by DrawerProvider).
- Hint visibility/content (handled by HintProvider).
- Terminal visibility/prompt/history (handled by TerminalProvider).
- Arrow rendering derived from DOM positions.

## Drag Pipeline (Current Model)
1. UI starts drag in `DragContext` (local state).
2. UI computes hover/target locally (no core event).
3. On drop, UI dispatches **final placement** action:
   - `ADD_ENTITY_TO_SPACE`
   - `MOVE_ENTITY_BETWEEN_SPACES`
   - `UPDATE_ENTITY_POSITION`
4. Core emits progression-relevant events (e.g. `ENTITY_MOVED`).

## Event Policy
- **No GameEvents for drag start/end** (UI-local only).
- GameEvents exist only for changes that matter to progression or state history.
