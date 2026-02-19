/**
 * PoolSpace component - Declarative engine layer for PoolSpaceView.
 *
 * Wraps PoolSpaceView with game state integration, handling drag initiation
 * from the inventory pool.
 */

import { memo, useCallback, useEffect, useMemo } from "react";
import type { EntityData } from "@/components/game/types/entity";
import type {
	PoolSpaceConfig,
	PoolSpaceData,
} from "@/components/game/types/space";
import { isPoolSpace } from "@/components/game/types/space";
import { isItemData } from "../../internal/domain/entity/entity-data";
import type { GameContextValue } from "../../internal/game-provider";
import { useGameDispatch, useGameState } from "../../internal/game-provider";
import { useDragContext } from "../../internal/presentation/interaction/drag/DragContext";
import { PoolSpaceView } from "../../internal/presentation/space/PoolSpaceView";

type PoolSpacePropsBase = {
	/** ID of the pool space to render (defaults to "inventory") */
	id?: string;
	/** Optional game context for explicit registration */
	ctx?: GameContextValue;
	/** Optional config used to register the space on mount */
	config?: PoolSpaceConfig;
	/** Optional title for the space */
	title?: string;
	/** Optional drag gate callback for pool entities */
	isEntityDraggable?: (entity: EntityData) => boolean;
};

type PoolSpaceProps =
	| (PoolSpacePropsBase & { id: string; config?: PoolSpaceConfig })
	| (PoolSpacePropsBase & { id?: string; config: PoolSpaceConfig });

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
export const PoolSpace = memo(
	({ id, ctx, config, title, isEntityDraggable }: PoolSpaceProps) => {
		const contextState = useGameState();
		const contextDispatch = useGameDispatch();
		const state = ctx?.state ?? contextState;
		const dispatch = ctx?.dispatch ?? contextDispatch;
		const { setActiveDrag, setLastDropResult } = useDragContext();
		const resolvedId = config?.id ?? id ?? "inventory";

		useEffect(() => {
			if (!resolvedId) return;
			if (process.env.NODE_ENV === "development" && !state.spaces[resolvedId]) {
				console.warn(
					`[PoolSpace] Space "${resolvedId}" not found in state. Did you forget to define it in QuestionDefinition?`,
				);
			}
		}, [resolvedId, state.spaces]);

		// Get pool space data
		const candidateSpace = resolvedId ? state.spaces[resolvedId] : undefined;
		const pool: PoolSpaceData | undefined =
			candidateSpace && isPoolSpace(candidateSpace)
				? candidateSpace
				: undefined;

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
					if (spaceKey === resolvedId) continue; // Skip the pool itself
					const inSpace =
						space.kind === "grid"
							? entity.id in space.entityPositions
							: space.kind === "pool" ||
									space.kind === "path" ||
									space.kind === "queue"
								? space.entityIds.includes(entity.id)
								: false;
					if (inSpace) {
						placed.add(entity.id);
						break;
					}
				}
			}
			return placed;
		}, [state.entities, state.spaces, pool?.entityIds, resolvedId]);

		// Handle drag start from pool
		const handleDragStart = (
			entity: EntityData,
			event: React.PointerEvent<HTMLDivElement>,
		) => {
			if (!pool) {
				return;
			}

			// Check if entity is draggable
			if (!isItemData(entity) || !entity.draggable) {
				return;
			}
			if (isEntityDraggable && !isEntityDraggable(entity)) {
				return;
			}

			// Only drag entities that are in the pool (not placed elsewhere)
			if (placedEntityIds.has(entity.id)) {
				return;
			}

			event.preventDefault();
			const target = event.currentTarget;
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
				// Check if this entity is allowed in this pool space
				const entity = state.entities[entityId];
				if (
					entity &&
					isItemData(entity) &&
					!entity.allowedPlaces.includes(resolvedId)
				) {
					return false;
				}

				let currentSpaceId: string | null = null;
				for (const [spaceKey, space] of Object.entries(state.spaces)) {
					if (spaceKey === resolvedId) {
						continue;
					}
					const inSpace =
						space.kind === "grid"
							? entityId in space.entityPositions
							: space.kind === "pool" ||
									space.kind === "path" ||
									space.kind === "queue"
								? space.entityIds.includes(entityId)
								: false;
					if (inSpace) {
						currentSpaceId = spaceKey;
						break;
					}
				}

				if (!currentSpaceId || currentSpaceId === resolvedId) {
					// Entity not found in any space
					return false;
				}

				// Dispatch action to move entity back to pool
				dispatch({
					type: "ENTITY_MOVED",
					payload: {
						entityId,
						fromSpaceId: currentSpaceId,
						toSpaceId: resolvedId,
					},
				});
				return true;
			},
			[dispatch, resolvedId, state.entities, state.spaces],
		);

		// Handle null/undefined pool
		if (!pool) {
			return null;
		}

		const resolvedTitle = title ?? pool.name ?? pool.id;

		return (
			<PoolSpaceView
				space={pool}
				entities={entities}
				placedEntityIds={placedEntityIds}
				title={resolvedTitle}
				onEntityDragStart={handleDragStart}
				onEntityReturn={handleEntityReturn}
			/>
		);
	},
);

PoolSpace.displayName = "PoolSpace";
