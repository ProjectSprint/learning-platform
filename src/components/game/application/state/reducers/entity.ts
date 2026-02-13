/**
 * Entity reducer.
 * Handles state updates for entity-related actions using Immer for immutability.
 * Uses FP functions from domain/entity/entity-fns for entity operations.
 */

import { produce } from "immer";
import { isItemData } from "../../../domain/entity/entity-data";
import type { SpaceData } from "../../../domain/space/space-data";
import {
	gridContains,
	gridRemove,
	pathContains,
	pathRemove,
	poolContains,
	poolRemove,
} from "../../../domain/space/space-fns";
import type { EntityAction } from "../actions/entity";
import type { GameEventInput } from "../events";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";
import type { EntityUpdatePayload } from "../types/events";

/**
 * Reduces entity-related actions to update the game state.
 * Uses Immer's produce for immutable updates with mutable-like syntax.
 *
 * @param state Current game state
 * @param action Entity action to process
 * @returns Updated game state
 */
export const entityReducer = (
	state: GameState,
	action: EntityAction,
): GameState => {
	switch (action.type) {
		case "ENTITY_CREATED": {
			return produce(state, (draft) => {
				const { entity } = action.payload;

				// Check for duplicate IDs
				if (entity.id in draft.entities) {
					return;
				}

				draft.entities[entity.id] = entity;
			});
		}

		case "ENTITY_UPDATED": {
			return produce(state, (draft) => {
				const { entityId, updates } = action.payload;
				const entity = draft.entities[entityId];

				if (!entity) {
					return;
				}

				const events: GameEventInput[] = [];
				const actionId = getNextActionId(draft.eventQueue);
				let hasChanges = false;
				const eventUpdates: EntityUpdatePayload = {};

				if ("name" in updates) {
					if (updates.name !== entity.name) {
						entity.name = updates.name;
						eventUpdates.name = updates.name;
						hasChanges = true;
					}
				}

				if ("draggable" in updates && isItemData(entity)) {
					const nextDraggable = updates.draggable ?? entity.draggable;
					if (nextDraggable !== entity.draggable) {
						entity.draggable = nextDraggable;
						eventUpdates.draggable = nextDraggable;
						hasChanges = true;
					}
				}

				// Update visual properties
				if (updates.visual) {
					const visualChanged = Object.entries(updates.visual).some(
						([key, value]) =>
							entity.visual[key as keyof typeof entity.visual] !== value,
					);
					if (visualChanged) {
						Object.assign(entity.visual, updates.visual);
						eventUpdates.visual = updates.visual;
						hasChanges = true;
					}
				}

				// Update data properties
				if (updates.data) {
					const dataChanged = Object.entries(updates.data).some(
						([key, value]) =>
							entity.data[key as keyof typeof entity.data] !== value,
					);
					if (dataChanged) {
						Object.assign(entity.data, updates.data);
						eventUpdates.data = updates.data;
						hasChanges = true;
					}
				}

				// Update state properties
				if (updates.state) {
					const stateChanged = Object.entries(updates.state).some(
						([key, value]) =>
							entity.state[key as keyof typeof entity.state] !== value,
					);
					if (stateChanged) {
						Object.assign(entity.state, updates.state);
						eventUpdates.state = updates.state;
						hasChanges = true;
					}
				}

				if (hasChanges) {
					events.push({
						type: "ENTITY_UPDATED",
						entityId,
						updates: eventUpdates,
					});
					draft.eventQueue = appendEvents(draft.eventQueue, actionId, events);
				}
			});
		}

		case "ENTITY_STATE_UPDATED": {
			return produce(state, (draft) => {
				const { entityId, state: stateUpdates } = action.payload;
				const entity = draft.entities[entityId];

				if (!entity) {
					return;
				}

				const stateChanged = Object.entries(stateUpdates).some(
					([key, value]) =>
						entity.state[key as keyof typeof entity.state] !== value,
				);
				if (!stateChanged) {
					return;
				}

				Object.assign(entity.state, stateUpdates);

				draft.eventQueue = appendEvents(
					draft.eventQueue,
					getNextActionId(draft.eventQueue),
					[
						{
							type: "ENTITY_UPDATED",
							entityId,
							updates: {
								state: stateUpdates,
							},
						},
					],
				);
			});
		}

		case "ENTITIES_DELETED": {
			return produce(state, (draft) => {
				const { entityIds } = action.payload;

				if (entityIds.length === 0) {
					return;
				}

				// Remove entities from all spaces
				for (const space of Object.values(draft.spaces)) {
					for (const id of entityIds) {
						if (spaceContains(space, id)) {
							if (space.kind === "grid") {
								gridRemove(space, id);
							} else if (space.kind === "pool") {
								poolRemove(space, id);
							} else if (space.kind === "path") {
								pathRemove(space, id);
							}
						}
					}
				}

				// Remove the entities
				for (const id of entityIds) {
					delete draft.entities[id];
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
	return space.kind === "grid"
		? gridContains(space, entityId)
		: space.kind === "pool"
			? poolContains(space, entityId)
			: space.kind === "path"
				? pathContains(space, entityId)
				: false;
}
