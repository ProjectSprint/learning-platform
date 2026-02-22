import type { IconInfo } from "./icon";

export type BoardItemStatus = "normal" | "warning" | "success" | "error";

export type EntityStatus = "success" | "warning" | "error" | "info" | undefined;

export type SpaceBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type SpaceSize = [number, number];

export type SpaceSizeValue =
	| SpaceSize
	| Partial<Record<SpaceBreakpoint, SpaceSize>>;

export type SpaceItemLocation = {
	id: string;
	itemId: string;
	type: string;
	blockX: number;
	blockY: number;
	status: BoardItemStatus;
	icon?: IconInfo;
	data: Record<string, unknown>;
};

export type SpaceItemLocationSeed = {
	itemId: string;
	blockX: number;
	blockY: number;
	status?: BoardItemStatus;
	data?: Record<string, unknown>;
};

export type SpaceConfig = {
	id: string;
	title?: string;
	size: SpaceSizeValue;
	orientation?: "horizontal" | "vertical";
	maxItems?: number;
	initialPlacements?: SpaceItemLocationSeed[];
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
	placedItems: SpaceItemLocation[];
	selectedBlock: { x: number; y: number } | null;
};

export type GamePhase =
	| "setup"
	| "configuring"
	| "playing"
	| "terminal"
	| "completed";

export type QuestionStatus = "in_progress" | "completed";
