import type { _IconInfo } from "./icon";
import type { _ModalInstance, _OverlayState } from "./modal";

export type _ArrowAnchor = "tl" | "tr" | "bl" | "br";

export type _ArrowBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type _ArrowAnchorValue =
	| _ArrowAnchor
	| Partial<Record<_ArrowBreakpoint, _ArrowAnchor>>;

export type _ArrowEndpoint = {
	spaceId: string;
	anchor: _ArrowAnchorValue;
};

export type _ArrowStyle = {
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

export type _Arrow = {
	id: string;
	from: _ArrowEndpoint;
	to: _ArrowEndpoint;
	style?: _ArrowStyle;
	label?: string;
};

export type _DrawerBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type _DrawerState = "expanded" | "folded";

export type _DrawerPosition = "bottom" | "top" | "left" | "right";

export type _DrawerSizeMap = Partial<Record<_DrawerBreakpoint, string>>;

export type _DrawerConfig = {
	id: string;
	contentType: "space";
	spaceId: string;
	spaceIds?: string[];
	title?: string;
	position?: _DrawerPosition;
	initialState?: _DrawerState;
	foldedSize?: _DrawerSizeMap;
	expandedSize?: _DrawerSizeMap;
	mouseAware?: boolean;
	showFloatingButton?: boolean;
	floatingButtonLabel?: string;
};

export type _DrawerInstance = _DrawerConfig & {
	state: _DrawerState;
};

export type _HintState = {
	visible: boolean;
	content: string | null;
};

export type _ItemTooltip = {
	content: string;
	seeMoreHref?: string;
};

export type _Item = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	icon?: _IconInfo;
	tooltip?: _ItemTooltip;
	data?: Record<string, unknown>;
	draggable?: boolean;
	category?: string;
};

export type _InventoryGroup = {
	id: string;
	title: string;
	visible: boolean;
	items: _Item[];
};

export type _InventoryGroupConfig = {
	id: string;
	title: string;
	visible?: boolean;
	items: _Item[];
};

export type _BoardItemStatus = "normal" | "warning" | "success" | "error";

export type _EntityStatus =
	| "success"
	| "warning"
	| "error"
	| "info"
	| undefined;

export type _SpaceItemLocation = {
	id: string;
	itemId: string;
	type: string;
	blockX: number;
	blockY: number;
	status: _BoardItemStatus;
	icon?: _IconInfo;
	data: Record<string, unknown>;
};

export type _SpaceItemLocationSeed = {
	itemId: string;
	blockX: number;
	blockY: number;
	status?: _BoardItemStatus;
	data?: Record<string, unknown>;
};

export type _SpaceBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type _SpaceSize = [number, number];

export type _SpaceSizeValue =
	| _SpaceSize
	| Partial<Record<_SpaceBreakpoint, _SpaceSize>>;

export type _SpaceConfig = {
	id: string;
	title?: string;
	size: _SpaceSizeValue;
	orientation?: "horizontal" | "vertical";
	maxItems?: number;
	initialPlacements?: _SpaceItemLocationSeed[];
};

export type _BlockStatus = "empty" | "hover" | "occupied" | "invalid";

export type _Block = {
	x: number;
	y: number;
	status: _BlockStatus;
	itemId?: string;
};

export type _SpaceState = {
	config: _SpaceConfig;
	blocks: _Block[][];
	placedItems: _SpaceItemLocation[];
	selectedBlock: { x: number; y: number } | null;
};

export type _TerminalEntryType =
	| "prompt"
	| "input"
	| "output"
	| "error"
	| "hint"
	| "info";

export type _TerminalEntry = {
	id: string;
	type: _TerminalEntryType;
	content: string;
	timestamp: number;
};

export type _TerminalState = {
	visible: boolean;
	prompt: string;
	history: _TerminalEntry[];
};

export type _GamePhase =
	| "setup"
	| "configuring"
	| "playing"
	| "terminal"
	| "completed";

export type _QuestionStatus = "in_progress" | "completed";

export type _GameState = {
	phase: _GamePhase;
	inventory: { groups: _InventoryGroup[] };
	space: _SpaceState;
	spaces?: Record<string, _SpaceState>;
	arrows: _Arrow[];
	hint: _HintState;
	overlay: _OverlayState;
	question: { id: string; status: _QuestionStatus };
	sequence: number;
};

export type ArrowAnchor = _ArrowAnchor;
export type ArrowBreakpoint = _ArrowBreakpoint;
export type ArrowAnchorValue = _ArrowAnchorValue;
export type ArrowEndpoint = _ArrowEndpoint;
export type ArrowStyle = _ArrowStyle;
export type Arrow = _Arrow;
export type DrawerBreakpoint = _DrawerBreakpoint;
export type DrawerState = _DrawerState;
export type DrawerPosition = _DrawerPosition;
export type DrawerSizeMap = _DrawerSizeMap;
export type DrawerConfig = _DrawerConfig;
export type DrawerInstance = _DrawerInstance;
export type HintState = _HintState;
export type IconInfo = _IconInfo;
export type ItemTooltip = _ItemTooltip;
export type Item = _Item;
export type InventoryGroup = _InventoryGroup;
export type InventoryGroupConfig = _InventoryGroupConfig;
export type BoardItemStatus = _BoardItemStatus;
export type EntityStatus = _EntityStatus;
export type SpaceItemLocation = _SpaceItemLocation;
export type SpaceItemLocationSeed = _SpaceItemLocationSeed;
export type SpaceBreakpoint = _SpaceBreakpoint;
export type SpaceSize = _SpaceSize;
export type SpaceSizeValue = _SpaceSizeValue;
export type SpaceConfig = _SpaceConfig;
export type BlockStatus = _BlockStatus;
export type Block = _Block;
export type SpaceState = _SpaceState;
export type ModalInstance = _ModalInstance;
export type OverlayState = _OverlayState;
export type TerminalEntryType = _TerminalEntryType;
export type TerminalEntry = _TerminalEntry;
export type TerminalState = _TerminalState;
export type GamePhase = _GamePhase;
export type QuestionStatus = _QuestionStatus;
export type GameState = _GameState;

export type _LegacyArrowAction =
	| { type: "ADD_ARROW"; payload: { arrow: Arrow } }
	| {
			type: "UPDATE_ARROW";
			payload: { id: string; updates: Partial<Arrow> };
	  }
	| { type: "REMOVE_ARROW"; payload: { id: string } }
	| { type: "SET_ARROWS"; payload: { arrows: Arrow[] } }
	| { type: "CLEAR_ARROWS" };

export type _LegacyCoreAction =
	| {
			type: "INIT_MULTI_SPACE";
			payload: {
				questionId: string;
				spaces: Record<string, SpaceConfig>;
				inventoryGroups?: InventoryGroupConfig[];
				phase?: GamePhase;
				questionStatus?: QuestionStatus;
			};
	  }
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };

export type _LegacyHintAction =
	| { type: "SHOW_HINT"; payload: { content: string } }
	| { type: "HIDE_HINT" }
	| { type: "REPLACE_HINT"; payload: { content: string } };

export type _LegacyModalAction =
	| { type: "OPEN_MODAL"; payload: ModalInstance }
	| { type: "CLOSE_MODAL"; payload?: { modalId?: string } };

export type _LegacyPoolAction =
	| {
			type: "ADD_POOL_GROUP";
			payload: { group: InventoryGroupConfig };
	  }
	| {
			type: "UPDATE_POOL_GROUP";
			payload: {
				id: string;
				title?: string;
				visible?: boolean;
				items?: Item[];
			};
	  }
	| {
			type: "UPDATE_POOL_ITEM_TOOLTIP";
			payload: { itemId: string; tooltip?: ItemTooltip | null };
	  }
	| { type: "REMOVE_POOL_GROUP"; payload: { id: string } }
	| { type: "PURGE_POOL_ITEMS"; payload: { itemIds: string[] } };

export type _LegacySpaceAction =
	| {
			type: "PLACE_ITEM";
			payload: {
				itemId: string;
				blockX: number;
				blockY: number;
				spaceId?: string;
			};
	  }
	| {
			type: "REMOVE_ITEM";
			payload: { blockX: number; blockY: number; spaceId?: string };
	  }
	| {
			type: "REPOSITION_ITEM";
			payload: {
				itemId: string;
				fromBlockX: number;
				fromBlockY: number;
				toBlockX: number;
				toBlockY: number;
				spaceId?: string;
			};
	  }
	| {
			type: "CONFIGURE_DEVICE";
			payload: {
				deviceId: string;
				config: Record<string, unknown>;
				spaceId?: string;
			};
	  }
	| {
			type: "TRANSFER_ITEM";
			payload: {
				itemId: string;
				fromSpace: string;
				fromBlockX: number;
				fromBlockY: number;
				toSpace: string;
				toBlockX: number;
				toBlockY: number;
			};
	  }
	| {
			type: "SWAP_ITEMS";
			payload: {
				from: { spaceId?: string; blockX: number; blockY: number };
				to: { spaceId?: string; blockX: number; blockY: number };
			};
	  };

export type _LegacyGameAction =
	| _LegacySpaceAction
	| _LegacyArrowAction
	| _LegacyCoreAction
	| _LegacyHintAction
	| _LegacyPoolAction
	| _LegacyModalAction;

export type LegacyArrowAction = _LegacyArrowAction;
export type LegacyCoreAction = _LegacyCoreAction;
export type LegacyHintAction = _LegacyHintAction;
export type LegacyModalAction = _LegacyModalAction;
export type LegacyPoolAction = _LegacyPoolAction;
export type LegacySpaceAction = _LegacySpaceAction;
export type LegacyGameAction = _LegacyGameAction;
