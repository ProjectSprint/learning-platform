/**
 * Geometry module.
 * Provides coordinate systems and mathematical utilities for spatial operations.
 *
 * @module infrastructure/geometry
 */

export type {
	Dimensions,
	GridCoordinate,
	Point2D,
} from "./coordinates";

export {
	addPoints,
	clamp,
	clampPoint,
	createGridCoord,
	createPoint,
	distance,
	gridCoordsEqual,
	isInBounds,
	manhattanDistance,
	pointsEqual,
	scalePoint,
	snapPointToGrid,
	snapToGrid,
	subtractPoints,
} from "./coordinates";
