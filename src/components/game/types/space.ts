export type _GridPosition = {
	row: number;
	col: number;
};

export type _GridMetrics = {
	cellWidth: number;
	cellHeight: number;
	gapX?: number;
	gapY?: number;
};

export type _SpaceBaseConfig = {
	id: string;
	name?: string;
	maxCapacity?: number;
	metadata?: Record<string, unknown>;
};

export type _SpaceBase = {
	id: string;
	name?: string;
	maxCapacity?: number;
	metadata: Record<string, unknown>;
};

export type _GridSpaceConfig = _SpaceBaseConfig & {
	rows: number;
	cols: number;
	metrics: _GridMetrics;
	allowMultiplePerCell?: boolean;
};

export type _GridSpaceData = _SpaceBase & {
	kind: "grid";
	rows: number;
	cols: number;
	metrics: _GridMetrics;
	allowMultiplePerCell: boolean;
	entityPositions: Record<string, _GridPosition>;
};

export type _PoolSpaceConfig = _SpaceBaseConfig & {
	layout?: "grid" | "list" | "carousel";
	columns?: number;
	allowReorder?: boolean;
};

export type _PoolSpaceData = _SpaceBase & {
	kind: "pool";
	layout: "grid" | "list" | "carousel";
	columns?: number;
	allowReorder: boolean;
	entityIds: string[];
};

export type _PathSpaceConfig = _SpaceBaseConfig & {
	path: string;
	viewBox?: string;
	duration?: number;
	speedMultiplier?: number;
	showDropzone?: boolean;
};

export type _PathSpaceData = _SpaceBase & {
	kind: "path";
	path: string;
	viewBox: string;
	duration: number;
	speedMultiplier: number;
	showDropzone: boolean;
	entityIds: string[];
};

export type _CustomSpaceConfig = _SpaceBaseConfig;

export type _CustomSpaceData = _SpaceBase & {
	kind: "custom";
};

export type _QueueSpaceConfig = _SpaceBaseConfig & {
	maxDepth?: number;
	direction?: "horizontal" | "vertical";
};

export type _QueueSpaceData = _SpaceBase & {
	kind: "queue";
	maxDepth?: number;
	direction: "horizontal" | "vertical";
	entityIds: string[];
};

export type _MeterSpaceConfig = _SpaceBaseConfig & {
	min: number;
	max: number;
	unit?: string;
	thresholds?: Array<{ value: number; color: string }>;
};

export type _MeterSpaceData = _SpaceBase & {
	kind: "meter";
	min: number;
	max: number;
	value: number;
	unit: string;
	thresholds: Array<{ value: number; color: string }>;
};

export type _SpaceData =
	| _GridSpaceData
	| _PoolSpaceData
	| _PathSpaceData
	| _CustomSpaceData
	| _QueueSpaceData
	| _MeterSpaceData;

export type GridPosition = _GridPosition;
export type GridMetrics = _GridMetrics;
export type SpaceBaseConfig = _SpaceBaseConfig;
export type SpaceBase = _SpaceBase;
export type GridSpaceConfig = _GridSpaceConfig;
export type GridSpaceData = _GridSpaceData;
export type PoolSpaceConfig = _PoolSpaceConfig;
export type PoolSpaceData = _PoolSpaceData;
export type PathSpaceConfig = _PathSpaceConfig;
export type PathSpaceData = _PathSpaceData;
export type CustomSpaceConfig = _CustomSpaceConfig;
export type CustomSpaceData = _CustomSpaceData;
export type QueueSpaceConfig = _QueueSpaceConfig;
export type QueueSpaceData = _QueueSpaceData;
export type MeterSpaceConfig = _MeterSpaceConfig;
export type MeterSpaceData = _MeterSpaceData;
export type SpaceData = _SpaceData;

export const isGridSpace = (space: _SpaceData): space is _GridSpaceData => {
	return space.kind === "grid";
};

export const isPoolSpace = (space: _SpaceData): space is _PoolSpaceData => {
	return space.kind === "pool";
};

export const isPathSpace = (space: _SpaceData): space is _PathSpaceData => {
	return space.kind === "path";
};

export const isCustomSpace = (space: _SpaceData): space is _CustomSpaceData => {
	return space.kind === "custom";
};

export const isQueueSpace = (space: _SpaceData): space is _QueueSpaceData => {
	return space.kind === "queue";
};

export const isMeterSpace = (space: _SpaceData): space is _MeterSpaceData => {
	return space.kind === "meter";
};

export const isValidGridPosition = (
	position: unknown,
): position is _GridPosition => {
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
