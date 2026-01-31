// Configuration constants for the internet gateway question
// Contains all static configuration like inventory items, canvas setup, and question metadata

import type {
	InventoryGroupConfig,
	InventoryItem,
	PuzzleConfig,
	TerminalEntry,
} from "@/components/game/game-provider";

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
export const INVENTORY_ITEMS: InventoryItem[] = [
	{
		id: "cable-1",
		type: "cable",
		name: "Ethernet Cable",
		allowedPlaces: ["inventory", "conn-1"],
		icon: { icon: "mdi:ethernet-cable", color: "#2596be" },
	},
	{
		id: "fiber-1",
		type: "fiber",
		name: "Fiber Cable",
		allowedPlaces: ["inventory", "conn-2"],
		icon: { icon: "mdi:fiber-smart-record", color: "#f97316" },
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
	},
	{
		id: "router-nat-1",
		type: "router-nat",
		name: "Router (NAT)",
		allowedPlaces: ["inventory", "router"],
		icon: { icon: "mdi:swap-horizontal" },
	},
	{
		id: "router-wan-1",
		type: "router-wan",
		name: "Router (WAN)",
		allowedPlaces: ["inventory", "router"],
		icon: { icon: "mdi:wan" },
	},
	{
		id: "igw-1",
		type: "igw",
		name: "Internet Gateway",
		allowedPlaces: ["inventory", "igw"],
		icon: { icon: "mdi:server-network" },
		category: "bridge",
	},
	{
		id: "dns-1",
		type: "dns",
		name: "DNS Server",
		allowedPlaces: ["inventory", "dns"],
		icon: { icon: "mdi:dns" },
		category: "address",
	},
	{
		id: "google-1",
		type: "google",
		name: "Google",
		allowedPlaces: ["inventory", "google"],
		icon: { icon: "mdi:google" },
		category: "server",
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

export const CANVAS_CONFIGS: Record<InternetCanvasKey, PuzzleConfig> = {
	local: {
		id: "internet-local",
		title: "Client",
		puzzleId: "client",
		size: { base: [1, 1] },
		maxItems: 1,
	},
	"conn-1": {
		id: "internet-conn-1",
		title: "Connector",
		puzzleId: "conn-1",
		size: { base: [1, 1] },
		maxItems: 1,
	},
	router: {
		id: "internet-router",
		title: "Router",
		puzzleId: "router",
		size: { base: [3, 1] },
		maxItems: 3,
	},
	"conn-2": {
		id: "internet-conn-2",
		title: "Connector",
		puzzleId: "conn-2",
		size: { base: [1, 1] },
		maxItems: 1,
	},
	igw: {
		id: "internet-igw",
		title: "Internet Gateway",
		puzzleId: "igw",
		size: { base: [1, 1] },
		maxItems: 1,
	},
	dns: {
		id: "internet-dns",
		title: "DNS Server",
		puzzleId: "dns",
		size: { base: [1, 1] },
		maxItems: 1,
	},
	google: {
		id: "internet-google",
		title: "Google Server",
		puzzleId: "google",
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

// Public DNS servers for validation
export const PUBLIC_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"];

// Valid PPPoE credentials for ISP authentication
export const VALID_PPPOE_CREDENTIALS = {
	username: "user@telkom.net",
	password: "telkom123",
} as const;

// Google's IP address for curl verification
