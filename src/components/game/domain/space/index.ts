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
	PoolSpaceConfig,
	PoolSpaceData,
	SpaceBase,
	SpaceBaseConfig,
	SpaceData,
} from "./space-data";

// Type guards
export { isGridSpace, isPoolSpace, isValidGridPosition } from "./space-data";

// Factory and utility functions
export {
	createGridSpaceData,
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
