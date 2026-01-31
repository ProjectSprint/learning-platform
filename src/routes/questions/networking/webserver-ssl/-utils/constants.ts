// Constants for the webserver-ssl question
// Contains all static configuration: items, canvases, inventory groups

import type { Item, TerminalEntry } from "@/components/game/game-provider";
import {
	createGridCanvasConfig,
	createPuzzleConfigs,
	type GridCanvasConfig,
} from "../../-utils/grid-space";

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

export const CANVAS_CONFIGS: Record<WebSslCanvasKey, GridCanvasConfig> = {
	browser: createGridCanvasConfig({
		id: "browser",
		name: "Browser",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	"port-80": createGridCanvasConfig({
		id: "port-80",
		name: "HTTP Webserver",
		size: { base: [3, 1] },
		maxCapacity: 3,
	}),
	letsencrypt: createGridCanvasConfig({
		id: "letsencrypt",
		name: "Let's Encrypt",
		size: { base: [1, 1] },
		maxCapacity: 1,
	}),
	"port-443": createGridCanvasConfig({
		id: "port-443",
		name: "HTTPS Webserver",
		size: { base: [5, 1] },
		maxCapacity: 5,
	}),
};

export const CANVAS_PUZZLES = createPuzzleConfigs(CANVAS_CONFIGS);

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

const TOOLTIP_BROWSER = {
	content:
		"A web browser is software that allows users to access websites. You'll use it to test your webserver configuration.",
	seeMoreHref:
		"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_browser",
};

const TOOLTIP_WEBSERVER_80 = {
	content:
		"An HTTP webserver serves unencrypted content on port 80. Anyone on the network can see what's being sent!",
	seeMoreHref:
		"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server",
};

const TOOLTIP_WEBSERVER_443 = {
	content:
		"An HTTPS webserver serves encrypted content on port 443. It requires an SSL certificate and private key.",
	seeMoreHref:
		"https://developer.mozilla.org/en-US/docs/Web/Security/Secure_contexts",
};

const TOOLTIP_DOMAIN = {
	content:
		"A domain name (like example.com) is the address where your website can be found on the internet.",
	seeMoreHref:
		"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_domain_name",
};

const TOOLTIP_INDEX_HTML = {
	content:
		"The index.html file is the default page your webserver serves when someone visits your website.",
	seeMoreHref:
		"https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Document_and_website_structure",
};

const TOOLTIP_PRIVATE_KEY = {
	content:
		"🔑 The private key is SECRET. It stays on your server and is used to decrypt incoming HTTPS traffic. NEVER share it with anyone!",
	seeMoreHref: "https://www.digicert.com/faq/what-is-a-private-key.htm",
};

const TOOLTIP_CERTIFICATE = {
	content:
		"📜 The domain certificate contains your public key and proves your server's identity to browsers. It's PUBLIC - you share it with visitors.",
	seeMoreHref: "https://www.digicert.com/faq/what-is-an-ssl-certificate.htm",
};

const TOOLTIP_REDIRECT = {
	content:
		"↪️ A redirect sends HTTP visitors to HTTPS automatically. This ensures everyone uses the secure connection, even if they type http://",
	seeMoreHref: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections",
};

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
export const BASIC_INVENTORY_ITEMS: Item[] = [
	{
		id: "browser-1",
		type: "browser",
		name: "Browser",
		allowedPlaces: ["inventory", "browser"],
		icon: { icon: "mdi:web" },
		tooltip: TOOLTIP_BROWSER,
	},
	{
		id: "webserver-80-1",
		type: "webserver-80",
		name: "Webserver (HTTP)",
		allowedPlaces: ["inventory", "port-80"],
		icon: { icon: "mdi:server" },
		tooltip: TOOLTIP_WEBSERVER_80,
	},
	{
		id: "domain-1",
		type: "domain",
		name: "Domain",
		allowedPlaces: ["inventory", "port-80", "port-443", "letsencrypt"],
		icon: { icon: "mdi:domain" },
		tooltip: TOOLTIP_DOMAIN,
	},
	{
		id: "index-html-1",
		type: "index-html",
		name: "index.html",
		allowedPlaces: ["inventory", "port-80", "port-443"],
		icon: { icon: "mdi:file-code" },
		tooltip: TOOLTIP_INDEX_HTML,
	},
];

// SSL setup items (shown after HTTP works)
export const SSL_SETUP_INVENTORY_ITEMS: Item[] = [
	{
		id: "webserver-443-1",
		type: "webserver-443",
		name: "Webserver (HTTPS)",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:server-security" },
		tooltip: TOOLTIP_WEBSERVER_443,
	},
	{
		id: "domain-2",
		type: "domain",
		name: "Domain",
		allowedPlaces: ["inventory", "port-80", "port-443", "letsencrypt"],
		icon: { icon: "mdi:domain" },
		tooltip: TOOLTIP_DOMAIN,
	},
	{
		id: "domain-3",
		type: "domain",
		name: "Domain",
		allowedPlaces: ["inventory", "port-80", "port-443", "letsencrypt"],
		icon: { icon: "mdi:domain" },
		tooltip: TOOLTIP_DOMAIN,
	},
	{
		id: "redirect-https-1",
		type: "redirect-to-https",
		name: "Redirect HTTP to HTTPS",
		allowedPlaces: ["inventory", "port-80"],
		icon: { icon: "mdi:arrow-right-bold" },
		tooltip: TOOLTIP_REDIRECT,
	},
];

// SSL certificate items (shown after certificate is issued)
export const SSL_ITEMS_INVENTORY: Item[] = [
	{
		id: "private-key-1",
		type: "private-key",
		name: "Private Key",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:key" },
		tooltip: TOOLTIP_PRIVATE_KEY,
	},
	{
		id: "certificate-1",
		type: "certificate",
		name: "Domain Certificate",
		allowedPlaces: ["inventory", "port-443"],
		icon: { icon: "mdi:card-account-details" },
		tooltip: TOOLTIP_CERTIFICATE,
	},
];

// Redirect item (shown after certificate is issued)
