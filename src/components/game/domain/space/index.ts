/**
 * Space domain exports.
 * Provides access to all space types, data, and utility functions.
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

// Factory and utility functions
export {
	createCustomSpaceData,
	createGridSpaceData,
	createMeterSpaceData,
	createPathSpaceData,
	createPoolSpaceData,
	createQueueSpaceData,
	gridCanAccept,
	gridContains,
	gridGetEmptyPositions,
	gridGetEntitiesAt,
	gridGetEntityCount,
	gridGetOccupiedPositions,
	gridGetPosition,
	gridIsEmpty,
	gridIsFull,
	gridIsOccupied,
	pathContains,
	pathGetEntityCount,
	pathIsEmpty,
	pathIsFull,
	poolContains,
	poolGetEntityCount,
	poolIsEmpty,
	poolIsFull,
	queueContains,
	queueDequeue,
	queueGetEntityCount,
	queueIsEmpty,
	queueIsFull,
	queuePeek,
	spaceContains,
	spaceGetEntityCount,
	spaceIsEmpty,
	spaceIsFull,
} from "./space-fns";

// Validation functions
export { canEntityBePlaced, findEntitySpace } from "./validation";
