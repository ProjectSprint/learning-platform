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

// Core abstractions
export { GridBase } from "./core/GridBase";

export { GridCell } from "./core/GridCell";
export { HexGrid } from "./variants/HexGrid";
export { RadialGrid } from "./variants/RadialGrid";
// Grid variants
export { SquareGrid } from "./variants/SquareGrid";
