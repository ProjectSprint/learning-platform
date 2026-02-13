# ADT Module Map (Types + Behaviour)

The ADT tree is canonicalized around `Types/*` and `Behaviour/*`.
There is no compatibility layer.

## Type Modules
- `ADT/GameEngine/Types/Common.hs`
  - shared IDs and scalar values (`EntityId`, `SpaceId`, `Phase`, `Value`, ...)

- `ADT/GameEngine/Types/EntityCore.hs`
  - shared entity core record used by all entity variants

- `ADT/GameEngine/Types/Item.hs`
  - item-specific ADTs (`ItemData`, `ItemTooltip`, `IconInfo`, `ItemDataConfig`)

- `ADT/GameEngine/Types/Entity.hs`
  - entity ADT union and entity-local behaviour (`applyEntityUpdates`, `entityIdOf`, `mapEntityCore`)

- `ADT/GameEngine/Types/Space.hs`
  - space ADTs and space-local behaviour (`gridCanAccept`, `gridAdd`, `poolAdd`, ...)

- `ADT/GameEngine/Types/Modal.hs`
  - modal and overlay ADTs

- `ADT/GameEngine/Types/Event.hs`
  - event payload ADTs and event queue records

- `ADT/GameEngine/Types/State.hs`
  - `GameState`, `QuestionStatus`, `Action`, and `emptyGameState`

- `ADT/GameEngine/Types/Runtime.hs`
  - runtime command/intents ADT boundary

- `ADT/GameEngine/Types/Behaviour.hs`
  - behaviour rule ADTs (`EventTrigger`, contexts, `BehaviorRule`, `BehaviorDefinition`)

- `ADT/GameEngine/Types/Question.hs`
  - declarative question ADTs (`QuestionDefinition`, phase/inventory/space rules)

## Behaviour Modules
- `ADT/GameEngine/Behaviour/Matcher.hs`
  - pure trigger matching and event entity resolution

- `ADT/GameEngine/Behaviour/Transition.hs`
  - pure behaviour rule execution (`runBehaviorEvent`)

## Engine Modules
- `ADT/GameEngine/EventQueue.hs`
  - queue mechanics (`appendEvents`, `pendingEventsFor`, `ackEvents`)

- `ADT/GameEngine/Reducer.hs`
  - pure state transitions (`applyAction`, `applyActions`)

- `ADT/GameEngine.hs`
  - top-level export module for all `Types/*`, `Behaviour/*`, and engine modules

## Recommended Mental Model
1. Start from `ADT/GameEngine/Types/*` for available ADTs by domain.
2. Read `ADT/GameEngine/Behaviour/*` for rule matching/transition behaviour.
3. Read `ADT/GameEngine/Reducer.hs` and `ADT/GameEngine/EventQueue.hs` for orchestration.
