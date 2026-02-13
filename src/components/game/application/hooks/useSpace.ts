/**
 * useSpace hook.
 * Provides access to a space by ID from the game state.
 */

import type { GridPosition, SpaceData } from "../../domain/space/space-data";
import {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
} from "../../domain/space/space-data";
import {
	gridGetPosition,
	spaceGetEntityCount,
	spaceIsEmpty,
	spaceIsFull,
} from "../../domain/space/space-fns";
import { useGameState } from "../../game-provider";

/**
 * Hook to get a space by its ID.
 *
 * @param spaceId The ID of the space to retrieve
 * @returns The space, or undefined if not found
 *
 * @example
 * ```tsx
 * const space = useSpace("space-1");
 * if (space) {
 *   console.log("Space has", spaceGetEntityCount(space), "entities");
 * }
 * ```
 */
export const useSpace = (spaceId: string): SpaceData | undefined => {
	const state = useGameState();
	return state.spaces[spaceId];
};

/**
 * Hook to get all spaces in the game.
 *
 * @returns Record of all spaces keyed by their IDs
 *
 * @example
 * ```tsx
 * const spaces = useSpaces();
 * for (const [id, space] of Object.entries(spaces)) {
 *   console.log(`Space ${id} has ${spaceGetEntityCount(space)} entities`);
 * }
 * ```
 */
export const useSpaces = (): Record<string, SpaceData> => {
	const state = useGameState();
	return state.spaces;
};

/**
 * Hook to get entities in a specific space.
 *
 * @param spaceId The ID of the space
 * @returns Array of entity IDs in the space, or empty array if space not found
 *
 * @example
 * ```tsx
 * const entityIds = useSpaceEntities("inventory");
 * console.log("Inventory has", entityIds.length, "items");
 * ```
 */
export const useSpaceEntities = (spaceId: string): string[] => {
	const space = useSpace(spaceId);
	if (!space) {
		return [];
	}

	if (isGridSpace(space)) {
		// Grid space: return all entity IDs from entityPositions
		return Object.keys(space.entityPositions);
	} else if (isPoolSpace(space)) {
		// Pool space: return entityIds array
		return space.entityIds;
	} else if (isPathSpace(space)) {
		return space.entityIds;
	}

	return [];
};

/**
 * Hook to check if a space is full.
 *
 * @param spaceId The ID of the space
 * @returns True if the space is full, false otherwise
 *
 * @example
 * ```tsx
 * const isFull = useSpaceIsFull("space");
 * if (isFull) {
 *   console.log("Cannot add more items to space");
 * }
 * ```
 */
export const useSpaceIsFull = (spaceId: string): boolean => {
	const space = useSpace(spaceId);
	return space ? spaceIsFull(space) : false;
};

/**
 * Hook to check if a space is empty.
 *
 * @param spaceId The ID of the space
 * @returns True if the space is empty, false otherwise
 *
 * @example
 * ```tsx
 * const isEmpty = useSpaceIsEmpty("space");
 * if (isEmpty) {
 *   console.log("Space has no items");
 * }
 * ```
 */
export const useSpaceIsEmpty = (spaceId: string): boolean => {
	const space = useSpace(spaceId);
	return space ? spaceIsEmpty(space) : true;
};

/**
 * Hook to get the capacity information for a space.
 *
 * @param spaceId The ID of the space
 * @returns Object with current count and max capacity, or null if space not found
 *
 * @example
 * ```tsx
 * const capacity = useSpaceCapacity("space");
 * if (capacity) {
 *   console.log(`${capacity.current} / ${capacity.max ?? "∞"}`);
 * }
 * ```
 */
export const useSpaceCapacity = (
	spaceId: string,
): { current: number; max: number | undefined } | null => {
	const space = useSpace(spaceId);
	if (!space) {
		return null;
	}
	return {
		current: spaceGetEntityCount(space),
		max: space.maxCapacity,
	};
};

/**
 * Hook to get an entity's position in a grid space.
 *
 * @param entityId The ID of the entity
 * @returns The entity's grid position, or undefined if entity not found or not in a grid space
 *
 * @example
 * ```tsx
 * const position = useEntityGridPosition("router-1");
 * if (position) {
 *   console.log(`Router at (${position.row}, ${position.col})`);
 * }
 * ```
 */
export const useEntityGridPosition = (
	entityId: string,
): GridPosition | undefined => {
	const spaces = useSpaces();

	for (const space of Object.values(spaces)) {
		if (isGridSpace(space)) {
			const pos = gridGetPosition(space, entityId);
			if (pos) {
				return pos;
			}
		}
	}

	return undefined;
};
