/**
 * Space reducer.
 * Handles state updates for space-related actions using Immer for immutability.
 * Uses FP functions from domain/space/space-fns for space operations.
 */

import { produce } from "immer";
import type { GridPosition, SpaceData } from "../../../domain/space/space-data";
import { isGridSpace, isPoolSpace } from "../../../domain/space/space-data";
import {
	gridAdd,
	gridCanAccept,
	gridContains,
	gridGetPosition,
	gridRemove,
	poolAdd,
	poolRemove,
} from "../../../domain/space/space-fns";
import type { SpaceAction } from "../actions/space";
import type { GameEventInput } from "../events";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

/**
 * Reduces space-related actions to update the game state.
 * Uses Immer's produce for immutable updates with mutable-like syntax.
 *
 * @param state Current game state
 * @param action Space action to process
 * @returns Updated game state
 */
export const spaceReducer = (
	state: GameState,
	action: SpaceAction,
): GameState => {
	switch (action.type) {
		case "SPACE_CREATED": {
			return produce(state, (draft) => {
				const { space } = action.payload;
				draft.spaces[space.id] = space;
			});
		}

		case "SPACE_REMOVED": {
			return produce(state, (draft) => {
				const { spaceId } = action.payload;
				const space = draft.spaces[spaceId];
				if (!space) {
					return;
				}

				// Remove the space - entities are still in state but not in any space
				delete draft.spaces[spaceId];
			});
		}

		case "ENTITY_ADDED": {
			return produce(state, (draft) => {
				const { entityId, spaceId, position } = action.payload;

				const space = draft.spaces[spaceId];
				const entity = draft.entities[entityId];

				if (!space || !entity) {
					return;
				}

				const events: GameEventInput[] = [];
				const actionId = getNextActionId(draft.eventQueue);

				// Use FP functions based on space type
				if (isGridSpace(space) && position) {
					const gridPos = position as GridPosition;
					if (!gridCanAccept(space, entityId, gridPos)) {
						return;
					}
					const added = gridAdd(space, entityId, gridPos);
					if (added) {
						events.push({
							type: "ENTITY_ENTERED_SPACE",
							entityId,
							spaceId,
							position: gridPos,
						});
					}
				} else if (isPoolSpace(space)) {
					const index =
						typeof position === "object" && "index" in position
							? (position as { index: number }).index
							: undefined;
					const added = poolAdd(space, entityId, index);
					if (added) {
						events.push({
							type: "ENTITY_ENTERED_SPACE",
							entityId,
							spaceId,
							position: index !== undefined ? { index } : undefined,
						});
					}
				}

				if (events.length > 0) {
					draft.eventQueue = appendEvents(draft.eventQueue, actionId, events);
				}
			});
		}

		case "ENTITY_REMOVED": {
			return produce(state, (draft) => {
				const { entityId, spaceId } = action.payload;

				const space = draft.spaces[spaceId];
				const entity = draft.entities[entityId];

				if (!space || !entity) {
					return;
				}

				const events: GameEventInput[] = [];
				const actionId = getNextActionId(draft.eventQueue);

				if (isGridSpace(space)) {
					const position = gridGetPosition(space, entityId);
					const removed = gridRemove(space, entityId);
					if (removed) {
						events.push({
							type: "ENTITY_LEFT_SPACE",
							entityId,
							spaceId,
							position,
						});
					}
				} else if (isPoolSpace(space)) {
					const index = space.entityIds.indexOf(entityId);
					const removed = poolRemove(space, entityId);
					if (removed) {
						events.push({
							type: "ENTITY_LEFT_SPACE",
							entityId,
							spaceId,
							position: index >= 0 ? { index } : undefined,
						});
					}
				}

				if (events.length > 0) {
					draft.eventQueue = appendEvents(draft.eventQueue, actionId, events);
				}
			});
		}

		case "ENTITY_MOVED": {
			const { entityId, fromSpaceId, toSpaceId, toPosition } = action.payload;

			return produce(state, (draft) => {
				const fromSpace = draft.spaces[fromSpaceId];
				const toSpace = draft.spaces[toSpaceId];
				const entity = draft.entities[entityId];

				if (!fromSpace || !toSpace || !entity) {
					return;
				}

				const actionId = getNextActionId(draft.eventQueue);
				const fromPosition = isGridSpace(fromSpace)
					? gridGetPosition(fromSpace, entityId)
					: isPoolSpace(fromSpace)
						? {
								index: fromSpace.entityIds.indexOf(entityId),
							}
						: undefined;

				// Check if entity is in source space
				if (!spaceContains(fromSpace, entityId)) {
					// Entity may already be at destination (React StrictMode double-invocation)
					if (spaceContains(toSpace, entityId)) {
						return;
					}
					return;
				}

				// Remove from source
				if (isGridSpace(fromSpace)) {
					gridRemove(fromSpace, entityId);
				} else if (isPoolSpace(fromSpace)) {
					poolRemove(fromSpace, entityId);
				}

				// Add to destination
				let added = false;
				if (isGridSpace(toSpace) && toPosition) {
					const gridPos = toPosition as GridPosition;
					added =
						gridCanAccept(toSpace, entityId, gridPos) &&
						gridAdd(toSpace, entityId, gridPos);
				} else if (isPoolSpace(toSpace)) {
					const index =
						typeof toPosition === "object" && "index" in toPosition
							? (toPosition as { index: number }).index
							: undefined;
					added = poolAdd(toSpace, entityId, index);
				}

				if (!added) {
					// Rollback: add back to source
					if (isGridSpace(fromSpace)) {
						if (
							fromPosition &&
							typeof fromPosition === "object" &&
							"row" in fromPosition &&
							"col" in fromPosition
						) {
							gridAdd(fromSpace, entityId, fromPosition as GridPosition);
						}
					} else if (isPoolSpace(fromSpace)) {
						const fromIndex =
							fromPosition &&
							typeof fromPosition === "object" &&
							"index" in fromPosition
								? (fromPosition as { index: number }).index
								: 0;
						poolAdd(fromSpace, entityId, Math.max(0, fromIndex));
					}
					return;
				}

				const toPositionValue = isGridSpace(toSpace)
					? gridGetPosition(toSpace, entityId)
					: isPoolSpace(toSpace)
						? {
								index: toSpace.entityIds.indexOf(entityId),
							}
						: undefined;

				draft.eventQueue = appendEvents(draft.eventQueue, actionId, [
					{
						type: "ENTITY_MOVED",
						entityId,
						fromSpaceId,
						toSpaceId,
						fromPosition,
						toPosition: toPositionValue,
					},
				]);
			});
		}

		case "ENTITY_POSITION_UPDATED": {
			return produce(state, (draft) => {
				const { entityId, spaceId, position } = action.payload;

				const space = draft.spaces[spaceId];
				const entity = draft.entities[entityId];

				if (!space || !entity) {
					return;
				}

				if (!spaceContains(space, entityId)) {
					return;
				}

				if (isGridSpace(space) && position) {
					const gridPos = position as GridPosition;
					if (gridCanAccept(space, entityId, gridPos)) {
						// Remove from current position and add to new position
						gridRemove(space, entityId);
						gridAdd(space, entityId, gridPos);
					}
				}
			});
		}

		case "ENTITIES_SWAPPED": {
			return produce(state, (draft) => {
				const { entity1Id, space1Id, entity2Id, space2Id } = action.payload;

				const space1 = draft.spaces[space1Id];
				const space2 = draft.spaces[space2Id];

				if (!space1 || !space2) {
					return;
				}

				// Swap only works for grid spaces
				if (!isGridSpace(space1) || !isGridSpace(space2)) {
					return;
				}

				if (
					!spaceContains(space1, entity1Id) ||
					!spaceContains(space2, entity2Id)
				) {
					return;
				}

				// Get positions
				const pos1 = gridGetPosition(space1, entity1Id);
				const pos2 = gridGetPosition(space2, entity2Id);

				const actionId = getNextActionId(draft.eventQueue);
				const from1 = gridGetPosition(space1, entity1Id);
				const from2 = gridGetPosition(space2, entity2Id);

				if (space1Id === space2Id) {
					// Same grid space: remove both and add at swapped positions
					gridRemove(space1, entity1Id);
					gridRemove(space1, entity2Id);
					if (pos2) {
						gridAdd(space1, entity1Id, pos2);
					}
					if (pos1) {
						gridAdd(space1, entity2Id, pos1);
					}
				} else {
					// Different grid spaces: transfer both entities
					gridRemove(space1, entity1Id);
					gridRemove(space2, entity2Id);
					if (pos2) {
						gridAdd(space2, entity1Id, pos2);
					}
					if (pos1) {
						gridAdd(space1, entity2Id, pos1);
					}
				}

				const to1 = gridGetPosition(space2, entity1Id);
				const to2 = gridGetPosition(space1, entity2Id);

				if (from1 && to1 && from2 && to2) {
					draft.eventQueue = appendEvents(draft.eventQueue, actionId, [
						{
							type: "ENTITY_MOVED",
							entityId: entity1Id,
							fromSpaceId: space1Id,
							toSpaceId: space2Id,
							fromPosition: from1,
							toPosition: to1,
						},
						{
							type: "ENTITY_MOVED",
							entityId: entity2Id,
							fromSpaceId: space2Id,
							toSpaceId: space1Id,
							fromPosition: from2,
							toPosition: to2,
						},
					]);
				}
			});
		}

		default:
			return state;
	}
};

/**
 * Helper function to check if a space contains an entity (polymorphic).
 */
function spaceContains(space: SpaceData, entityId: string): boolean {
	return isGridSpace(space)
		? gridContains(space, entityId)
		: isPoolSpace(space)
			? space.entityIds.includes(entityId)
			: false;
}
