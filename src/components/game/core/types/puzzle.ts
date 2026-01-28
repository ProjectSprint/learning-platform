import type { Connection } from "./connection";
import type { PlacedItem } from "./placed-item";

export type Placement = {
	blockX: number;
	blockY: number;
	itemType: string;
};

export type PuzzleConfig = {
	id: string;
	title?: string;
	columns: number;
	rows: number;
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
	connections: Connection[];
	selectedBlock: { x: number; y: number } | null;
};
