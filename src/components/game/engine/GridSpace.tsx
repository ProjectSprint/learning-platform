/**
 * GridSpace component - Declarative engine layer for GridSpaceView.
 *
 * Wraps GridSpaceView with game state integration, handling all drag-drop
 * logic internally using Phase 1 validation functions.
 *
 * Questions provide spaceId and callbacks - engine handles everything else.
 */

import { useBreakpointValue } from "@chakra-ui/react";
import { memo, useMemo } from "react";
import type { EntityData } from "../domain/entity/entity-data";
import type { GridPosition, GridSpaceData } from "../domain/space/space-data";
import { gridGetPosition } from "../domain/space/space-fns";
import { canEntityBePlaced, findEntitySpace } from "../domain/space/validation";
import { useGameDispatch, useGameState } from "../game-provider";
import type { EntityStatus } from "../presentation/entity/PlacedEntity";
import { GridSpaceView } from "../presentation/space/GridSpaceView";

/**
 * Responsive grid size configuration.
 * Keys are Chakra UI breakpoint names, values are [cols, rows] tuples.
 * The data model keeps the largest grid; the view layer remaps positions.
 */
export type ResponsiveSize = Record<string, [cols: number, rows: number]>;

// Position remapping helpers for responsive grids
const toLinearIndex = (pos: GridPosition, cols: number) =>
	pos.row * cols + pos.col;

const fromLinearIndex = (idx: number, cols: number): GridPosition => ({
	row: Math.floor(idx / cols),
	col: idx % cols,
});

const dataToView = (
	dataPos: GridPosition,
	dataCols: number,
	viewCols: number,
): GridPosition => {
	const idx = toLinearIndex(dataPos, dataCols);
	return fromLinearIndex(idx, viewCols);
};

const viewToData = (
	viewPos: GridPosition,
	dataCols: number,
	viewCols: number,
): GridPosition => {
	const idx = toLinearIndex(viewPos, viewCols);
	return fromLinearIndex(idx, dataCols);
};

const EMPTY_BREAKPOINTS: Record<string, [number, number]> = {};

export type GridSpaceProps = {
	/** ID of the space to render */
	spaceId: string;
	/** Optional title for the space */
	title?: string;
	/** Responsive grid dimensions: breakpoint → [cols, rows]. Remaps entity positions at view layer. */
	responsiveSize?: ResponsiveSize;
	/** Callback when an entity is clicked */
	onEntityClick?: (entity: EntityData) => void;
	/** Check if an entity can be clicked */
	isEntityClickable?: (entity: EntityData) => boolean;
	/** Function to get display label for an entity */
	getEntityLabel?: (entity: EntityData) => string;
	/** Function to get status for a placed entity */
	getEntityStatus?: (entity: EntityData) => {
		status?: EntityStatus;
		message?: string | null;
	};
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
	({
		spaceId,
		title,
		responsiveSize,
		onEntityClick,
		isEntityClickable,
		getEntityLabel,
		getEntityStatus,
	}: GridSpaceProps) => {
		const state = useGameState();
		const dispatch = useGameDispatch();

		// Resolve responsive breakpoint to [viewCols, viewRows] (or undefined)
		const resolvedSize = useBreakpointValue(
			responsiveSize ?? EMPTY_BREAKPOINTS,
		) as [number, number] | undefined;

		// Get space data
		const space = state.spaces[spaceId] as GridSpaceData | undefined;

		// Derive view dimensions and whether remapping is active
		const dataCols = space?.cols ?? 0;
		const viewCols = resolvedSize?.[0];
		const viewRows = resolvedSize?.[1];
		const isRemapping = viewCols !== undefined && viewCols !== dataCols;

		// Compute entities in this space using gridGetPosition
		const rawEntities = useMemo(() => {
			if (!space) return [];
			return Array.from(Object.entries(state.entities)).flatMap(
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
		}, [space, state.entities]);

		// Remap entity positions from data coords to view coords when responsive
		const entities = useMemo(() => {
			if (!isRemapping || viewCols === undefined) return rawEntities;
			return rawEntities.map(({ entity, position }) => ({
				entity,
				position: dataToView(position, dataCols, viewCols),
			}));
		}, [rawEntities, isRemapping, dataCols, viewCols]);

		// Handle null/undefined space
		if (!space) {
			return null;
		}

		// Validation callback using Phase 1 canEntityBePlaced
		// When remapping, convert view position → data position before validating
		const canPlaceAt = (
			entityId: string,
			position: GridPosition,
			targetSpaceId: string,
		): boolean => {
			const dataPosition =
				isRemapping && viewCols !== undefined
					? viewToData(position, dataCols, viewCols)
					: position;
			return canEntityBePlaced(state, entityId, targetSpaceId, dataPosition);
		};

		// Placement callback - dispatches appropriate action
		// When remapping, convert view positions → data positions before dispatching
		const onPlaceEntity = (
			entityId: string,
			fromPosition: GridPosition | null,
			toPosition: GridPosition,
		): boolean => {
			const dataToPosition =
				isRemapping && viewCols !== undefined
					? viewToData(toPosition, dataCols, viewCols)
					: toPosition;
			const dataFromPosition =
				fromPosition && isRemapping && viewCols !== undefined
					? viewToData(fromPosition, dataCols, viewCols)
					: fromPosition;

			// Find source space
			const fromSpaceId = dataFromPosition
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
						position: dataToPosition as unknown as Record<string, unknown>,
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
						fromPosition: dataFromPosition as unknown as Record<
							string,
							unknown
						>,
						toPosition: dataToPosition as unknown as Record<string, unknown>,
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
						position: dataToPosition as unknown as Record<string, unknown>,
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
				viewCols={viewCols}
				viewRows={viewRows}
				getEntityLabel={getEntityLabel}
				getEntityStatus={getEntityStatus}
				canPlaceAt={canPlaceAt}
				onPlaceEntity={onPlaceEntity}
				onEntityClick={handleEntityClick}
				isEntityClickable={isEntityClickable}
			/>
		);
	},
);

GridSpace.displayName = "GridSpace";
