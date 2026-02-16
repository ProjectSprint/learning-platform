/**
 * Core coordinate system types and utilities for game infrastructure.
 * Provides abstractions for working with different coordinate spaces.
 */

/**
 * Represents a position in 2D space with x and y coordinates.
 */
export type Point2D = {
	x: number;
	y: number;
};

/**
 * Represents a grid coordinate with integer indices.
 */
export type GridCoordinate = {
	row: number;
	col: number;
};

/**
 * Represents a size with width and height.
 */
export type Dimensions = {
	width: number;
	height: number;
};

/**
 * Creates a Point2D from x and y coordinates.
 */
export const createPoint = (x: number, y: number): Point2D => ({ x, y });

/**
 * Creates a GridCoordinate from row and column indices.
 */
export const createGridCoord = (row: number, col: number): GridCoordinate => ({
	row,
	col,
});

/**
 * Checks if two points are equal.
 */
export const pointsEqual = (a: Point2D, b: Point2D): boolean =>
	a.x === b.x && a.y === b.y;

/**
 * Checks if two grid coordinates are equal.
 */
export const gridCoordsEqual = (
	a: GridCoordinate,
	b: GridCoordinate,
): boolean => a.row === b.row && a.col === b.col;

/**
 * Calculates the Euclidean distance between two points.
 */
export const distance = (a: Point2D, b: Point2D): number => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculates the Manhattan distance between two grid coordinates.
 */
export const manhattanDistance = (
	a: GridCoordinate,
	b: GridCoordinate,
): number => Math.abs(b.row - a.row) + Math.abs(b.col - a.col);

/**
 * Adds two points together.
 */
export const addPoints = (a: Point2D, b: Point2D): Point2D => ({
	x: a.x + b.x,
	y: a.y + b.y,
});

/**
 * Subtracts point b from point a.
 */
export const subtractPoints = (a: Point2D, b: Point2D): Point2D => ({
	x: a.x - b.x,
	y: a.y - b.y,
});

/**
 * Scales a point by a factor.
 */
export const scalePoint = (p: Point2D, factor: number): Point2D => ({
	x: p.x * factor,
	y: p.y * factor,
});

/**
 * Snaps a value to the nearest grid step.
 */
export const snapToGrid = (
	value: number,
	gridSize: number,
	offset = 0,
): number => {
	if (!Number.isFinite(gridSize) || gridSize <= 0) {
		return value;
	}
	return Math.round((value - offset) / gridSize) * gridSize + offset;
};

/**
 * Snaps a point to the nearest grid position.
 */
export const snapPointToGrid = (
	point: Point2D,
	gridWidth: number,
	gridHeight: number,
	offsetX = 0,
	offsetY = 0,
): Point2D => ({
	x: snapToGrid(point.x, gridWidth, offsetX),
	y: snapToGrid(point.y, gridHeight, offsetY),
});

/**
 * Checks if a grid coordinate is within bounds.
 */
export const isInBounds = (
	coord: GridCoordinate,
	rows: number,
	cols: number,
): boolean =>
	coord.row >= 0 && coord.row < rows && coord.col >= 0 && coord.col < cols;

/**
 * Clamps a value between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, value));

/**
 * Clamps a point within a rectangular boundary.
 */
export const clampPoint = (
	point: Point2D,
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
): Point2D => ({
	x: clamp(point.x, minX, maxX),
	y: clamp(point.y, minY, maxY),
});
