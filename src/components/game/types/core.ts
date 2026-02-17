import type { IconInfo } from "./icon";
import type { OverlayState } from "./modal";

export type ArrowAnchor = "tl" | "tr" | "bl" | "br";

export type ArrowBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type ArrowAnchorValue =
	| ArrowAnchor
	| Partial<Record<ArrowBreakpoint, ArrowAnchor>>;

export type ArrowEndpoint = {
	spaceId: string;
	anchor: ArrowAnchorValue;
};

export type ArrowStyle = {
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
	headSize?: number;
	dashed?: boolean;
	bow?: number;
	stretch?: number;
	stretchMin?: number;
	stretchMax?: number;
	padStart?: number;
	padEnd?: number;
	flip?: boolean;
	straights?: boolean;
};

export type Arrow = {
	id: string;
	from: ArrowEndpoint;
	to: ArrowEndpoint;
	style?: ArrowStyle;
	label?: string;
};

export type DrawerBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type DrawerState = "expanded" | "folded";

export type DrawerPosition = "bottom" | "top" | "left" | "right";

export type DrawerSizeMap = Partial<Record<DrawerBreakpoint, string>>;

export type DrawerConfig = {
	id: string;
	contentType: "space";
	spaceId: string;
	spaceIds?: string[];
	title?: string;
	position?: DrawerPosition;
	initialState?: DrawerState;
	foldedSize?: DrawerSizeMap;
	expandedSize?: DrawerSizeMap;
	mouseAware?: boolean;
	showFloatingButton?: boolean;
	floatingButtonLabel?: string;
};

export type DrawerInstance = DrawerConfig & {
	state: DrawerState;
};

export type HintState = {
	visible: boolean;
	content: string | null;
};

export type ItemTooltip = {
	content: string;
	seeMoreHref?: string;
};

export type Item = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
	data?: Record<string, unknown>;
	draggable?: boolean;
	category?: string;
};

export type InventoryGroup = {
	id: string;
	title: string;
	visible: boolean;
	items: Item[];
};

export type InventoryGroupConfig = {
	id: string;
	title: string;
	visible?: boolean;
	items: Item[];
};

export type BoardItemStatus = "normal" | "warning" | "success" | "error";

export type EntityStatus = "success" | "warning" | "error" | "info" | undefined;

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

export type TerminalEntryType =
	| "prompt"
	| "input"
	| "output"
	| "error"
	| "hint"
	| "info";

export type TerminalEntry = {
	id: string;
	type: TerminalEntryType;
	content: string;
	timestamp: number;
};

export type TerminalState = {
	visible: boolean;
	prompt: string;
	history: TerminalEntry[];
};

export type GamePhase =
	| "setup"
	| "configuring"
	| "playing"
	| "terminal"
	| "completed";

export type QuestionStatus = "in_progress" | "completed";

export type GameState = {
	phase: GamePhase;
	inventory: { groups: InventoryGroup[] };
	space: SpaceState;
	spaces?: Record<string, SpaceState>;
	arrows: Arrow[];
	hint: HintState;
	overlay: OverlayState;
	question: { id: string; status: QuestionStatus };
	sequence: number;
};
