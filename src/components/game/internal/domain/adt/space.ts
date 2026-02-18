import type {
	CustomSpaceConfig,
	CustomSpaceData,
	GridSpaceConfig,
	GridSpaceData,
	MeterSpaceConfig,
	MeterSpaceData,
	PathSpaceConfig,
	PathSpaceData,
	PoolSpaceConfig,
	PoolSpaceData,
	QueueSpaceConfig,
	QueueSpaceData,
} from "@/components/game/types/space";

const DEFAULT_POOL_ALLOW_REORDER = true;

export const createGridSpaceData = (config: GridSpaceConfig): GridSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "grid",
		rows: config.rows,
		cols: config.cols,
		metrics: config.metrics,
		allowMultiplePerCell: config.allowMultiplePerCell ?? false,
		entityPositions: {},
	};
};

export const createPoolSpaceData = (config: PoolSpaceConfig): PoolSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "pool",
		layout: config.layout ?? "grid",
		columns: config.columns,
		allowReorder: config.allowReorder ?? DEFAULT_POOL_ALLOW_REORDER,
		entityIds: [],
	};
};

export const createPathSpaceData = (config: PathSpaceConfig): PathSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "path",
		path: config.path,
		viewBox: config.viewBox ?? "0 0 320 120",
		duration: config.duration ?? 1.5,
		speedMultiplier: config.speedMultiplier ?? 1,
		showDropzone: config.showDropzone ?? true,
		entityIds: [],
	};
};

export const createCustomSpaceData = (
	config: CustomSpaceConfig,
): CustomSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "custom",
	};
};

export const createQueueSpaceData = (
	config: QueueSpaceConfig,
): QueueSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity ?? config.maxDepth,
		metadata: config.metadata ?? {},
		kind: "queue",
		maxDepth: config.maxDepth,
		direction: config.direction ?? "horizontal",
		entityIds: [],
	};
};

export const createMeterSpaceData = (
	config: MeterSpaceConfig,
): MeterSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "meter",
		min: config.min,
		max: config.max,
		value: config.min,
		unit: config.unit ?? "",
		thresholds: config.thresholds ?? [],
	};
};
