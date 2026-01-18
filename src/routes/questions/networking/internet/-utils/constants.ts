// Configuration constants for the internet gateway question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type {
	CanvasConfig,
	InventoryItem,
} from "@/components/game/game-provider";

export const QUESTION_ID = "internet-gateway";
export const QUESTION_TITLE = "🌐 Connect to the Internet!";
export const QUESTION_DESCRIPTION =
	"Your home network is ready, but you can't reach Google yet. Connect to your ISP and configure the router to access the internet!";
export const TERMINAL_PROMPT =
	"Your network is configured! Can you verify that you can reach Google?";

// Initial inventory items available for the internet gateway question
export const INVENTORY_ITEMS: InventoryItem[] = [
	{ id: "pc-1", type: "pc", name: "PC", used: false },
	{ id: "cable-1", type: "cable", name: "Ethernet Cable", used: false },
	{ id: "router-lan-1", type: "router-lan", name: "Router (LAN)", used: false },
	{ id: "router-nat-1", type: "router-nat", name: "Router (NAT)", used: false },
	{ id: "router-wan-1", type: "router-wan", name: "Router (WAN)", used: false },
	{ id: "fiber-1", type: "fiber", name: "Fiber Cable", used: false },
	{ id: "igw-1", type: "igw", name: "Internet Gateway", used: false },
	{ id: "internet-1", type: "internet", name: "Internet", used: false },
	{ id: "dns-1", type: "dns", name: "DNS Server", used: false },
	{ id: "google-1", type: "google", name: "Google", used: false },
];

// Canvas configuration for the internet gateway question
export const CANVAS_CONFIG: CanvasConfig = {
	id: "internet-gateway-canvas",
	columns: 12,
	rows: 1,
	allowedItemTypes: [
		"pc",
		"cable",
		"router-lan",
		"router-nat",
		"router-wan",
		"fiber",
		"igw",
		"internet",
		"dns",
		"google",
	],
	maxItems: 12,
};

// Private IP address ranges for validation
export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];

// Public DNS servers for validation
export const PUBLIC_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"];

// Valid PPPoE credentials for ISP authentication
export const VALID_PPPOE_CREDENTIALS = {
	username: "user@telkom.net",
	password: "telkom123",
} as const;

// Google's IP address for ping verification
export const GOOGLE_IP = "142.250.80.46";
