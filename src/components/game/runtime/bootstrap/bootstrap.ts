/**
 * bootstrapQuestion — deterministic initialization from a QuestionDefinition.
 *
 * Dispatches a fixed sequence of fact-style actions to set up the game state:
 * 1. SET_QUESTION (id + in_progress)
 * 2. SET_PHASE (initialPhase)
 * 3. SPACE_CREATED for each space definition
 * 4. ENTITY_CREATED + optional ENTITY_ADDED for each entity definition
 *
 * This replaces per-question init-spaces.ts files.
 */

import type { Action } from "../../application/state/actions";
import { createItemData } from "../../domain/entity/entity-fns";
import {
	createGridSpaceData,
	createPoolSpaceData,
} from "../../domain/space/space-fns";
import type { QuestionDefinition } from "../definition/types";

type Dispatch = (action: Action) => void;

/**
 * Bootstrap a question's initial game state from its definition.
 *
 * Must be called exactly once per question mount (guarded by a ref in
 * useQuestionRuntime).
 */
export function bootstrapQuestion<CK extends string = string, TC = unknown>(
	definition: QuestionDefinition<CK, TC>,
	dispatch: Dispatch,
): void {
	// 1. Set question metadata
	dispatch({
		type: "SET_QUESTION",
		payload: {
			id: definition.meta.id,
			status: "in_progress",
		},
	});

	// 2. Set initial phase
	dispatch({
		type: "SET_PHASE",
		payload: { phase: definition.initialPhase },
	});

	// 3. Create spaces
	for (const spaceDef of definition.spaces) {
		const space =
			spaceDef.kind === "grid"
				? createGridSpaceData(spaceDef.config)
				: createPoolSpaceData(spaceDef.config);

		dispatch({
			type: "SPACE_CREATED",
			payload: { space },
		});
	}

	// 4. Create entities and optionally place them
	for (const entityDef of definition.entities) {
		const entity = createItemData(entityDef.config);

		dispatch({
			type: "ENTITY_CREATED",
			payload: { entity },
		});

		if (entityDef.initialSpace) {
			dispatch({
				type: "ENTITY_ADDED",
				payload: {
					entityId: entity.id,
					spaceId: entityDef.initialSpace,
					position: entityDef.initialPosition as
						| Record<string, unknown>
						| undefined,
				},
			});
		}
	}
}
