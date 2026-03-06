export type GridPosition = {
	row: number;
	col: number;
};

export type ListPosition = {
	index: number;
};

export type SpacePosition = GridPosition | ListPosition;

export type ResponsiveValue<T> =
	| T
	| ({ base: T } & Partial<Record<"sm" | "md" | "lg" | "xl" | "2xl", T>>);

export type CellSize = {
	cellWidth?: ResponsiveValue<number>;
	cellHeight?: ResponsiveValue<number>;
};

export type ResolvedCellSize = {
	cellWidth: number;
	cellHeight: number;
};

export type GapSize = {
	gapX?: ResponsiveValue<number>;
	gapY?: ResponsiveValue<number>;
};

export type ResolvedGapSize = {
	gapX: number;
	gapY: number;
};

export type GridMetrics = CellSize & GapSize;

export type ResolvedGridMetrics = ResolvedCellSize & ResolvedGapSize;

export type SpaceBaseConfig<TId extends string = string> = {
	id: TId;
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

export type GridSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId> & {
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

export type PoolSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId> & {
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

export type PathSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId> & {
		path: string;
		viewBox?: string;
		duration?: number;
		speedMultiplier?: number;
		showDropzone?: boolean;
		cellSize?: CellSize;
	};

export type PathSpaceData = SpaceBase & {
	kind: "path";
	path: string;
	viewBox: string;
	duration: number;
	speedMultiplier: number;
	showDropzone: boolean;
	cellSize?: CellSize;
	entityIds: string[];
};

export type CustomSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId>;

export type CustomSpaceData = SpaceBase & {
	kind: "custom";
};

export type QueueSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId> & {
		maxDepth?: number;
		direction?: "horizontal" | "vertical";
	};

export type QueueSpaceData = SpaceBase & {
	kind: "queue";
	maxDepth?: number;
	direction: "horizontal" | "vertical";
	entityIds: string[];
};

export type MeterSpaceConfig<TId extends string = string> =
	SpaceBaseConfig<TId> & {
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

const hasNumberField = (value: object, key: string): boolean => {
	const candidate = Reflect.get(value, key);
	return typeof candidate === "number";
};

export const isValidGridPosition = (
	position: unknown,
): position is GridPosition => {
	if (
		position === undefined ||
		typeof position !== "object" ||
		position === null
	) {
		return false;
	}
	if (!("row" in position) || !("col" in position)) {
		return false;
	}
	return hasNumberField(position, "row") && hasNumberField(position, "col");
};

export const isValidListPosition = (
	position: unknown,
): position is ListPosition => {
	if (
		position === undefined ||
		typeof position !== "object" ||
		position === null
	) {
		return false;
	}
	if (!("index" in position)) {
		return false;
	}
	return hasNumberField(position, "index");
};
