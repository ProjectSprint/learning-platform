# ADT Module Map (Domain-Localized)

The ADT tree is now organized by domain so your mental model is domain-first.

## Domain Modules
- `ADT/GameEngine/Domain.hs`
  - domain facade that re-exports every `Domain/*` module

- `ADT/GameEngine/Domain/Common.hs`
  - shared IDs/scalars (`EntityId`, `SpaceId`, `Phase`, `Value`, ...)

- `ADT/GameEngine/Domain/Entity.hs`
  - entity/item types and entity-local behavior helpers
  - includes update behavior (`applyEntityUpdates`) and structural helpers (`getEntityCore`, `entityIdOf`)

- `ADT/GameEngine/Domain/Space.hs`
  - space types/configs and space-local behavior helpers
  - includes placement/capacity behavior (`gridCanAccept`, `gridAdd`, `poolAdd`, ...)

- `ADT/GameEngine/Domain/Modal.hs`
  - modal and overlay types

- `ADT/GameEngine/Domain/Event.hs`
  - event payloads and queue record types

- `ADT/GameEngine/Domain/State.hs`
  - `GameState`, `QuestionStatus`, `Action`, `emptyGameState`

- `ADT/GameEngine/Domain/Runtime.hs`
  - effect-boundary command algebra (`RuntimeCommand`, intents)

- `ADT/GameEngine/Domain/Behavior.hs`
  - behavior rule model (`EventTrigger`, contexts, `BehaviorRule`, `BehaviorDefinition`)

- `ADT/GameEngine/Domain/Question.hs`
  - declarative `QuestionDefinition` and phase/inventory/space rule AST

## Engine Modules
- `ADT/GameEngine/EventQueue.hs`
  - queue mechanics (`appendEvents`, `pendingEventsFor`, `ackEvents`)

- `ADT/GameEngine/Behavior.hs`
  - rule execution/matching engine (`runBehaviorEvent`, `matchesTrigger`)

- `ADT/GameEngine/Reducer.hs`
  - pure transitions (`applyAction`, `applyActions`)

## Facades
- `ADT/GameEngine/Types.hs`
  - backward-compatible facade that re-exports `GameEngine.Domain`

- `ADT/GameEngine.hs`
  - top-level facade (`Types` + reducer/queue/behavior engine)

## Recommended Mental Model
1. Pick a domain folder first (`Entity`, `Space`, `Behavior`, etc.).
2. Read that domain’s `Types + behavior helpers` in one place.
3. Then read `Reducer` and `Behavior` engine for cross-domain orchestration.
