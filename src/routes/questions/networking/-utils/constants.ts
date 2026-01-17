// Configuration constants for the networking question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type { CanvasConfig, InventoryItem } from "@/components/game/game-provider";

export const QUESTION_ID = "networking";
export const TERMINAL_PROMPT = "How can you check that PC-1 is connected to PC-2?";

// Initial inventory items available for the networking question
export const INVENTORY_ITEMS: InventoryItem[] = [
	{ id: "pc-1", type: "pc", name: "PC-1", used: false },
	{ id: "pc-2", type: "pc", name: "PC-2", used: false },
	{ id: "router-1", type: "router", name: "Router", used: false },
	{ id: "cable-1", type: "cable", name: "Cable", used: false },
	{ id: "cable-2", type: "cable", name: "Cable", used: false },
];

// Canvas configuration for the networking question
export const CANVAS_CONFIG: CanvasConfig = {
	id: "networking-canvas",
	columns: 5,
	rows: 1,
	allowedItemTypes: ["pc", "router", "cable"],
	maxItems: 6,
};

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];
