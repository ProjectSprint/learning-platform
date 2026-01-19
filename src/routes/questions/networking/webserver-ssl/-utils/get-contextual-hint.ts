// Contextual hints for the webserver-ssl question
// Hints change based on game progress to guide the user

import type { CanvasState } from "@/components/game/game-provider";
import { isPort443Complete, isPort80Complete, isPort80RedirectConfigured } from "./ssl-utils";

interface SslGameState {
	browserCanvas: CanvasState | undefined;
	port80Canvas: CanvasState | undefined;
	letsencryptCanvas: CanvasState | undefined;
	port443Canvas: CanvasState | undefined;
	allPlacedItems: Array<{ type: string; id: string }>;
	httpReady: boolean;
	httpsReady: boolean;
	certificateIssued: boolean;
	browserStatus: "error" | "warning" | "success";
	letsencryptModalOpen: boolean;
}

/**
 * Get contextual hint based on current game state
 */
export const getContextualHint = (state: SslGameState): string => {
	const {
		browserCanvas,
		port80Canvas,
		letsencryptCanvas,
		port443Canvas,
		certificateIssued,
		browserStatus,
		letsencryptModalOpen,
	} = state;

	// Get item counts for each canvas
	const browserItems = browserCanvas?.placedItems.length ?? 0;
	const port80Items = port80Canvas?.placedItems.map((i) => i.type) ?? [];
	const letsencryptItems = letsencryptCanvas?.placedItems.map((i) => i.type) ?? [];
	const port443Items = port443Canvas?.placedItems.map((i) => i.type) ?? [];

	// Determine if browser is clickable (port-80 has content)
	const port80Complete = isPort80Complete(port80Canvas);

	// Early game - drag browser
	if (browserItems === 0) {
		return "Drag the Browser to the first canvas";
	}

	// After browser is placed
	if (browserItems > 0 && port80Items.length === 0) {
		return "Now set up your webserver! Drag Webserver (HTTP) to the Port 80 canvas";
	}

	// Webserver placed, need domain
	if (port80Items.includes("webserver-80") && !port80Items.includes("domain")) {
		return "Add your domain to the Port 80 canvas";
	}

	// Domain placed, need index.html
	if (
		port80Items.includes("webserver-80") &&
		port80Items.includes("domain") &&
		!port80Items.includes("index-html") &&
		!port80Items.includes("redirect-to-https")
	) {
		return "Add index.html so your webserver has something to serve";
	}

	// Port 80 is complete
	if (port80Complete && !isPort80RedirectConfigured(port80Canvas)) {
		return "Click the Browser to see your website!";
	}

	// Browser shows not secure - show new canvases
	if (browserStatus === "warning") {
		// Let's Encrypt canvas is visible but empty
		if (letsencryptItems.length === 0) {
			return "⚠️ Your site works but it's not secure! New canvases have appeared...";
		}
		return "Drag the Domain (SSL) to the Let's Encrypt canvas to get a certificate";
	}

	// Domain in letsencrypt but certificate not issued
	if (letsencryptItems.includes("domain-ssl") && !certificateIssued) {
		if (!letsencryptModalOpen) {
			return "Click the Domain (SSL) in the Let's Encrypt canvas to request a certificate";
		}
		return "Enter your domain name (e.g., example.com)";
	}

	// Certificate issued
	if (certificateIssued && port443Items.length === 0) {
		return "🎉 You got a certificate! Drag the Private Key and Domain Certificate to the Port 443 canvas";
	}

	// SSL items available, set up HTTPS
	if (certificateIssued && port443Items.length > 0) {
		if (!port443Items.includes("webserver-443")) {
			return "Set up your HTTPS webserver in the Port 443 canvas";
		}

		const hasPrivateKey = port443Items.includes("private-key");
		const hasCertificate = port443Items.includes("certificate");

		if (!hasPrivateKey && !hasCertificate) {
			return "Add your domain, index.html, private key, and domain certificate to Port 443";
		}

		if (!hasPrivateKey || !hasCertificate) {
			return "Install both the private key AND domain certificate on your HTTPS webserver";
		}

		if (!port443Items.includes("domain")) {
			return "Add your domain and index.html to Port 443";
		}

		if (!port443Items.includes("index-html")) {
			return "Add index.html to Port 443";
		}
	}

	// Port 443 complete - HTTPS is ready
	if (isPort443Complete(port443Canvas) && !isPort80RedirectConfigured(port80Canvas)) {
		return "🔒 HTTPS is ready! But visitors might still go to HTTP...";
	}

	// Redirect available in inventory
	if (isPort443Complete(port443Canvas) && !port80Items.includes("redirect-to-https")) {
		return "Drag the redirect to Port 80 to automatically send visitors to HTTPS";
	}

	// Redirect placed on port 80
	if (isPort80RedirectConfigured(port80Canvas) && isPort443Complete(port443Canvas)) {
		if (browserStatus !== "success") {
			return "🎉 Perfect! Click the Browser to see the secure connection";
		}
		return "🎉 Your website is now secure with HTTPS! Click the browser to see the TLS handshake.";
	}

	return "";
};

/**
 * Get error hint for invalid placement
 */
export const getPlacementErrorHint = (
	itemType: string,
	canvasKey: string,
): string | null => {
	const errors: Record<string, string> = {
		"private-key|port-80": "❌ Private key is for HTTPS only - put it in Port 443",
		"certificate|port-80": "❌ Certificate is for HTTPS only - put it in Port 443",
		"redirect-to-https|port-443": "❌ Redirect only makes sense on port 80",
		"webserver-80|port-443": "❌ This webserver is for HTTP (port 80)",
		"webserver-443|port-80": "❌ This webserver is for HTTPS (port 443)",
	};

	const key = `${itemType}|${canvasKey}`;
	return errors[key] || null;
};
