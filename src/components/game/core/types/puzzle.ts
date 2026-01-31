import type { BoardItemLocation, BoardItemStatus } from "./placed-item";

export type BoardItemLocationSeed = {
	itemId: string;
	blockX: number;
	blockY: number;
	status?: BoardItemStatus;
	data?: Record<string, unknown>;
};

export type PuzzleBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type PuzzleSize = [number, number];

export type PuzzleSizeValue =
	| PuzzleSize
	| Partial<Record<PuzzleBreakpoint, PuzzleSize>>;

export type PuzzleConfig = {
	id: string;
	title?: string;
	size: PuzzleSizeValue;
	orientation?: "horizontal" | "vertical";
	puzzleId?: string;
	maxItems?: number;
	initialPlacements?: BoardItemLocationSeed[];
};

export type BlockStatus = "empty" | "hover" | "occupied" | "invalid";

export type Block = {
	x: number;
	y: number;
	status: BlockStatus;
	itemId?: string;
};

export type PuzzleState = {
	config: PuzzleConfig;
	blocks: Block[][];
	placedItems: BoardItemLocation[];
	selectedBlock: { x: number; y: number } | null;
};
