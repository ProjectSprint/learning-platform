/**
 * GridSpace component - Declarative engine layer for GridSpaceView.
 *
 * Wraps GridSpaceView with game state integration, handling all drag-drop
 * logic internally using Phase 1 validation functions.
 *
 * Questions provide spaceId and callbacks - engine handles everything else.
 */

import { memo } from "react";
import type { EntityData } from "../domain/entity/entity-data";
import type { GridPosition, GridSpaceData } from "../domain/space/space-data";
import { gridGetPosition } from "../domain/space/space-fns";
import { canEntityBePlaced, findEntitySpace } from "../domain/space/validation";
import { useGameDispatch, useGameState } from "../game-provider";
import { GridSpaceView } from "../presentation/space/GridSpaceView";

export type GridSpaceProps = {
	/** ID of the space to render */
	spaceId: string;
	/** Optional title for the space */
	title?: string;
	/** Callback when an entity is clicked */
	onEntityClick?: (entity: EntityData) => void;
	/** Check if an entity can be clicked */
	isEntityClickable?: (entity: EntityData) => boolean;
};

/**
 * GridSpace - Engine layer component for GridSpaceView.
 *
 * Handles:
 * - Fetching space data from game state
 * - Computing entity list in the space
 * - Validating drag-drop using canEntityBePlaced
 * - Dispatching actions for entity placement
 *
 * @example
 * ```tsx
 * <GridSpace
 *   spaceId="router"
 *   title="Router Board"
 *   onEntityClick={handleClick}
 * />
 * ```
 */
export const GridSpace = memo(
	({ spaceId, title, onEntityClick, isEntityClickable }: GridSpaceProps) => {
		const state = useGameState();
		const dispatch = useGameDispatch();

		// Get space data
		const space = state.spaces[spaceId] as GridSpaceData | undefined;

		// Handle null/undefined space
		if (!space) {
			return null;
		}

		// Compute entities in this space using gridGetPosition
		const entities = Array.from(Object.entries(state.entities)).flatMap(
			([entityId, entity]) => {
				const position = gridGetPosition(space, entityId);
				if (
					position &&
					typeof position === "object" &&
					"row" in position &&
					"col" in position
				) {
					return [{ entity, position: position as GridPosition }];
				}
				return [];
			},
		);

		// Validation callback using Phase 1 canEntityBePlaced
		const canPlaceAt = (
			entityId: string,
			position: GridPosition,
			targetSpaceId: string,
		): boolean => {
			return canEntityBePlaced(state, entityId, targetSpaceId, position);
		};

		// Placement callback - dispatches appropriate action
		const onPlaceEntity = (
			entityId: string,
			fromPosition: GridPosition | null,
			toPosition: GridPosition,
		): boolean => {
			// Find source space
			const fromSpaceId = fromPosition
				? spaceId
				: findEntitySpace(state, entityId);
			const toSpaceId = spaceId;

			// If moving within same space
			if (fromSpaceId && fromSpaceId === toSpaceId) {
				dispatch({
					type: "UPDATE_ENTITY_POSITION",
					payload: {
						entityId,
						spaceId: toSpaceId,
						position: toPosition as unknown as Record<string, unknown>,
					},
				});
				return true;
			}

			// If moving between spaces
			if (fromSpaceId && fromSpaceId !== toSpaceId) {
				dispatch({
					type: "MOVE_ENTITY_BETWEEN_SPACES",
					payload: {
						entityId,
						fromSpaceId,
						toSpaceId,
						fromPosition: fromPosition as unknown as Record<string, unknown>,
						toPosition: toPosition as unknown as Record<string, unknown>,
					},
				});
				return true;
			}

			// Adding from inventory (no fromPosition)
			if (!fromSpaceId) {
				dispatch({
					type: "ADD_ENTITY_TO_SPACE",
					payload: {
						entityId,
						spaceId: toSpaceId,
						position: toPosition as unknown as Record<string, unknown>,
					},
				});
				return true;
			}

			return false;
		};

		// Wrap entity click handler
		const handleEntityClick = (entity: EntityData, _position: GridPosition) => {
			if (onEntityClick) {
				onEntityClick(entity);
			}
		};

		return (
			<GridSpaceView
				space={space}
				entities={entities}
				title={title}
				canPlaceAt={canPlaceAt}
				onPlaceEntity={onPlaceEntity}
				onEntityClick={handleEntityClick}
				isEntityClickable={isEntityClickable}
			/>
		);
	},
);

GridSpace.displayName = "GridSpace";
