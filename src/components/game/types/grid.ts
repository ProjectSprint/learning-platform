import type { _GridMetrics } from "./space";

export type _GridDirection =
	| "north"
	| "south"
	| "east"
	| "west"
	| "northeast"
	| "northwest"
	| "southeast"
	| "southwest";

export type _SquareGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: _GridMetrics;
	initializer?: (row: number, col: number) => T | null;
};

export type _HexOrientation = "flat-top" | "pointy-top";

export type _CubeCoordinate = {
	q: number;
	r: number;
	s: number;
};

export type _HexGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: _GridMetrics;
	orientation?: _HexOrientation;
	initializer?: (row: number, col: number) => T | null;
};

export type _PolarCoordinate = {
	ring: number;
	sector: number;
};

export type _RadialGridConfig<T> = {
	rings: number;
	sectorsPerRing: number | number[];
	metrics: _GridMetrics;
	centerRadius?: number;
	ringSpacing?: number;
	initializer?: (ring: number, sector: number) => T | null;
};

export type GridDirection = _GridDirection;
export type GridMetrics = _GridMetrics;
export type SquareGridConfig<T> = _SquareGridConfig<T>;
export type HexOrientation = _HexOrientation;
export type CubeCoordinate = _CubeCoordinate;
export type HexGridConfig<T> = _HexGridConfig<T>;
export type PolarCoordinate = _PolarCoordinate;
export type RadialGridConfig<T> = _RadialGridConfig<T>;
