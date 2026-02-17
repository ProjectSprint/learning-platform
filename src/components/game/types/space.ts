export type GridPosition = {
	row: number;
	col: number;
};

export type GridMetrics = {
	cellWidth: number;
	cellHeight: number;
	gapX?: number;
	gapY?: number;
};

export type SpaceBaseConfig = {
	id: string;
	name?: string;
	maxCapacity?: number;
	metadata?: Record<string, unknown>;
};

export type SpaceBase = {
	id: string;
	name?: string;
	maxCapacity?: number;
	metadata: Record<string, unknown>;
};

export type GridSpaceConfig = SpaceBaseConfig & {
	rows: number;
	cols: number;
	metrics: GridMetrics;
	allowMultiplePerCell?: boolean;
};

export type GridSpaceData = SpaceBase & {
	kind: "grid";
	rows: number;
	cols: number;
	metrics: GridMetrics;
	allowMultiplePerCell: boolean;
	entityPositions: Record<string, GridPosition>;
};

export type PoolSpaceConfig = SpaceBaseConfig & {
	layout?: "grid" | "list" | "carousel";
	columns?: number;
	allowReorder?: boolean;
};

export type PoolSpaceData = SpaceBase & {
	kind: "pool";
	layout: "grid" | "list" | "carousel";
	columns?: number;
	allowReorder: boolean;
	entityIds: string[];
};

export type PathSpaceConfig = SpaceBaseConfig & {
	path: string;
	viewBox?: string;
	duration?: number;
	speedMultiplier?: number;
	showDropzone?: boolean;
};

export type PathSpaceData = SpaceBase & {
	kind: "path";
	path: string;
	viewBox: string;
	duration: number;
	speedMultiplier: number;
	showDropzone: boolean;
	entityIds: string[];
};

export interface CustomSpaceConfig extends SpaceBaseConfig {}

export type CustomSpaceData = SpaceBase & {
	kind: "custom";
};

export type QueueSpaceConfig = SpaceBaseConfig & {
	maxDepth?: number;
	direction?: "horizontal" | "vertical";
};

export type QueueSpaceData = SpaceBase & {
	kind: "queue";
	maxDepth?: number;
	direction: "horizontal" | "vertical";
	entityIds: string[];
};

export type MeterSpaceConfig = SpaceBaseConfig & {
	min: number;
	max: number;
	unit?: string;
	thresholds?: Array<{ value: number; color: string }>;
};

export type MeterSpaceData = SpaceBase & {
	kind: "meter";
	min: number;
	max: number;
	value: number;
	unit: string;
	thresholds: Array<{ value: number; color: string }>;
};

export type SpaceData =
	| GridSpaceData
	| PoolSpaceData
	| PathSpaceData
	| CustomSpaceData
	| QueueSpaceData
	| MeterSpaceData;

export const isGridSpace = (space: SpaceData): space is GridSpaceData => {
	return space.kind === "grid";
};

export const isPoolSpace = (space: SpaceData): space is PoolSpaceData => {
	return space.kind === "pool";
};

export const isPathSpace = (space: SpaceData): space is PathSpaceData => {
	return space.kind === "path";
};

export const isCustomSpace = (space: SpaceData): space is CustomSpaceData => {
	return space.kind === "custom";
};

export const isQueueSpace = (space: SpaceData): space is QueueSpaceData => {
	return space.kind === "queue";
};

export const isMeterSpace = (space: SpaceData): space is MeterSpaceData => {
	return space.kind === "meter";
};

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
