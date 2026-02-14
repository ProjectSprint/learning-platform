/**
 * Domain validation functions for entity placement in spaces.
 * These pure functions provide generic validation logic that can be used
 * by any question to validate drag-drop actions without duplicating code.
 */

import type { GameState } from "@/components/game/game-provider";
import { isItemData } from "../entity/entity-data";
import type { GridPosition } from "./space-data";
import {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
} from "./space-data";
import { gridCanAccept, spaceContains } from "./space-fns";

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
	gameState: GameState,
	entityId: string,
	toSpaceId: string,
	toPosition?: GridPosition,
): boolean {
	// Check entity exists
	const entity = gameState.entities[entityId];
	if (!entity) return false;

	// Check target space exists
	const targetSpace = gameState.spaces[toSpaceId];
	if (!targetSpace) return false;

	// For items, check allowedPlaces - non-items are rejected
	if (!isItemData(entity)) {
		return false;
	}
	if (!entity.allowedPlaces.includes(toSpaceId)) {
		return false;
	}

	// Check space-specific validation
	if (isGridSpace(targetSpace) && toPosition) {
		return gridCanAccept(targetSpace, entityId, toPosition);
	}

	if (isPoolSpace(targetSpace)) {
		// Check PoolSpace capacity
		if (targetSpace.maxCapacity !== undefined) {
			const currentCount = targetSpace.entityIds.length;
			// Don't count the entity if it's already in space (move case)
			if (
				!targetSpace.entityIds.includes(entityId) &&
				currentCount >= targetSpace.maxCapacity
			) {
				return false;
			}
		}
		// PoolSpace accepts anything if capacity allows (no position check)
		return true;
	}

	if (isPathSpace(targetSpace)) {
		if (targetSpace.maxCapacity !== undefined) {
			const currentCount = targetSpace.entityIds.length;
			if (
				!targetSpace.entityIds.includes(entityId) &&
				currentCount >= targetSpace.maxCapacity
			) {
				return false;
			}
		}
		return true;
	}

	if (isQueueSpace(targetSpace)) {
		if (targetSpace.maxDepth !== undefined) {
			const currentCount = targetSpace.entityIds.length;
			if (
				!targetSpace.entityIds.includes(entityId) &&
				currentCount >= targetSpace.maxDepth
			) {
				return false;
			}
		}
		return true;
	}

	return false;
}

/**
 * Find which space (GridSpace or PoolSpace) contains this entity.
 *
 * @param gameState - The full game state containing entities and spaces
 * @param entityId - The ID of the entity to locate
 * @returns The space ID if found, null otherwise
 */
export function findEntitySpace(
	gameState: GameState,
	entityId: string,
): string | null {
	for (const [spaceId, space] of Object.entries(gameState.spaces)) {
		if (spaceContains(space, entityId)) {
			return spaceId;
		}
	}
	return null;
}
