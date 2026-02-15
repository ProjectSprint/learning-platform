# Networking Migration Guide (Hard-Cut)

> Canonical architecture rules are defined in `src/components/game/doc/1-mental-model-and-loop.md`.
> This guide is the execution playbook for networking routes.

## Non-Negotiable Rules

1. World setup is question-owned and explicit.
2. `GridSpace`/`PoolSpace` do not create spaces on mount.
3. World mutations use fact-style actions only.
4. Engine layer forwards interaction; target space decides placement.
5. Intent-style commands remain only for UI channels:
   - modal actions in app reducer
   - terminal/drawer flows in UI-local providers or `EMIT_EVENTS`

## Action Mapping

| Deprecated world action | Replacement |
| --- | --- |
| `CREATE_SPACE` | `SPACE_CREATED` |
| `REMOVE_SPACE` | `SPACE_REMOVED` |
| `CREATE_ENTITY` | `ENTITY_CREATED` |
| `ADD_ENTITY_TO_SPACE` | `ENTITY_ADDED` |
| `REMOVE_ENTITY_FROM_SPACE` | `ENTITY_REMOVED` |
| `MOVE_ENTITY_BETWEEN_SPACES` | `ENTITY_MOVED` |
| `UPDATE_ENTITY_POSITION` | `ENTITY_POSITION_UPDATED` |
| `SWAP_ENTITIES` | `ENTITIES_SWAPPED` |
| `UPDATE_ENTITY` | `ENTITY_UPDATED` |
| `UPDATE_ENTITY_STATE` | `ENTITY_STATE_UPDATED` |
| `DELETE_ENTITIES` | `ENTITIES_DELETED` |

## Bootstrapping Pattern

Each networking question must own a dedicated `-utils/definition.ts` file.

```ts
import { useQuestionRuntime } from "@/components/game/runtime";
import { MY_DEFINITION } from "./-utils/definition";

const {
	world,
	progress,
	interactionSession,
	state,
	events,
	ack,
} = useQuestionRuntime(
	"my-question-page",
	MY_DEFINITION,
);

world.updateEntity("router-1", { data: { online: true } });
interactionSession.requestPhaseTransition("terminal", "my_question.rules");
progress.completeQuestion();
```

## Route Migration Checklist

1. Replace legacy route init with `QuestionDefinition` + `useQuestionRuntime`.
2. Remove all deprecated world action dispatches from pages/hooks.
3. Keep modal submission handling via `MODAL_SUBMITTED` events.
4. Keep terminal output/input in terminal provider hooks; if needed, append domain-neutral events via `EMIT_EVENTS`.
5. Consume reducer facts through `useEngineEvents("<route-id>")` and always call `ack()`.
6. Verify question still reaches `terminal` and `completed` phases through `executionFlow` handoff (`interactionSession.requestPhaseTransition(...)`), not direct phase mutation APIs.

## Forbidden Patterns

- Dispatching world actions from component mount side effects.
- Keeping dual world paths (deprecated + fact-style).
- Encoding placement authority in route page logic instead of space/engine layer.
- Skipping `ack()` in event consumers.

## Removed Compatibility

The migration is hard-cut for world state actions.
No compatibility aliases should remain in runtime world flows.

## Validation Gates

- `pnpm check:biome`
- `pnpm check:tsc`
- `pnpm exec vitest run src/components/game/application/state/reducers/__tests__/events.test.ts src/components/game/engine/__tests__/space-contract.test.ts src/routes/questions/networking/__tests__/-init-spaces.test.ts`
