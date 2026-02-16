// Configuration constants for the networking question
// Contains all static configuration like inventory items, space setup, and question metadata

import type {
	InventoryGroupConfig,
	Item,
	TerminalEntry,
} from "@/components/game/engine/game-provider";
import type {
	GridSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/engine/types";

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

export const DHCP_SPACE_IDS = {
	pc1: "pc-1-board",
	conn1: "connector-left",
	router: "router-board",
	conn2: "connector-right",
	pc2: "pc-2-board",
} as const;

export type DhcpSpaceKey = (typeof DHCP_SPACE_IDS)[keyof typeof DHCP_SPACE_IDS];

export const SPACE_CONFIGS: Record<DhcpSpaceKey, GridSpaceConfig> = {
	[DHCP_SPACE_IDS.pc1]: {
		id: DHCP_SPACE_IDS.pc1,
		name: "PC-1",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
	[DHCP_SPACE_IDS.conn1]: {
		id: DHCP_SPACE_IDS.conn1,
		name: "Connector",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
	[DHCP_SPACE_IDS.router]: {
		id: DHCP_SPACE_IDS.router,
		name: "Router",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
	[DHCP_SPACE_IDS.conn2]: {
		id: DHCP_SPACE_IDS.conn2,
		name: "Connector",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
	[DHCP_SPACE_IDS.pc2]: {
		id: DHCP_SPACE_IDS.pc2,
		name: "PC-2",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
};

export const INVENTORY_POOL_CONFIG: PoolSpaceConfig = {
	id: "inventory",
	name: "Items",
	metadata: { visible: true },
};

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];
