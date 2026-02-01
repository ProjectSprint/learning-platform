/**
 * useEntity hook.
 * Provides access to entities by ID from the game state.
 */

import type { EntityData, ItemData } from "../../domain/entity/entity-data";
import { isItemData } from "../../domain/entity/entity-data";
import type { SpaceData } from "../../domain/space/space-data";
import { gridGetPosition, spaceContains } from "../../domain/space/space-fns";
import { useGameState } from "../../game-provider";

/**
 * Hook to get an entity by its ID.
 *
 * @param entityId The ID of the entity to retrieve
 * @returns The entity, or undefined if not found
 *
 * @example
 * ```tsx
 * const entity = useEntity("router-1");
 * if (entity) {
 *   console.log("Entity type:", entity.type);
 * }
 * ```
 */
export const useEntity = (entityId: string): EntityData | undefined => {
	const state = useGameState();
	return state.entities[entityId];
};

/**
 * Hook to get all entities in the game.
 *
 * @returns Record of all entities keyed by their IDs
 *
 * @example
 * ```tsx
 * const entities = useEntities();
 * console.log("Total entities:", Object.keys(entities).length);
 * ```
 */
export const useEntities = (): Record<string, EntityData> => {
	const state = useGameState();
	return state.entities;
};

/**
 * Hook to get entities filtered by type.
 *
 * @param type The entity type to filter by
 * @returns Array of entities matching the type
 *
 * @example
 * ```tsx
 * const routers = useEntitiesByType("router");
 * console.log("Found", routers.length, "routers");
 * ```
 */
export const useEntitiesByType = (type: string): EntityData[] => {
	const state = useGameState();
	return Object.values(state.entities).filter((e) => e.type === type);
};

/**
 * Hook to get an entity's state.
 *
 * @param entityId The ID of the entity
 * @returns The entity's state, or empty object if entity not found
 *
 * @example
 * ```tsx
 * const state = useEntityState("router-1");
 * console.log("Router IP:", state.ipAddress);
 * ```
 */
export const useEntityState = (entityId: string): Record<string, unknown> => {
	const entity = useEntity(entityId);
	return entity?.state ?? {};
};

/**
 * Hook to get a specific state value from an entity.
 *
 * @param entityId The ID of the entity
 * @param key The state key to retrieve
 * @returns The state value, or undefined if not found
 *
 * @example
 * ```tsx
 * const ipAddress = useEntityStateValue<string>("router-1", "ipAddress");
 * console.log("IP:", ipAddress);
 * ```
 */
export const useEntityStateValue = <T = unknown>(
	entityId: string,
	key: string,
): T | undefined => {
	const state = useEntityState(entityId);
	return (state[key] as T) ?? undefined;
};

/**
 * Hook to check if an entity exists.
 *
 * @param entityId The ID of the entity
 * @returns True if the entity exists
 *
 * @example
 * ```tsx
 * const exists = useEntityExists("router-1");
 * if (!exists) {
 *   console.log("Router not found");
 * }
 * ```
 */
export const useEntityExists = (entityId: string): boolean => {
	const state = useGameState();
	return entityId in state.entities;
};

/**
 * Hook to find which space contains an entity.
 *
 * @param entityId The ID of the entity
 * @returns The space containing the entity, or undefined if not found
 *
 * @example
 * ```tsx
 * const space = useEntitySpace("router-1");
 * if (space) {
 *   console.log("Router is in space:", space.id);
 * }
 * ```
 */
export const useEntitySpace = (entityId: string): SpaceData | undefined => {
	const state = useGameState();

	// Search all spaces for the entity
	for (const space of Object.values(state.spaces)) {
		if (spaceContains(space, entityId)) {
			return space;
		}
	}

	return undefined;
};

/**
 * Hook to get an entity's position in its space.
 *
 * @param entityId The ID of the entity
 * @returns The entity's position, or undefined if entity not found or not in a grid space
 *
 * @example
 * ```tsx
 * const position = useEntityPosition("router-1");
 * if (position) {
 *   console.log(`Router at (${position.row}, ${position.col})`);
 * }
 * ```
 */
export const useEntityPosition = (
	entityId: string,
): Record<string, unknown> | undefined => {
	const state = useGameState();

	// Search all spaces for the entity
	for (const space of Object.values(state.spaces)) {
		if (space.kind === "grid") {
			const pos = gridGetPosition(space, entityId);
			if (pos) {
				return pos;
			}
		}
	}

	return undefined;
};

/**
 * Hook to get an item entity with proper typing.
 *
 * @param entityId The ID of the item entity
 * @returns The item entity, or undefined if not found or not an item
 *
 * @example
 * ```tsx
 * const item = useItem("router-1");
 * if (item) {
 *   console.log("Item tooltip:", item.tooltip);
 * }
 * ```
 */
export const useItem = (entityId: string): ItemData | undefined => {
	const entity = useEntity(entityId);
	if (!entity) {
		return undefined;
	}
	return isItemData(entity) ? entity : undefined;
};

/**
 * Hook to check if an entity is draggable.
 *
 * @param entityId The ID of the entity
 * @returns True if the entity is draggable
 *
 * @example
 * ```tsx
 * const isDraggable = useEntityIsDraggable("router-1");
 * if (!isDraggable) {
 *   console.log("Cannot move this entity");
 * }
 * ```
 */
export const useEntityIsDraggable = (entityId: string): boolean => {
	const item = useItem(entityId);
	return item?.draggable ?? true;
};

/**
 * Hook to get an entity's allowed places.
 *
 * @param entityId The ID of the entity
 * @returns Array of allowed place IDs, or empty array if entity not found
 *
 * @example
 * ```tsx
 * const allowedPlaces = useEntityAllowedPlaces("router-1");
 * console.log("Can be placed in:", allowedPlaces);
 * ```
 */
export const useEntityAllowedPlaces = (entityId: string): string[] => {
	const item = useItem(entityId);
	return item?.allowedPlaces ?? [];
};
