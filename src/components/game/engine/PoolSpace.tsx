/**
 * PoolSpace component - Declarative engine layer for PoolSpaceView.
 *
 * Wraps PoolSpaceView with game state integration, handling drag initiation
 * from the inventory pool.
 */

import { memo, useCallback, useMemo } from "react";
import type { EntityData } from "../domain/entity/entity-data";
import { isItemData } from "../domain/entity/entity-data";
import type { PoolSpaceData } from "../domain/space/space-data";
import { spaceContains } from "../domain/space/space-fns";
import { useGameDispatch, useGameState } from "../game-provider";
import { useDragContext } from "../presentation/interaction/drag/DragContext";
import { PoolSpaceView } from "../presentation/space/PoolSpaceView";

export type PoolSpaceProps = {
	/** ID of the pool space to render (defaults to "inventory") */
	id?: string;
	/** Optional title for the space */
	title?: string;
};

/**
 * PoolSpace - Engine layer component for PoolSpaceView.
 *
 * Handles:
 * - Fetching pool data from game state
 * - Computing entity list in the pool
 * - Initiating drag from pool using DragContext
 * - Tracking which entities are placed in other spaces
 *
 * @example
 * ```tsx
 * <PoolSpace
 *   id="inventory"
 *   title="Inventory"
 * />
 * ```
 */
export const PoolSpace = memo(({ id = "inventory", title }: PoolSpaceProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const { setActiveDrag, setLastDropResult } = useDragContext();

	// Get pool space data
	const pool = state.spaces[id] as PoolSpaceData | undefined;

	// Get entities in this pool
	const poolEntityIds = pool?.entityIds ?? [];
	const entities = poolEntityIds
		.map((id) => state.entities[id])
		.filter((e): e is EntityData => e !== undefined);

	// Find all entity IDs that are placed in grid spaces
	const placedEntityIds = useMemo(() => {
		const placed = new Set<string>();
		for (const entity of Object.values(state.entities)) {
			// Skip if already in pool
			if (pool?.entityIds.includes(entity.id)) {
				continue;
			}
			// Check if in any other space
			for (const [spaceKey, space] of Object.entries(state.spaces)) {
				if (spaceKey === id) continue; // Skip the pool itself
				if (spaceContains(space, entity.id)) {
					placed.add(entity.id);
					break;
				}
			}
		}
		return placed;
	}, [state.entities, state.spaces, pool?.entityIds, id]);

	// Handle drag start from pool
	const handleDragStart = (entity: EntityData, event: React.PointerEvent) => {
		if (!pool) {
			return;
		}

		// Check if entity is draggable
		if (!isItemData(entity) || !entity.draggable) {
			return;
		}

		// Only drag entities that are in the pool (not placed elsewhere)
		if (placedEntityIds.has(entity.id)) {
			return;
		}

		event.preventDefault();
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();

		setLastDropResult(null);
		setActiveDrag({
			source: "pool",
			sourceSpaceId: pool.id,
			data: {
				entityId: entity.id,
				entityType: entity.type,
				entityName: entity.name,
				isReposition: false,
			},
			element: target,
			initialRect: rect,
		});
	};

	// Handle entity return to pool
	const handleEntityReturn = useCallback(
		(entityId: string): boolean => {
			// Find which space the entity is currently in
			let currentSpaceId: string | null = null;
			for (const [spaceKey, space] of Object.entries(state.spaces)) {
				if (spaceKey === id) continue; // Skip the pool itself
				if (spaceContains(space, entityId)) {
					currentSpaceId = spaceKey;
					break;
				}
			}

			if (!currentSpaceId) {
				// Entity not found in any space
				return false;
			}

			// Dispatch action to move entity back to pool
			dispatch({
				type: "MOVE_ENTITY_BETWEEN_SPACES",
				payload: {
					entityId,
					fromSpaceId: currentSpaceId,
					toSpaceId: id,
				},
			});
			return true;
		},
		[dispatch, id, state.spaces],
	);

	// Handle null/undefined pool
	if (!pool) {
		return null;
	}

	return (
		<PoolSpaceView
			space={pool}
			entities={entities}
			placedEntityIds={placedEntityIds}
			title={title}
			onEntityDragStart={handleDragStart}
			onEntityReturn={handleEntityReturn}
		/>
	);
});

PoolSpace.displayName = "PoolSpace";
