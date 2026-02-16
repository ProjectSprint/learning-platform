/**
 * Space domain exports.
 * Provides access to space data contracts and type guards.
 */

// Types
export type {
	CustomSpaceConfig,
	CustomSpaceData,
	GridPosition,
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
	SpaceBase,
	SpaceBaseConfig,
	SpaceData,
} from "./space-data";

// Type guards
export {
	isGridSpace,
	isMeterSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
	isValidGridPosition,
} from "./space-data";
