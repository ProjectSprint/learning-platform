/**
 * Geometry module.
 * Provides coordinate systems and mathematical utilities for spatial operations.
 *
 * @module infrastructure/geometry
 */

export {
	addPoints,
	clamp,
	clampPoint,
	createGridCoord,
	createPoint,
	type Dimensions,
	distance,
	type GridCoordinate,
	gridCoordsEqual,
	isInBounds,
	manhattanDistance,
	type Point2D,
	pointsEqual,
	scalePoint,
	snapPointToGrid,
	snapToGrid,
	subtractPoints,
} from "./coordinates";
