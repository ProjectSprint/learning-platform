// Constants for the webserver-ssl question
// Contains all static configuration: items, canvases, inventory groups

import type {
	CanvasConfig,
	InventoryItem,
	TerminalEntry,
} from "@/components/game/game-provider";

export const QUESTION_ID = "webserver-ssl";
export const QUESTION_TITLE = "🔒 Secure Your Website!";
export const QUESTION_DESCRIPTION =
	"Your webserver is running, but browsers warn it's not secure. Set up HTTPS with a certificate from Let's Encrypt!";
export const TERMINAL_PROMPT =
	"Your secure website is ready! Test both HTTP and HTTPS connections.";

export type WebSslCanvasKey =
	| "browser"
	| "port-80"
	| "letsencrypt"
	| "port-443";

export const CANVAS_ORDER: WebSslCanvasKey[] = [
	"browser",
	"port-80",
	"letsencrypt",
	"port-443",
];

export const CANVAS_CONFIGS: Record<WebSslCanvasKey, CanvasConfig> = {
	browser: {
		id: "ssl-browser",
		stateKey: "browser",
		columns: 1,
		rows: 1,
		maxItems: 1,
	},
	"port-80": {
		id: "ssl-port-80",
		stateKey: "port-80",
		columns: 3,
		rows: 1,
		maxItems: 3,
	},
	letsencrypt: {
		id: "ssl-letsencrypt",
		stateKey: "letsencrypt",
		columns: 1,
		rows: 1,
		maxItems: 1,
	},
	"port-443": {
		id: "ssl-port-443",
		stateKey: "port-443",
		columns: 5,
		rows: 1,
		maxItems: 5,
	},
};

export const DEFAULT_DOMAIN = "example.com";
export const DEFAULT_INDEX_HTML = "/var/www/html/index.html";
export const TERMINAL_INTRO_ENTRIES: TerminalEntry[] = [
	{
		id: "intro-ssl-1",
		type: "output",
		content: "Available commands:",
		timestamp: 0,
	},
	{
		id: "intro-ssl-2",
		type: "output",
		content: `- curl http://${DEFAULT_DOMAIN}`,
		timestamp: 1,
	},
	{
		id: "intro-ssl-3",
		type: "output",
		content: `- curl https://${DEFAULT_DOMAIN}`,
		timestamp: 2,
	},
	{
		id: "intro-ssl-4",
		type: "output",
		content: `- curl -v https://${DEFAULT_DOMAIN}`,
		timestamp: 3,
	},
	{
		id: "intro-ssl-5",
		type: "output",
		content: `- curl -I https://${DEFAULT_DOMAIN}`,
		timestamp: 4,
	},
	{
		id: "intro-ssl-6",
		type: "output",
		content: `- openssl s_client https://${DEFAULT_DOMAIN}`,
		timestamp: 5,
	},
	{
		id: "intro-ssl-7",
		type: "output",
		content: "- help",
		timestamp: 6,
	},
	{
		id: "intro-ssl-8",
		type: "output",
		content: "- clear",
		timestamp: 7,
	},
];

export const INDEX_HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <title>Welcome to ${DEFAULT_DOMAIN}</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>Welcome to ${DEFAULT_DOMAIN}</h1>
  <p>This is your website running on a secure HTTPS connection!</p>
</body>
</html>`;

export const TLS_HANDSHAKE_STEPS = [
	{ step: 1, phase: "Client Hello", direction: "Browser → Server" },
	{ step: 2, phase: "Server Hello", direction: "Server → Browser" },
	{ step: 3, phase: "Server Certificate", direction: "Server → Browser" },
	{ step: 4, phase: "Server Hello Done", direction: "Server → Browser" },
	{ step: 5, phase: "Certificate Verify", direction: "Browser (internal)" },
	{ step: 6, phase: "Client Key Exchange", direction: "Browser → Server" },
	{ step: 7, phase: "Change Cipher Spec", direction: "Both" },
	{ step: 8, phase: "Finished", direction: "Both" },
];

// Base items always available
export const BASIC_INVENTORY_ITEMS: InventoryItem[] = [
	{
		id: "browser-1",
		type: "browser",
		name: "Browser",
		allowedPlaces: ["inventory", "browser"],
		icon: { icon: "mdi:web" },
	},
	{
		id: "webserver-80-1",
		type: "webserver-80",
		name: "Webserver (HTTP)",
		allowedPlaces: ["inventory", "port-80"],
		icon: { icon: "mdi:server" },
	},
	{
		id: "domain-1",
		type: "domain",
		name: "Domain",
		allowedPlaces: ["inventory", "port-80"],
		icon: { icon: "mdi:domain" },
	},
	{
		id: "index-html-1",
		type: "index-html",
		name: "index.html",
		allowedPlaces: ["inventory", "port-80", "port-443"],
		icon: { icon: "mdi:file-code" },
	},
];

// SSL setup items (shown after HTTP works)
export const SSL_SETUP_INVENTORY_ITEMS: InventoryItem[] = [
	{
		id: "webserver-443-1",
		type: "webserver-443",
		name: "Webserver (HTTPS)",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:server-security" },
	},
	{
		id: "domain-2",
		type: "domain",
		name: "Domain",
		allowedPlaces: ["inventory", "port-80", "port-443"],
		icon: { icon: "mdi:domain" },
	},
	{
		id: "domain-3",
		type: "domain-ssl",
		name: "Domain (SSL)",
		allowedPlaces: ["inventory", "letsencrypt"],
		icon: { icon: "mdi:domain" },
	},
	{
		id: "redirect-https-1",
		type: "redirect-to-https",
		name: "Redirect",
		allowedPlaces: ["inventory", "port-80"],
		icon: { icon: "mdi:arrow-right-bold" },
	},
];

// SSL certificate items (shown after certificate is issued)
export const SSL_ITEMS_INVENTORY: InventoryItem[] = [
	{
		id: "private-key-1",
		type: "private-key",
		name: "Private Key",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:key" },
	},
	{
		id: "certificate-1",
		type: "certificate",
		name: "Domain Certificate",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:card-account-details" },
	},
];

// Redirect item (shown after certificate is issued)
