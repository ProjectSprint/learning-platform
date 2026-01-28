import type { Connection } from "./connection";
import type { PlacedItem } from "./placed-item";

export type Placement = {
	blockX: number;
	blockY: number;
	itemType: string;
};

export type CanvasConfig = {
	id: string;
	title?: string;
	columns: number;
	rows: number;
	orientation?: "horizontal" | "vertical";
	canvasId?: string;
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

export type CanvasState = {
	config: CanvasConfig;
	blocks: Block[][];
	placedItems: PlacedItem[];
	connections: Connection[];
	selectedBlock: { x: number; y: number } | null;
};
