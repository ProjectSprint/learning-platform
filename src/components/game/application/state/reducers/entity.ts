/**
 * Entity reducer.
 * Handles state updates for entity-related actions using Immer for immutability.
 * Uses FP functions from domain/entity/entity-fns for entity operations.
 */

import { produce } from "immer";
import { createItemData } from "../../../domain/entity/entity-fns";
import type { SpaceData } from "../../../domain/space/space-data";
import {
	gridContains,
	gridRemove,
	poolContains,
	poolRemove,
} from "../../../domain/space/space-fns";
import type { EntityAction, LegacyEntityAction } from "../actions/entity";
import type { GameState } from "../types";

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
	action: EntityAction | LegacyEntityAction,
): GameState => {
	switch (action.type) {
		case "CREATE_ENTITY": {
			return produce(state, (draft) => {
				const { entity } = action.payload;

				// Check for duplicate IDs
				if (entity.id in draft.entities) {
					return;
				}

				draft.entities[entity.id] = entity;
			});
		}

		case "UPDATE_ENTITY": {
			return produce(state, (draft) => {
				const { entityId, updates } = action.payload;
				const entity = draft.entities[entityId];

				if (!entity) {
					return;
				}

				// Update visual properties
				if (updates.visual) {
					Object.assign(entity.visual, updates.visual);
				}

				// Update data properties
				if (updates.data) {
					Object.assign(entity.data, updates.data);
				}

				// Update state properties
				if (updates.state) {
					Object.assign(entity.state, updates.state);
				}
			});
		}

		case "UPDATE_ENTITY_STATE": {
			return produce(state, (draft) => {
				const { entityId, state: stateUpdates } = action.payload;
				const entity = draft.entities[entityId];

				if (!entity) {
					return;
				}

				Object.assign(entity.state, stateUpdates);
			});
		}

		case "DELETE_ENTITY": {
			return produce(state, (draft) => {
				const { entityId } = action.payload;
				const entity = draft.entities[entityId];

				if (!entity) {
					return;
				}

				// Remove entity from all spaces
				for (const space of Object.values(draft.spaces)) {
					if (spaceContains(space, entityId)) {
						if (space.kind === "grid") {
							gridRemove(space, entityId);
						} else if (space.kind === "pool") {
							poolRemove(space, entityId);
						}
					}
				}

				// Remove the entity
				delete draft.entities[entityId];
			});
		}

		case "DELETE_ENTITIES": {
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

		// Legacy action handlers (for backward compatibility)

		case "ADD_INVENTORY_GROUP": {
			// Create entities from inventory group items
			return produce(state, (draft) => {
				const { group } = action.payload;

				for (const itemConfig of group.items) {
					// Check for duplicates
					if (itemConfig.id in draft.entities) {
						continue;
					}

					// Create entity from item config using createItemData
					const entity = createItemData({
						id: itemConfig.id,
						name: itemConfig.name,
						icon: itemConfig.icon,
						data: { ...itemConfig.data, type: itemConfig.type },
						tooltip: itemConfig.tooltip,
						allowedPlaces: itemConfig.allowedPlaces,
					});

					draft.entities[entity.id] = entity;
				}
			});
		}

		case "UPDATE_INVENTORY_GROUP": {
			// Update entities in the group
			return produce(state, (draft) => {
				const { items } = action.payload;

				if (!items) {
					return;
				}

				for (const itemConfig of items) {
					const entity = draft.entities[itemConfig.id];
					if (entity) {
						// Update existing entity
						if (itemConfig.data) {
							Object.assign(entity.data, itemConfig.data);
						}
					} else {
						// Create new entity
						const newEntity = createItemData({
							id: itemConfig.id,
							name: itemConfig.name,
							icon: itemConfig.icon,
							data: { ...itemConfig.data, type: itemConfig.type },
							tooltip: itemConfig.tooltip,
							allowedPlaces: itemConfig.allowedPlaces,
						});
						draft.entities[newEntity.id] = newEntity;
					}
				}
			});
		}

		case "UPDATE_ITEM_TOOLTIP": {
			// Map to UPDATE_ENTITY
			const { itemId, tooltip } = action.payload;
			return entityReducer(state, {
				type: "UPDATE_ENTITY",
				payload: {
					entityId: itemId,
					updates: {
						data: { tooltip },
					},
				},
			});
		}

		case "REMOVE_INVENTORY_GROUP": {
			// This would need to identify which entities belong to the group
			// For now, we'll just return the state as-is since we need more context
			// about which entities belong to which group
			return state;
		}

		case "PURGE_ITEMS": {
			// Map to DELETE_ENTITIES
			const { itemIds } = action.payload;
			return entityReducer(state, {
				type: "DELETE_ENTITIES",
				payload: {
					entityIds: itemIds,
				},
			});
		}

		case "CONFIGURE_DEVICE": {
			// Map to UPDATE_ENTITY - update entity.data instead of entity.state
			const { deviceId, config } = action.payload;
			return entityReducer(state, {
				type: "UPDATE_ENTITY",
				payload: {
					entityId: deviceId,
					updates: {
						data: config,
					},
				},
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
			: false;
}
