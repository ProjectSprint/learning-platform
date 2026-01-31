/**
 * Grid infrastructure module.
 * Provides abstract grid systems for various layout types.
 *
 * This module supports multiple grid topologies:
 * - Square/Rectangular grids (fully implemented)
 * - Hexagonal grids (planned)
 * - Radial/Polar grids (planned)
 *
 * @module infrastructure/grid
 */

export type { GridDirection, GridMetrics } from "./core/GridBase";
// Core abstractions
export { GridBase } from "./core/GridBase";

export { GridCell } from "./core/GridCell";
export type {
	CubeCoordinate,
	HexGridConfig,
	HexOrientation,
} from "./variants/HexGrid";
export { HexGrid } from "./variants/HexGrid";
export type {
	PolarCoordinate,
	RadialGridConfig,
} from "./variants/RadialGrid";
export { RadialGrid } from "./variants/RadialGrid";
export type { SquareGridConfig } from "./variants/SquareGrid";
// Grid variants
export { SquareGrid } from "./variants/SquareGrid";
