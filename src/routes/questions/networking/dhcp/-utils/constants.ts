// Configuration constants for the networking question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type {
	CanvasConfig,
	InventoryGroupConfig,
	InventoryItem,
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
export const INVENTORY_ITEMS: InventoryItem[] = [
	{
		id: "pc-1",
		type: "pc",
		name: "PC-1",
		allowedPlaces: ["inventory", "networking-canvas"],
		icon: { icon: "twemoji:laptop-computer" },
		behavior: "connectable",
	},
	{
		id: "pc-2",
		type: "pc",
		name: "PC-2",
		allowedPlaces: ["inventory", "networking-canvas"],
		icon: { icon: "twemoji:laptop-computer" },
		behavior: "connectable",
	},
	{
		id: "router-1",
		type: "router",
		name: "Router",
		allowedPlaces: ["inventory", "networking-canvas"],
		icon: { icon: "streamline-flex-color:router-wifi-network" },
		behavior: "connectable",
	},
	{
		id: "cable-1",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "networking-canvas"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		behavior: "connectable",
	},
	{
		id: "cable-2",
		type: "cable",
		name: "Cable",
		allowedPlaces: ["inventory", "networking-canvas"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		behavior: "connectable",
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

// Canvas configuration for the networking question
export const CANVAS_CONFIG: CanvasConfig = {
	id: "networking-canvas",
	columns: 5,
	rows: 1,
	maxItems: 6,
};

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];
