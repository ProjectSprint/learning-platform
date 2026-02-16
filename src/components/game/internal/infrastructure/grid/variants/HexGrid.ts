/**
 * Hexagonal grid implementation.
 * Provides support for hexagonal tile-based layouts with six-way connectivity.
 *
 * TODO: Implement hexagonal grid system
 * - Support for flat-top and pointy-top orientations
 * - Cube coordinate system for easier hex math
 * - Axial coordinate conversion
 * - Six-way neighbor traversal
 * - Proper pixel-to-hex and hex-to-pixel conversions
 * - Distance calculations using cube coordinates
 * - Line drawing and pathfinding
 * - Ring and spiral traversal patterns
 *
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */

import type { GridCoordinate, Point2D } from "../../geometry/coordinates";
import type { GridMetrics } from "../core/GridBase";
import { GridBase } from "../core/GridBase";
import type { GridCell } from "../core/GridCell";

/**
 * Hexagonal grid orientation.
 */
export type HexOrientation = "flat-top" | "pointy-top";

/**
 * Cube coordinates for hexagonal grids.
 * More convenient for hex math than axial coordinates.
 */
export type CubeCoordinate = {
	q: number;
	r: number;
	s: number;
};

/**
 * Configuration for hexagonal grids.
 */
export type HexGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: GridMetrics;
	orientation?: HexOrientation;
	initializer?: (row: number, col: number) => T | null;
};

/**
 * Hexagonal grid implementation (STUB - To be implemented).
 *
 * @template T The type of data stored in grid cells
 */
export class HexGrid<T = unknown> extends GridBase<T> {
	constructor(config: HexGridConfig<T>) {
		super(config.rows, config.cols, config.metrics);

		// TODO: Store orientation when implementing
		// const orientation = config.orientation ?? "flat-top";

		throw new Error(
			"HexGrid is not yet implemented. This is a placeholder for future development.",
		);
	}

	/**
	 * TODO: Implement getCellAt for hexagonal coordinates.
	 */
	getCellAt(_coord: GridCoordinate): GridCell<T> | null {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Implement getNeighbors for six-way hex connectivity.
	 */
	getNeighbors(
		_coord: GridCoordinate,
		_includeDiagonals?: boolean,
	): GridCell<T>[] {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Implement coordToPixel using hex layout formulas.
	 */
	coordToPixel(_coord: GridCoordinate): Point2D | null {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Implement pixelToCoord using hex layout formulas.
	 */
	pixelToCoord(_point: Point2D): GridCoordinate | null {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Implement getAllCells for hex grid traversal.
	 */
	getAllCells(): GridCell<T>[] {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Convert axial coordinates to cube coordinates.
	 */
	static axialToCube(_coord: GridCoordinate): CubeCoordinate {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Convert cube coordinates to axial coordinates.
	 */
	static cubeToAxial(_cube: CubeCoordinate): GridCoordinate {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Get all six neighbors of a hex in cube coordinates.
	 */
	static getCubeNeighbors(_cube: CubeCoordinate): CubeCoordinate[] {
		throw new Error("Not implemented");
	}

	/**
	 * TODO: Calculate distance between two hexes in cube coordinates.
	 */
	static cubeDistance(_a: CubeCoordinate, _b: CubeCoordinate): number {
		throw new Error("Not implemented");
	}
}
