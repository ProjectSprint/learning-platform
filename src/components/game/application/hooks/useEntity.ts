/**
 * useEntity hook.
 * Provides access to entities by ID from the game state.
 */

import type { Entity } from "../../domain/entity";
import { useNewGameState } from "../../game-provider";

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
export const useEntity = (entityId: string): Entity | undefined => {
	const state = useNewGameState();
	return state.entities.get(entityId);
};

/**
 * Hook to get all entities in the game.
 *
 * @returns Map of all entities keyed by their IDs
 *
 * @example
 * ```tsx
 * const entities = useEntities();
 * console.log("Total entities:", entities.size);
 * ```
 */
export const useEntities = (): Map<string, Entity> => {
	const state = useNewGameState();
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
export const useEntitiesByType = (type: string): Entity[] => {
	const state = useNewGameState();
	return Array.from(state.entities.values()).filter((e) => e.type === type);
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
	return entity?.getState() ?? {};
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
	const entity = useEntity(entityId);
	return entity?.getStateValue<T>(key);
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
	const state = useNewGameState();
	return state.entities.has(entityId);
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
export const useEntitySpace = (entityId: string) => {
	const state = useNewGameState();
	const entity = state.entities.get(entityId);

	if (!entity) {
		return undefined;
	}

	// Search all spaces for the entity
	for (const space of state.spaces.values()) {
		if (space.contains(entity)) {
			return space;
		}
	}

	return undefined;
};

/**
 * Hook to get an entity's position in its space.
 *
 * @param entityId The ID of the entity
 * @returns The entity's position, or null if entity not found or not in a space
 *
 * @example
 * ```tsx
 * const position = useEntityPosition("router-1");
 * if (position && "row" in position && "col" in position) {
 *   console.log(`Router at (${position.row}, ${position.col})`);
 * }
 * ```
 */
export const useEntityPosition = (
	entityId: string,
): Record<string, unknown> | undefined | null => {
	const state = useNewGameState();
	const entity = state.entities.get(entityId);

	if (!entity) {
		return null;
	}

	// Find the space containing the entity
	for (const space of state.spaces.values()) {
		if (space.contains(entity)) {
			return space.getPosition(entity);
		}
	}

	return null;
};
