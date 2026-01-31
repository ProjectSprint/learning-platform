// Configuration constants for the networking question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type {
	InventoryGroupConfig,
	Item,
	TerminalEntry,
} from "@/components/game/game-provider";
import {
	createGridCanvasConfig,
	createPuzzleConfigs,
	type GridCanvasConfig,
} from "../../-utils/grid-space";

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

const TOOLTIP_CABLE = {
	content:
		"Ethernet cables connect devices in a network, enabling data transfer between computers and routers.",
	seeMoreHref: "https://www.google.com/search?q=what+is+ethernet+cable",
};

const TOOLTIP_ROUTER = {
	content:
		"A router connects multiple devices in a network and directs traffic between them.",
	seeMoreHref: "https://www.google.com/search?q=what+is+a+router",
};

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
		tooltip: TOOLTIP_ROUTER,
	},
	{
		id: "cable-1",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "connector-left", "connector-right"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		tooltip: TOOLTIP_CABLE,
	},
	{
		id: "cable-2",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "connector-left", "connector-right"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		tooltip: TOOLTIP_CABLE,
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

export const CANVAS_CONFIGS: Record<string, GridCanvasConfig> = {
	[DHCP_CANVAS_IDS.pc1]: createGridCanvasConfig({
		id: DHCP_CANVAS_IDS.pc1,
		name: "PC-1",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	[DHCP_CANVAS_IDS.conn1]: createGridCanvasConfig({
		id: DHCP_CANVAS_IDS.conn1,
		name: "Connector",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	[DHCP_CANVAS_IDS.router]: createGridCanvasConfig({
		id: DHCP_CANVAS_IDS.router,
		name: "Router",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	[DHCP_CANVAS_IDS.conn2]: createGridCanvasConfig({
		id: DHCP_CANVAS_IDS.conn2,
		name: "Connector",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	[DHCP_CANVAS_IDS.pc2]: createGridCanvasConfig({
		id: DHCP_CANVAS_IDS.pc2,
		name: "PC-2",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
};

export const CANVAS_PUZZLES = createPuzzleConfigs(CANVAS_CONFIGS);

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];
