import type { BoardItemLocation, BoardItemStatus } from "./placed-item";

export type BoardItemLocationSeed = {
	itemId: string;
	blockX: number;
	blockY: number;
	status?: BoardItemStatus;
	data?: Record<string, unknown>;
};

export type SpaceBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type SpaceSize = [number, number];

export type SpaceSizeValue =
	| SpaceSize
	| Partial<Record<SpaceBreakpoint, SpaceSize>>;

export type SpaceConfig = {
	id: string;
	title?: string;
	size: SpaceSizeValue;
	orientation?: "horizontal" | "vertical";
	spaceId?: string;
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

export type SpaceState = {
	config: SpaceConfig;
	blocks: Block[][];
	placedItems: BoardItemLocation[];
	selectedBlock: { x: number; y: number } | null;
};
