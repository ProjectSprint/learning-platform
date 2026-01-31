// Configuration constants for the internet gateway question
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

export const QUESTION_ID = "internet-gateway";
export const QUESTION_TITLE = "🌐 Connect to the Internet!";
export const QUESTION_DESCRIPTION =
	"Now you can setup a router, but you can't reach Google yet. Connect to your ISP and configure the router to access the internet!";
export const TERMINAL_PROMPT =
	"Your network is configured! Can you verify that you can reach Google?";
export const GOOGLE_IP = "142.250.80.46";
export const TERMINAL_INTRO_ENTRIES: TerminalEntry[] = [
	{
		id: "intro-internet-1",
		type: "output",
		content: "Available commands:",
		timestamp: 0,
	},
	{
		id: "intro-internet-2",
		type: "output",
		content: "- ifconfig",
		timestamp: 1,
	},
	{
		id: "intro-internet-3",
		type: "output",
		content: "- nslookup google.com",
		timestamp: 2,
	},
	{
		id: "intro-internet-4",
		type: "output",
		content: "- curl google.com",
		timestamp: 3,
	},
	{
		id: "intro-internet-5",
		type: "output",
		content: `- curl ${GOOGLE_IP}`,
		timestamp: 4,
	},
];

const TOOLTIP_CABLE = {
	content: "Ethernet cable connects your PC to the router's LAN port",
	seeMoreHref: "https://www.google.com/search?q=what+is+ethernet+cable",
};

const TOOLTIP_ROUTER_LAN = {
	content:
		"The LAN (Local Area Network) side of the router. Assigns private IP addresses to devices via DHCP and configures which DNS server to use.",
	seeMoreHref: "https://www.google.com/search?q=what+is+router+LAN",
};

const TOOLTIP_ROUTER_NAT = {
	content:
		"NAT (Network Address Translation) translates private IP addresses to the public IP address so multiple devices can share one internet connection.",
	seeMoreHref:
		"https://www.google.com/search?q=what+is+NAT+network+address+translation",
};

const TOOLTIP_ROUTER_WAN = {
	content:
		"The WAN (Wide Area Network) side of the router. Connects to your ISP using PPPoE authentication to get a public IP address.",
	seeMoreHref: "https://www.google.com/search?q=what+is+router+WAN+PPPoE",
};

const TOOLTIP_FIBER = {
	content: "Fiber optic cable provides high-speed connection to your ISP",
	seeMoreHref: "https://www.google.com/search?q=what+is+fiber+optic+internet",
};

const TOOLTIP_IGW = {
	content: "Internet Gateway (modem) connects your home to the ISP's network",
	seeMoreHref: "https://www.google.com/search?q=what+is+internet+gateway",
};

const TOOLTIP_DNS = {
	content: "DNS Server translates domain names (google.com) to IP addresses",
	seeMoreHref: "https://www.google.com/search?q=what+is+DNS",
};

const TOOLTIP_GOOGLE = {
	content: "Google's server - your destination!",
	seeMoreHref: "https://www.google.com/search?q=how+do+websites+work",
};

// Canvas keys for allowedPlaces
export type InternetCanvasKey =
	| "local"
	| "conn-1"
	| "router"
	| "conn-2"
	| "igw"
	| "dns"
	| "google";

// Initial inventory items available for the internet gateway question
export const INVENTORY_ITEMS: Item[] = [
	{
		id: "cable-1",
		type: "cable",
		name: "Ethernet Cable",
		allowedPlaces: ["inventory", "conn-1"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
		tooltip: TOOLTIP_CABLE,
	},
	{
		id: "fiber-1",
		type: "fiber",
		name: "Fiber Cable",
		allowedPlaces: ["inventory", "conn-2"],
		icon: { icon: "mdi:fiber-smart-record", color: "#f97316" },
		tooltip: TOOLTIP_FIBER,
	},
	{
		id: "pc-1",
		type: "pc",
		name: "PC",
		allowedPlaces: ["inventory", "local"],
		icon: { icon: "twemoji:laptop-computer" },
	},
	{
		id: "router-lan-1",
		type: "router-lan",
		name: "Router (LAN)",
		allowedPlaces: ["inventory", "router"],
		icon: { icon: "mdi:lan" },
		tooltip: TOOLTIP_ROUTER_LAN,
	},
	{
		id: "router-nat-1",
		type: "router-nat",
		name: "Router (NAT)",
		allowedPlaces: ["inventory", "router"],
		icon: { icon: "mdi:swap-horizontal" },
		tooltip: TOOLTIP_ROUTER_NAT,
	},
	{
		id: "router-wan-1",
		type: "router-wan",
		name: "Router (WAN)",
		allowedPlaces: ["inventory", "router"],
		icon: { icon: "mdi:wan" },
		tooltip: TOOLTIP_ROUTER_WAN,
	},
	{
		id: "igw-1",
		type: "igw",
		name: "Internet Gateway",
		allowedPlaces: ["inventory", "igw"],
		icon: { icon: "mdi:server-network" },
		category: "bridge",
		tooltip: TOOLTIP_IGW,
	},
	{
		id: "dns-1",
		type: "dns",
		name: "DNS Server",
		allowedPlaces: ["inventory", "dns"],
		icon: { icon: "mdi:dns" },
		category: "address",
		tooltip: TOOLTIP_DNS,
	},
	{
		id: "google-1",
		type: "google",
		name: "Google",
		allowedPlaces: ["inventory", "google"],
		icon: { icon: "mdi:google" },
		category: "server",
		tooltip: TOOLTIP_GOOGLE,
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

export const CANVAS_ORDER: InternetCanvasKey[] = [
	"local",
	"conn-1",
	"router",
	"conn-2",
	"igw",
	"dns",
	"google",
];

export const CANVAS_CONFIGS: Record<InternetCanvasKey, GridCanvasConfig> = {
	local: createGridCanvasConfig({
		id: "local",
		name: "Client",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	"conn-1": createGridCanvasConfig({
		id: "conn-1",
		name: "Connector",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	router: createGridCanvasConfig({
		id: "router",
		name: "Router",
		size: { base: [3, 1] },
		maxCapacity: 3,
	}),
	"conn-2": createGridCanvasConfig({
		id: "conn-2",
		name: "Connector",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	igw: createGridCanvasConfig({
		id: "igw",
		name: "Internet Gateway",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	dns: createGridCanvasConfig({
		id: "dns",
		name: "DNS Server",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	google: createGridCanvasConfig({
		id: "google",
		name: "Google Server",
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

// Public DNS servers for validation
export const PUBLIC_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"];

// Valid PPPoE credentials for ISP authentication
export const VALID_PPPOE_CREDENTIALS = {
	username: "user@telkom.net",
	password: "telkom123",
} as const;

// Google's IP address for curl verification
