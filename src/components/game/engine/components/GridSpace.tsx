/**
 * GridSpace component - Declarative engine layer for GridSpaceView.
 *
 * Wraps GridSpaceView with game state integration, handling all drag-drop
 * logic internally using Phase 1 validation functions.
 *
 * Questions provide id and callbacks - engine handles everything else.
 */

import { useBreakpointValue } from "@chakra-ui/react";
import { memo, useEffect, useMemo } from "react";
import type { EntityData } from "../../internal/domain/entity/entity-data";
import {
	getEntitySpaceId,
	isEntityPlacementAllowed,
} from "../../internal/domain/read";
import type {
	GridPosition,
	GridSpaceConfig,
	GridSpaceData,
} from "../../internal/domain/space/space-data";
import type { GameContextValue } from "../../internal/game-provider";
import { useGameDispatch, useGameState } from "../../internal/game-provider";
import type { EntityStatus } from "../../internal/presentation/entity/PlacedEntity";
import { GridSpaceView } from "../../internal/presentation/space/GridSpaceView";

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

type GridSpacePropsBase = {
	/** ID of the space to render */
	id?: string;
	/** Optional game context for explicit registration */
	ctx?: GameContextValue;
	/** Optional config used to register the space on mount */
	config?: GridSpaceConfig;
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

export type GridSpaceProps =
	| (GridSpacePropsBase & { id: string; config?: GridSpaceConfig })
	| (GridSpacePropsBase & { id?: string; config: GridSpaceConfig });

/**
 * GridSpace - Engine layer component for GridSpaceView.
 *
 * Handles:
 * - Fetching space data from game state
 * - Computing entity list in the space
 * - Validating drag-drop using isEntityPlacementAllowed
 * - Dispatching actions for entity placement
 *
 * @example
 * ```tsx
 * <GridSpace
 *   id="router"
 *   title="Router Board"
 *   onEntityClick={handleClick}
 * />
 * ```
 */
export const GridSpace = memo(
	({
		id,
		ctx,
		config,
		title,
		responsiveSize,
		onEntityClick,
		isEntityClickable,
		getEntityLabel,
		getEntityStatus,
	}: GridSpaceProps) => {
		const contextState = useGameState();
		const contextDispatch = useGameDispatch();
		const state = ctx?.state ?? contextState;
		const dispatch = ctx?.dispatch ?? contextDispatch;
		const resolvedId = config?.id ?? id;

		useEffect(() => {
			if (!resolvedId) return;
			if (process.env.NODE_ENV === "development" && !state.spaces[resolvedId]) {
				console.warn(
					`[GridSpace] Space "${resolvedId}" not found in state. Did you forget to define it in QuestionDefinition?`,
				);
			}
		}, [resolvedId, state.spaces]);

		// Resolve responsive breakpoint to [viewCols, viewRows] (or undefined)
		const resolvedSize = useBreakpointValue(
			responsiveSize ?? EMPTY_BREAKPOINTS,
		) as [number, number] | undefined;

		// Get space data
		const space = resolvedId
			? (state.spaces[resolvedId] as GridSpaceData | undefined)
			: undefined;

		// Derive view dimensions and whether remapping is active
		const dataCols = space?.cols ?? 0;
		const viewCols = resolvedSize?.[0];
		const viewRows = resolvedSize?.[1];
		const isRemapping = viewCols !== undefined && viewCols !== dataCols;

		// Compute entities in this space using guarded read helpers
		const rawEntities = useMemo(() => {
			if (!space) return [];
			return Object.entries(space.entityPositions).flatMap(
				([entityId, position]) => {
					const entity = state.entities[entityId];
					if (!entity) {
						return [];
					}
					return [{ entity, position }];
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

		const resolvedTitle = title ?? space.name ?? space.id;

		// Validation callback using read-layer placement guard
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
			return isEntityPlacementAllowed(
				state,
				entityId,
				targetSpaceId,
				dataPosition,
			);
		};

		// Placement callback - dispatches appropriate action
		// When remapping, convert view positions → data positions before dispatching
		const onPlaceEntity = (
			entityId: string,
			_fromPosition: GridPosition | null,
			toPosition: GridPosition,
		): boolean => {
			const dataToPosition =
				isRemapping && viewCols !== undefined
					? viewToData(toPosition, dataCols, viewCols)
					: toPosition;

			const toSpaceId = resolvedId;
			if (!toSpaceId) {
				return false;
			}

			// Validate placement before dispatching
			if (
				!isEntityPlacementAllowed(state, entityId, toSpaceId, dataToPosition)
			) {
				return false;
			}

			// Find where the entity currently lives
			const fromSpaceId = getEntitySpaceId(state, entityId);

			// If moving within same space
			if (fromSpaceId && fromSpaceId === toSpaceId) {
				dispatch({
					type: "ENTITY_POSITION_UPDATED",
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
					type: "ENTITY_MOVED",
					payload: {
						entityId,
						fromSpaceId,
						toSpaceId,
						toPosition: dataToPosition as unknown as Record<string, unknown>,
					},
				});
				return true;
			}

			// Adding from nowhere (entity not in any space)
			if (!fromSpaceId) {
				dispatch({
					type: "ENTITY_ADDED",
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
				title={resolvedTitle}
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
