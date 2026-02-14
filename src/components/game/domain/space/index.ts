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
	gridAdd,
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
	gridRemove,
	pathAdd,
	pathContains,
	pathGetEntityCount,
	pathIsEmpty,
	pathIsFull,
	pathRemove,
	poolAdd,
	poolContains,
	poolGetEntityCount,
	poolIsEmpty,
	poolIsFull,
	poolRemove,
	queueContains,
	queueDequeue,
	queueEnqueue,
	queueGetEntityCount,
	queueIsEmpty,
	queueIsFull,
	queuePeek,
	queueRemove,
	spaceContains,
	spaceGetEntityCount,
	spaceIsEmpty,
	spaceIsFull,
	spaceRemove,
} from "./space-fns";

// Validation functions
export { canEntityBePlaced, findEntitySpace } from "./validation";
