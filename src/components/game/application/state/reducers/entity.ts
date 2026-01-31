/**
 * Entity reducer.
 * Handles state updates for entity-related actions using Immer for immutability.
 */

import { produce } from "immer";
import { type Entity, Item } from "../../../domain/entity";
import type { EntityAction, LegacyEntityAction } from "../actions/entity";
import type { GameState } from "../types";

/**
 * Type helper to cast Immer draft objects to their original types.
 * Immer wraps objects in Draft<T> which can cause type issues with complex objects.
 */
const asEntity = (entity: unknown): Entity => entity as Entity;

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
				if (draft.entities.has(entity.id)) {
					return;
				}

				draft.entities.set(entity.id, entity);
				draft.sequence += 1;
			});
		}

		case "UPDATE_ENTITY": {
			return produce(state, (draft) => {
				const { entityId, updates } = action.payload;
				const entity = draft.entities.get(entityId);

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
					entity.updateState(updates.state);
				}

				draft.sequence += 1;
			});
		}

		case "UPDATE_ENTITY_STATE": {
			return produce(state, (draft) => {
				const { entityId, state: stateUpdates } = action.payload;
				const entity = draft.entities.get(entityId);

				if (!entity) {
					return;
				}

				entity.updateState(stateUpdates);
				draft.sequence += 1;
			});
		}

		case "DELETE_ENTITY": {
			return produce(state, (draft) => {
				const { entityId } = action.payload;
				const entity = draft.entities.get(entityId);

				if (!entity) {
					return;
				}

				const e = asEntity(entity);

				// Remove entity from all spaces
				for (const space of draft.spaces.values()) {
					if (space.contains(e)) {
						space.remove(e);
					}
				}

				// Remove the entity
				draft.entities.delete(entityId);
				draft.sequence += 1;
			});
		}

		case "DELETE_ENTITIES": {
			return produce(state, (draft) => {
				const { entityIds } = action.payload;

				if (entityIds.length === 0) {
					return;
				}

				const entitiesToRemove = entityIds
					.map((id) => draft.entities.get(id))
					.filter((e): e is Entity => e !== undefined)
					.map((e) => asEntity(e));

				if (entitiesToRemove.length === 0) {
					return;
				}

				// Remove entities from all spaces
				for (const space of draft.spaces.values()) {
					for (const entity of entitiesToRemove) {
						if (space.contains(entity)) {
							space.remove(entity);
						}
					}
				}

				// Remove the entities
				for (const id of entityIds) {
					draft.entities.delete(id);
				}

				draft.sequence += 1;
			});
		}

		// Legacy action handlers (for backward compatibility)

		case "ADD_INVENTORY_GROUP": {
			// Create entities from inventory group items
			return produce(state, (draft) => {
				const { group } = action.payload;

				// Create a pool space for this inventory group if it doesn't exist
				// This is a simplified mapping - actual migration would be more complex
				for (const itemConfig of group.items) {
					// Check for duplicates
					if (draft.entities.has(itemConfig.id)) {
						continue;
					}

					// Create entity from item config
					const entity = new Item({
						id: itemConfig.id,
						name: itemConfig.name,
						icon: itemConfig.icon,
						data: { ...itemConfig.data, type: itemConfig.type },
						tooltip: itemConfig.tooltip,
						allowedPlaces: itemConfig.allowedPlaces,
					});

					draft.entities.set(entity.id, entity);
				}

				draft.sequence += 1;
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
					const entity = draft.entities.get(itemConfig.id);
					if (entity) {
						// Update existing entity
						if (itemConfig.data) {
							Object.assign(entity.data, itemConfig.data);
						}
					} else {
						// Create new entity
						const newEntity = new Item({
							id: itemConfig.id,
							name: itemConfig.name,
							icon: itemConfig.icon,
							data: { ...itemConfig.data, type: itemConfig.type },
							tooltip: itemConfig.tooltip,
							allowedPlaces: itemConfig.allowedPlaces,
						});
						draft.entities.set(newEntity.id, newEntity);
					}
				}

				draft.sequence += 1;
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
			// Map to UPDATE_ENTITY_STATE
			const { deviceId, config } = action.payload;
			return entityReducer(state, {
				type: "UPDATE_ENTITY_STATE",
				payload: {
					entityId: deviceId,
					state: config,
				},
			});
		}

		default:
			return state;
	}
};
