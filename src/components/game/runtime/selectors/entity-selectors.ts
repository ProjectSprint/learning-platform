/**
 * Pure state selectors for entities.
 *
 * Thin wrappers providing a consistent API surface over existing domain functions.
 */

import type { GameState } from "../../application/state/types";
import type { EntityData } from "../../domain/entity/entity-data";
import { findEntitySpace } from "../../domain/space/validation";

/**
 * Find which space contains the given entity.
 * Returns the space ID or null.
 */
export function selectEntitySpace(
	state: GameState,
	entityId: string,
): string | null {
	return findEntitySpace(state, entityId);
}

/**
 * Get all entities whose `type` matches the given type string.
 */
export function selectEntitiesByType(
	state: GameState,
	type: string,
): EntityData[] {
	return Object.values(state.entities).filter((e) => e.type === type);
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
	const entity = state.entities[entityId];
	if (!entity) return undefined;
	return entity.state[key] as T | undefined;
}
