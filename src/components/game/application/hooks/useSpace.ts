/**
 * useSpace hook.
 * Provides access to a space by ID from the game state.
 */

import type { Space } from "../../domain/space";
import { useGameState } from "../../game-provider";

/**
 * Hook to get a space by its ID.
 *
 * @param spaceId The ID of the space to retrieve
 * @returns The space, or undefined if not found
 *
 * @example
 * ```tsx
 * const space = useSpace("puzzle-1");
 * if (space) {
 *   console.log("Space has", space.getCount(), "entities");
 * }
 * ```
 */
export const useSpace = (spaceId: string): Space | undefined => {
	const state = useGameState();
	return state.spaces.get(spaceId);
};

/**
 * Hook to get all spaces in the game.
 *
 * @returns Map of all spaces keyed by their IDs
 *
 * @example
 * ```tsx
 * const spaces = useSpaces();
 * for (const [id, space] of spaces) {
 *   console.log(`Space ${id} has ${space.getCount()} entities`);
 * }
 * ```
 */
export const useSpaces = (): Map<string, Space> => {
	const state = useGameState();
	return state.spaces;
};

/**
 * Hook to get entities in a specific space.
 *
 * @param spaceId The ID of the space
 * @returns Array of entities in the space, or empty array if space not found
 *
 * @example
 * ```tsx
 * const entities = useSpaceEntities("inventory");
 * console.log("Inventory has", entities.length, "items");
 * ```
 */
export const useSpaceEntities = (spaceId: string) => {
	const space = useSpace(spaceId);
	return space?.getEntities() ?? [];
};

/**
 * Hook to check if a space is full.
 *
 * @param spaceId The ID of the space
 * @returns True if the space is full, false otherwise
 *
 * @example
 * ```tsx
 * const isFull = useSpaceIsFull("puzzle");
 * if (isFull) {
 *   console.log("Cannot add more items to puzzle");
 * }
 * ```
 */
export const useSpaceIsFull = (spaceId: string): boolean => {
	const space = useSpace(spaceId);
	return space?.isFull() ?? false;
};

/**
 * Hook to check if a space is empty.
 *
 * @param spaceId The ID of the space
 * @returns True if the space is empty, false otherwise
 *
 * @example
 * ```tsx
 * const isEmpty = useSpaceIsEmpty("puzzle");
 * if (isEmpty) {
 *   console.log("Puzzle has no items");
 * }
 * ```
 */
export const useSpaceIsEmpty = (spaceId: string): boolean => {
	const space = useSpace(spaceId);
	return space?.isEmpty() ?? true;
};

/**
 * Hook to get the capacity information for a space.
 *
 * @param spaceId The ID of the space
 * @returns Object with current count and max capacity, or null if space not found
 *
 * @example
 * ```tsx
 * const capacity = useSpaceCapacity("puzzle");
 * if (capacity) {
 *   console.log(`${capacity.current} / ${capacity.max ?? "∞"}`);
 * }
 * ```
 */
export const useSpaceCapacity = (
	spaceId: string,
): { current: number; max: number | undefined } | null => {
	const space = useSpace(spaceId);
	return space?.capacity() ?? null;
};
