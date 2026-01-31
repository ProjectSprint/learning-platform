import type { PlacedItem } from "./placed-item";

export type Placement = {
	blockX: number;
	blockY: number;
	itemType: string;
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
	initialPlacements?: Placement[];
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
	placedItems: PlacedItem[];
	selectedBlock: { x: number; y: number } | null;
};
