// Configuration constants for the networking question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type {
	InventoryGroupConfig,
	Item,
	PuzzleConfig,
	TerminalEntry,
} from "@/components/game/game-provider";

export const QUESTION_ID = "networking";
export const QUESTION_TITLE = "🏡 Setup your home connection!";
export const QUESTION_DESCRIPTION =
	"Try to connect two of this PC using Router!";
export const TERMINAL_PROMPT =
	"How can you check that PC-1 is connected to PC-2?";
export const TERMINAL_INTRO_ENTRIES: TerminalEntry[] = [
	{
		id: "intro-dhcp-1",
		type: "output",
		content: "Available commands:",
		timestamp: 0,
	},
	{
		id: "intro-dhcp-3",
		type: "output",
		content: "- ping <pc-2-ip>",
		timestamp: 1,
	},
];

// Initial inventory items available for the networking question
export const INVENTORY_ITEMS: Item[] = [
	{
		id: "pc-1",
		type: "pc",
		name: "PC-1",
		allowedPlaces: ["inventory", "pc-1-board"],
		icon: { icon: "twemoji:laptop-computer" },
	},
	{
		id: "pc-2",
		type: "pc",
		name: "PC-2",
		allowedPlaces: ["inventory", "pc-2-board"],
		icon: { icon: "twemoji:laptop-computer" },
	},
	{
		id: "router-1",
		type: "router",
		name: "Router",
		allowedPlaces: ["inventory", "router-board"],
		icon: { icon: "streamline-flex-color:router-wifi-network" },
	},
	{
		id: "cable-1",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "connector-left", "connector-right"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
	},
	{
		id: "cable-2",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "connector-left", "connector-right"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
	},
];

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
	{
		id: "default",
		title: "Inventory",
		visible: true,
		items: INVENTORY_ITEMS,
	},
];

export const DHCP_CANVAS_IDS = {
	pc1: "pc-1-board",
	conn1: "connector-left",
	router: "router-board",
	conn2: "connector-right",
	pc2: "pc-2-board",
} as const;

export const CANVAS_ORDER = [
	DHCP_CANVAS_IDS.pc1,
	DHCP_CANVAS_IDS.conn1,
	DHCP_CANVAS_IDS.router,
	DHCP_CANVAS_IDS.conn2,
	DHCP_CANVAS_IDS.pc2,
];

export const CANVAS_CONFIGS: Record<string, PuzzleConfig> = {
	[DHCP_CANVAS_IDS.pc1]: {
		id: "dhcp-pc-1",
		title: "PC-1",
		puzzleId: DHCP_CANVAS_IDS.pc1,
		size: { base: [1, 1] },
		maxItems: 1,
	},
	[DHCP_CANVAS_IDS.conn1]: {
		id: "dhcp-connector-left",
		title: "Connector",
		puzzleId: DHCP_CANVAS_IDS.conn1,
		size: { base: [1, 1] },
		maxItems: 1,
	},
	[DHCP_CANVAS_IDS.router]: {
		id: "dhcp-router",
		title: "Router",
		puzzleId: DHCP_CANVAS_IDS.router,
		size: { base: [1, 1] },
		maxItems: 1,
	},
	[DHCP_CANVAS_IDS.conn2]: {
		id: "dhcp-connector-right",
		title: "Connector",
		puzzleId: DHCP_CANVAS_IDS.conn2,
		size: { base: [1, 1] },
		maxItems: 1,
	},
	[DHCP_CANVAS_IDS.pc2]: {
		id: "dhcp-pc-2",
		title: "PC-2",
		puzzleId: DHCP_CANVAS_IDS.pc2,
		size: { base: [1, 1] },
		maxItems: 1,
	},
};

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];
