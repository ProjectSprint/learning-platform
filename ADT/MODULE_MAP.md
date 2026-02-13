# ADT Module Map

This folder is now split by dependency layer so behavior and state flow are easier to trace.

## Files
- `ADT/GameEngine/Types.hs`
  - All algebraic data types: domain model, events, actions, behavior rule types, runtime command intents.
  - Small structural helpers (`getEntityCore`, `entityIdOf`, `spaceIdOf`).

- `ADT/GameEngine/EventQueue.hs`
  - Event queue primitives:
    - `getNextActionId`
    - `appendEvents`
    - `pendingEventsFor`
    - `ackEvents`

- `ADT/GameEngine/Behavior.hs`
  - Rule engine matching:
    - `matchesTrigger`
    - `runBehaviorEvent`
  - Mirrors the first-match-wins behavior reactor semantics.

- `ADT/GameEngine/Reducer.hs`
  - Pure transition layer:
    - `applyAction`
    - `applyActions`
  - Includes helper functions for space/entity updates and modal transitions.

- `ADT/GameEngine.hs`
  - Facade that re-exports all modules.

## Dependency Direction
`Types` <- `EventQueue` <- `Reducer`
`Types` <- `Behavior`
`GameEngine` re-exports all.

## Recommended Reading Order
1. `ADT/GameEngine/Types.hs`
2. `ADT/GameEngine/Behavior.hs`
3. `ADT/GameEngine/EventQueue.hs`
4. `ADT/GameEngine/Reducer.hs`
