/**
 * Pure state selectors for entities.
 *
 * Thin wrappers providing a consistent API surface over existing domain functions.
 */

import type { GameState } from "../../application/state/types";
import {
	getEntitySpaceId,
	selectEntitiesByType as selectEntitiesByTypeFromRead,
	selectEntityStateValue as selectEntityStateValueFromRead,
} from "../../domain/read";

/**
 * Find which space contains the given entity.
 * Returns the space ID or null.
 */
export function selectEntitySpace(
	state: GameState,
	entityId: string,
): string | null {
	return getEntitySpaceId(state, entityId);
}

/**
 * Get all entities whose `type` matches the given type string.
 */
export function selectEntitiesByType(state: GameState, type: string) {
	return selectEntitiesByTypeFromRead(state, type);
}

/**
 * Safely read a single key from an entity's state record.
 * Returns undefined if the entity or key doesn't exist.
 */
export function selectEntityStateValue<T = unknown>(
	state: GameState,
	entityId: string,
	key: string,
): T | undefined {
	return selectEntityStateValueFromRead<T>(state, entityId, key);
}
