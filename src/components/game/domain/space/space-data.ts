/**
 * Plain data types for spaces (FP replacement for Space/PoolSpace/GridSpace classes).
 * These are ordinary TypeScript types, not classes, making them compatible
 * with Immer's produce() and React's state management.
 */

import type { GridCoordinate } from "../../infrastructure/geometry/coordinates";
import type { GridMetrics } from "../../infrastructure/grid/core/GridBase";

/**
 * Grid coordinate position.
 */
export type GridPosition = GridCoordinate;

/**
 * Base configuration for creating a space.
 */
export type SpaceBaseConfig = {
	/** Unique identifier for this space */
	id: string;
	/** Optional display name */
	name?: string;
	/** Maximum number of entities this space can hold (undefined = unlimited) */
	maxCapacity?: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
};

/**
 * Plain data base type for spaces.
 * Common properties shared by all space types.
 */
export type SpaceBase = {
	/** Unique identifier for this space */
	id: string;
	/** Optional display name */
	name?: string;
	/** Maximum capacity (undefined = unlimited) */
	maxCapacity?: number;
	/** Additional metadata */
	metadata: Record<string, unknown>;
};

/**
 * Grid space configuration.
 */
export type GridSpaceConfig = SpaceBaseConfig & {
	/** Number of rows in the grid */
	rows: number;
	/** Number of columns in the grid */
	cols: number;
	/** Grid metrics (cell sizes and spacing) */
	metrics: GridMetrics;
	/** Whether to allow multiple entities per cell */
	allowMultiplePerCell?: boolean;
};

/**
 * Plain data type for a grid-based space.
 * Uses Record<string, GridPosition> for entity positions (instead of Map)
 * to be fully compatible with Immer Draft<T>.
 */
export type GridSpaceData = SpaceBase & {
	/** Discriminator: this is a grid space */
	kind: "grid";
	/** Number of rows in the grid */
	rows: number;
	/** Number of columns in the grid */
	cols: number;
	/** Grid metrics (cell sizes and spacing) */
	metrics: GridMetrics;
	/** Whether to allow multiple entities per cell */
	allowMultiplePerCell: boolean;
	/** Map of entity ID to grid position (plain object, not Map) */
	entityPositions: Record<string, GridPosition>;
};

/**
 * Pool space configuration.
 */
export type PoolSpaceConfig = SpaceBaseConfig & {
	/** Layout hint for UI rendering (e.g., "grid", "list", "carousel") */
	layout?: "grid" | "list" | "carousel";
	/** Number of columns for grid layout */
	columns?: number;
	/** Whether entities can be reordered */
	allowReorder?: boolean;
};

/**
 * Path space configuration.
 */
export type PathSpaceConfig = SpaceBaseConfig & {
	/** SVG path "d" string used for movement animation */
	path: string;
	/** SVG viewBox for path rendering */
	viewBox?: string;
	/** Base animation duration in seconds */
	duration?: number;
	/** Animation speed multiplier */
	speedMultiplier?: number;
	/** Whether to render the interactive dropzone */
	showDropzone?: boolean;
};

/**
 * Plain data type for a pool-based space.
 * Uses string[] for entity IDs instead of Entity[] to stay compatible with Immer.
 */
export type PoolSpaceData = SpaceBase & {
	/** Discriminator: this is a pool space */
	kind: "pool";
	/** Layout hint for UI rendering */
	layout: "grid" | "list" | "carousel";
	/** Number of columns for grid layout */
	columns?: number;
	/** Whether entities can be reordered */
	allowReorder: boolean;
	/** Array of entity IDs in this pool */
	entityIds: string[];
};

/**
 * Plain data type for a path-based space.
 * Stores entities currently moving along the path.
 */
export type PathSpaceData = SpaceBase & {
	/** Discriminator: this is a path space */
	kind: "path";
	/** SVG path "d" string used for movement animation */
	path: string;
	/** SVG viewBox for path rendering */
	viewBox: string;
	/** Base animation duration in seconds */
	duration: number;
	/** Animation speed multiplier */
	speedMultiplier: number;
	/** Whether to render the interactive dropzone */
	showDropzone: boolean;
	/** Entities currently inside path space */
	entityIds: string[];
};

/**
 * Custom space configuration.
 */
export type CustomSpaceConfig = SpaceBaseConfig & {
	// No additional fields — custom spaces are display-only containers
};

/**
 * Plain data type for a custom display-only space.
 * Does not store entities — rendering is fully controlled by the question page.
 */
export type CustomSpaceData = SpaceBase & {
	/** Discriminator: this is a custom space */
	kind: "custom";
};

/**
 * Queue space configuration — ordered FIFO lane for entities.
 */
export type QueueSpaceConfig = SpaceBaseConfig & {
	/** Maximum queue depth (undefined = unlimited) */
	maxDepth?: number;
	/** Visual direction */
	direction?: "horizontal" | "vertical";
};

/**
 * Plain data type for a queue-based space.
 */
export type QueueSpaceData = SpaceBase & {
	/** Discriminator: this is a queue space */
	kind: "queue";
	/** Maximum queue depth (undefined = unlimited) */
	maxDepth?: number;
	/** Visual direction */
	direction: "horizontal" | "vertical";
	/** Array of entity IDs in FIFO order */
	entityIds: string[];
};

/**
 * Meter space configuration — displays a numeric value as a bar/gauge.
 */
export type MeterSpaceConfig = SpaceBaseConfig & {
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Unit label (e.g., "%", "MB", "ms") */
	unit?: string;
	/** Color thresholds */
	thresholds?: Array<{ value: number; color: string }>;
};

/**
 * Plain data type for a meter/gauge space.
 */
export type MeterSpaceData = SpaceBase & {
	/** Discriminator: this is a meter space */
	kind: "meter";
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Current value */
	value: number;
	/** Unit label */
	unit: string;
	/** Color thresholds */
	thresholds: Array<{ value: number; color: string }>;
};

/**
 * Discriminated union of all space types.
 */
export type SpaceData =
	| GridSpaceData
	| PoolSpaceData
	| PathSpaceData
	| CustomSpaceData
	| QueueSpaceData
	| MeterSpaceData;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a space data is a GridSpaceData.
 * @param space The space data to check
 * @returns True if the space is a grid space
 */
export const isGridSpace = (space: SpaceData): space is GridSpaceData => {
	return space.kind === "grid";
};

/**
 * Type guard to check if a space data is a PoolSpaceData.
 * @param space The space data to check
 * @returns True if the space is a pool space
 */
export const isPoolSpace = (space: SpaceData): space is PoolSpaceData => {
	return space.kind === "pool";
};

/**
 * Type guard to check if a space data is a PathSpaceData.
 * @param space The space data to check
 * @returns True if the space is a path space
 */
export const isPathSpace = (space: SpaceData): space is PathSpaceData => {
	return space.kind === "path";
};

/**
 * Type guard to check if a space data is a CustomSpaceData.
 * @param space The space data to check
 * @returns True if the space is a custom space
 */
export const isCustomSpace = (space: SpaceData): space is CustomSpaceData => {
	return space.kind === "custom";
};

/**
 * Type guard to check if a space data is a QueueSpaceData.
 * @param space The space data to check
 * @returns True if the space is a queue space
 */
export const isQueueSpace = (space: SpaceData): space is QueueSpaceData => {
	return space.kind === "queue";
};

/**
 * Type guard to check if a space data is a MeterSpaceData.
 * @param space The space data to check
 * @returns True if the space is a meter space
 */
export const isMeterSpace = (space: SpaceData): space is MeterSpaceData => {
	return space.kind === "meter";
};

/**
 * Checks if a position is a valid GridPosition.
 * @param position The position to check
 * @returns True if the position is a valid grid coordinate
 */
export const isValidGridPosition = (
	position: unknown,
): position is GridPosition => {
	return (
		position !== undefined &&
		typeof position === "object" &&
		position !== null &&
		"row" in position &&
		"col" in position &&
		typeof (position as { row: unknown }).row === "number" &&
		typeof (position as { col: unknown }).col === "number"
	);
};
