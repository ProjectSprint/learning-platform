# Game UI Components — Overview

This document provides the **big picture** of the game UI architecture.
Each component has its own detailed specification linked below.

---

## Purpose

- Prevent architectural drift
- Prevent AI hallucination
- Make component boundaries explicit and enforceable

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                      │
├───────────────┬─────────────────────────────────────────────────────────────┤
│               │                                                             │
│   INVENTORY   │                      PLAY CANVAS                            │
│   PANEL       │                                                             │
│               │      ┌───────┐                   ┌────────────┐             │
│   ┌───────┐   │      │ PC-1  │───────────────────│   Router   │             │
│   │ PC-1  │   │      │  ✓    │                   │     ✓      │             │
│   └───────┘   │      └───────┘                   └─────┬──────┘             │
│   ┌───────┐   │                                        │                    │
│   │ PC-2  │   │                                  ┌─────┴──────┐             │
│   └───────┘   │                                  │    PC-2    │             │
│   ┌───────┐   │                                  │     ✓      │             │
│   │ Cable │   │                                  └────────────┘             │
│   └───────┘   │                                                             │
│   ┌───────┐   │                                                             │
│   │ Cable │   │                                                             │
│   └───────┘   │                                                             │
│   ┌───────┐   │                                                             │
│   │Router │   │                                                             │
│   └───────┘   │                                                             │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│ TERMINAL PANEL                                                              │
│                                                                             │
│ How can you check that PC-1 is connected to PC-2?                           │
│                                                                             │
│ > ping PC-2                                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ OVERLAY LAYER (modals, toasts — renders above everything)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
GameProvider
└── GameLayout
    ├── InventoryPanel
    │   └── InventoryItem (×n)
    │
    ├── PlayCanvas (uses Canvas Block System)
    │   ├── Block (×n)
    │   ├── PlacedItem (×n)
    │   └── Connection (×n)
    │
    ├── TerminalLayout
    ├── TerminalView
    ├── TerminalInput
    │
    └── OverlayLayer
        ├── ConfigModal
        │   └── RouterConfigForm / PCConfigForm / etc.
        ├── HintToast
        └── SuccessModal
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GameProvider                                   │
│                           (state + dispatch)                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌─────────────┐   ┌───────────┐
            │ Inventory │   │ PlayCanvas  │   │ Terminal  │
            │   Panel   │   │             │   │   Panel   │
            └─────┬─────┘   └──────┬──────┘   └─────┬─────┘
                  │                │                │
                  │ drag           │ events         │ input
                  │                │                │
                  ▼                ▼                ▼
            ┌─────────────────────────────────────────────┐
            │              dispatch(action)               │
            └─────────────────────────────────────────────┘
                                    │
                                    ▼
            ┌─────────────────────────────────────────────┐
            │              GameProvider                   │
            │         (reducer updates state)             │
            └─────────────────────────────────────────────┘
                                    │
                                    ▼
            ┌─────────────────────────────────────────────┐
            │          UI re-renders from state           │
            └─────────────────────────────────────────────┘
```

---

## Component Specs

| Component       | Spec                                        | Responsibility                    |
| --------------- | ------------------------------------------- | --------------------------------- |
| GameProvider    | [game-provider.md](./game-provider.md)      | State management, context         |
| GameLayout      | [game-layout.md](./game-layout.md)          | Structural layout, modularity     |
| InventoryPanel  | [inventory-panel.md](./inventory-panel.md)  | Drag source, item list            |
| PlayCanvas      | [canvas-blocks.md](./canvas-blocks.md)      | Drop target, grid, connections    |
| TerminalLayout  | [terminal-panel.md](./terminal-panel.md)    | Terminal shell with view + input  |
| TerminalView    | [terminal-panel.md](./terminal-panel.md)    | Terminal history display          |
| TerminalInput   | [terminal-panel.md](./terminal-panel.md)    | Terminal input line               |
| OverlayLayer    | [overlay-layer.md](./overlay-layer.md)      | Modals, toasts, hints             |

---

## General Rules (Apply to All Components)

### Allowed

- React functional components
- Props, context, and dispatched actions
- Deterministic rendering from state

### Required

- Use Chakra UI components from `components/ui` for all UI primitives
- Keep GSAP imports inside game UI components (InventoryPanel, PlayCanvas, OverlayLayer)
- Use the shared `gsap-drag` helper for Draggable + Inertia registration and grid snap math

### Forbidden

- Implicit state coupling
- DOM-driven logic
- Cross-component side effects
- GSAP callbacks mutating state
- Raw HTML elements when Chakra UI equivalent exists

---

## Enforcement Rule

If a component:

- Imports logic it does not own
- Mutates state it does not control
- Infers behavior not visible in props/state

→ **the implementation is invalid.**

---

## Related Specs

- [Question & Terminal Logic](../../routes/questions/networking/doc.md) — validation and command parsing
