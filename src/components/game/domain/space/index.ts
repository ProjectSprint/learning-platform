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
	PathSpaceConfig,
	PathSpaceData,
	PoolSpaceConfig,
	PoolSpaceData,
	SpaceBase,
	SpaceBaseConfig,
	SpaceData,
} from "./space-data";

// Type guards
export {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
	isValidGridPosition,
} from "./space-data";

// Factory and utility functions
export {
	createCustomSpaceData,
	createGridSpaceData,
	createPathSpaceData,
	createPoolSpaceData,
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
	spaceContains,
	spaceGetEntityCount,
	spaceIsEmpty,
	spaceIsFull,
	spaceRemove,
} from "./space-fns";

// Validation functions
export { canEntityBePlaced, findEntitySpace } from "./validation";
