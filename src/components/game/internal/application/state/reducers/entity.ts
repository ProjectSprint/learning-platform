/**
 * Entity reducer.
 * Handles state updates for entity-related actions using Immer for immutability.
 * Delegates transition semantics to domain/transformers/entity.
 */

import { produce } from "immer";
import type { EntityAction, GameState } from "@/components/game/types/state";
import {
	applyDeleteEntities,
	tryCreateEntity,
	tryPatchEntity,
	tryPatchEntityState,
} from "../../../domain/transformers/entity";
import { appendEvents, getNextActionId } from "../events";

/**
 * Reduces entity-related actions to update the game state.
 */
export const entityReducer = (
	state: GameState,
	action: EntityAction,
): GameState => {
	switch (action.type) {
		case "ENTITY_CREATED": {
			return produce(state, (draft) => {
				tryCreateEntity(draft, action.payload);
			});
		}

		case "ENTITY_UPDATED": {
			const nextState = produce(state, (draft) => {
				const transition = tryPatchEntity(draft, action.payload);
				if (transition.status !== "applied") {
					return;
				}
				draft.eventQueue = appendEvents(
					draft.eventQueue,
					getNextActionId(draft.eventQueue),
					transition.value.events,
				);
			});
			return nextState;
		}

		case "ENTITY_STATE_UPDATED": {
			const nextState = produce(state, (draft) => {
				const transition = tryPatchEntityState(draft, action.payload);
				if (transition.status !== "applied") {
					return;
				}
				draft.eventQueue = appendEvents(
					draft.eventQueue,
					getNextActionId(draft.eventQueue),
					transition.value.events,
				);
			});
			return nextState;
		}

		case "ENTITIES_DELETED": {
			const nextState = produce(state, (draft) => {
				applyDeleteEntities(draft, action.payload);
			});
			return nextState;
		}

		default:
			return state;
	}
};
