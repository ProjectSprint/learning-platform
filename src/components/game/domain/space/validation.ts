/**
 * Domain validation functions for entity placement in spaces.
 * These pure functions provide generic validation logic that can be used
 * by any question to validate drag-drop actions without duplicating code.
 */

import type { GameReadState } from "../read";
import { getEntitySpaceId, isEntityPlacementAllowed } from "../read";
import type { GridPosition } from "./space-data";

/**
 * Generic validation: can this entity be placed at this position in this space?
 *
 * Valid for both GridSpace (with position) and PoolSpace (without position).
 * Uses entity's `allowedPlaces` and space's capacity/occupancy to determine validity.
 *
 * @param gameState - The full game state containing entities and spaces
 * @param entityId - The ID of the entity to place
 * @param toSpaceId - The ID of the target space
 * @param toPosition - Optional position for GridSpace placement
 * @returns True if placement is valid, false otherwise
 */
export function canEntityBePlaced(
	gameState: GameReadState,
	entityId: string,
	toSpaceId: string,
	toPosition?: GridPosition,
): boolean {
	return isEntityPlacementAllowed(gameState, entityId, toSpaceId, toPosition);
}

/**
 * Find which space (GridSpace or PoolSpace) contains this entity.
 *
 * @param gameState - The full game state containing entities and spaces
 * @param entityId - The ID of the entity to locate
 * @returns The space ID if found, null otherwise
 */
export function findEntitySpace(
	gameState: GameReadState,
	entityId: string,
): string | null {
	return getEntitySpaceId(gameState, entityId);
}
