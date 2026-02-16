/**
 * Space reducer.
 * Handles state updates for space-related actions using Immer for immutability.
 * Delegates transition semantics to domain/transformers/space.
 */

import { produce } from "immer";
import {
	applyCreateSpace,
	tryAddEntityToSpace,
	tryMoveEntityAcrossSpaces,
	tryRemoveEntityFromSpace,
	tryRemoveSpace,
	trySwapGridEntities,
	tryUpdateGridEntityPosition,
} from "../../../domain/transformers/space";
import type { SpaceAction } from "../actions/space";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

/**
 * Reduces space-related actions to update the game state.
 */
export const spaceReducer = (
	state: GameState,
	action: SpaceAction,
): GameState => {
	switch (action.type) {
		case "SPACE_CREATED": {
			return produce(state, (draft) => {
				applyCreateSpace(draft, action.payload.space);
			});
		}

		case "SPACE_REMOVED": {
			return produce(state, (draft) => {
				tryRemoveSpace(draft, action.payload.spaceId);
			});
		}

		case "ENTITY_ADDED": {
			const nextState = produce(state, (draft) => {
				const transition = tryAddEntityToSpace(draft, {
					entityId: action.payload.entityId,
					spaceId: action.payload.spaceId,
					position: action.payload.position,
				});
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

		case "ENTITY_REMOVED": {
			const nextState = produce(state, (draft) => {
				const transition = tryRemoveEntityFromSpace(draft, {
					entityId: action.payload.entityId,
					spaceId: action.payload.spaceId,
				});
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

		case "ENTITY_MOVED": {
			const nextState = produce(state, (draft) => {
				const transition = tryMoveEntityAcrossSpaces(draft, {
					entityId: action.payload.entityId,
					fromSpaceId: action.payload.fromSpaceId,
					toSpaceId: action.payload.toSpaceId,
					toPosition: action.payload.toPosition,
				});
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

		case "ENTITY_POSITION_UPDATED": {
			return produce(state, (draft) => {
				tryUpdateGridEntityPosition(draft, {
					entityId: action.payload.entityId,
					spaceId: action.payload.spaceId,
					position: action.payload.position,
				});
			});
		}

		case "ENTITIES_SWAPPED": {
			const nextState = produce(state, (draft) => {
				const transition = trySwapGridEntities(draft, {
					entity1Id: action.payload.entity1Id,
					space1Id: action.payload.space1Id,
					entity2Id: action.payload.entity2Id,
					space2Id: action.payload.space2Id,
				});
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

		default:
			return state;
	}
};
