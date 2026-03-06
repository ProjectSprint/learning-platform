import type { ResolvedGridMetrics } from "./space";

export type GridDirection =
	| "north"
	| "south"
	| "east"
	| "west"
	| "northeast"
	| "northwest"
	| "southeast"
	| "southwest";

export type SquareGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: ResolvedGridMetrics;
	initializer?: (row: number, col: number) => T | null;
};

export type HexOrientation = "flat-top" | "pointy-top";

export type CubeCoordinate = {
	q: number;
	r: number;
	s: number;
};

export type HexGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: ResolvedGridMetrics;
	orientation?: HexOrientation;
	initializer?: (row: number, col: number) => T | null;
};

export type PolarCoordinate = {
	ring: number;
	sector: number;
};

export type RadialGridConfig<T> = {
	rings: number;
	sectorsPerRing: number | number[];
	metrics: ResolvedGridMetrics;
	centerRadius?: number;
	ringSpacing?: number;
	initializer?: (ring: number, sector: number) => T | null;
};
