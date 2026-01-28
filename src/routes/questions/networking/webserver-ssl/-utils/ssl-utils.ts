// Utility functions for the webserver-ssl question
// Domain-specific helper functions for game logic

import type { CanvasState } from "@/components/game/game-provider";
import { DEFAULT_DOMAIN } from "./constants";

/**
 * Check if Port 80 canvas is complete
 * Requires: webserver-80 + domain + index-html
 */
export const isPort80Complete = (canvas: CanvasState | undefined): boolean => {
	if (!canvas) return false;
	const types = canvas.placedItems.map((item) => item.type);
	const hasContent =
		types.includes("index-html") || types.includes("redirect-to-https");
	return types.includes("webserver-80") && types.includes("domain") && hasContent;
};

/**
 * Check if Port 443 canvas is complete
 * Requires: webserver-443 + domain + index.html + private-key + certificate
 */
export const isPort443Complete = (canvas: CanvasState | undefined): boolean => {
	if (!canvas) return false;
	const types = canvas.placedItems.map((item) => item.type);
	return (
		types.includes("webserver-443") &&
		types.includes("domain") &&
		types.includes("index-html") &&
		types.includes("private-key") &&
		types.includes("certificate")
	);
};

/**
 * Check if Port 80 has redirect configured
 * Requires: webserver-80 + domain + redirect-to-https
 */
export const isPort80RedirectConfigured = (canvas: CanvasState | undefined): boolean => {
	if (!canvas) return false;
	const types = canvas.placedItems.map((item) => item.type);
	return (
		types.includes("webserver-80") &&
		types.includes("domain") &&
		types.includes("redirect-to-https")
	);
};

/**
 * Determine browser connection status based on canvas states
 */
export const getBrowserStatus = (
	browserCanvas: CanvasState | undefined,
	port80Canvas: CanvasState | undefined,
	port443Canvas: CanvasState | undefined,
): "error" | "warning" | "success" => {
	if (!browserCanvas || browserCanvas.placedItems.length === 0) {
		return "error";
	}

	// Check if HTTPS is fully configured
	if (isPort443Complete(port443Canvas) && isPort80RedirectConfigured(port80Canvas)) {
		return "success";
	}

	// Check if HTTP is configured (will show warning)
	if (isPort80Complete(port80Canvas)) {
		return "warning";
	}

	return "error";
};

/**
 * Get the URL the browser is connecting to
 */
export const getBrowserUrl = (
	browserCanvas: CanvasState | undefined,
	port80Canvas: CanvasState | undefined,
	port443Canvas: CanvasState | undefined,
): string => {
	if (!browserCanvas || browserCanvas.placedItems.length === 0) {
		return "Not connected";
	}

	const status = getBrowserStatus(browserCanvas, port80Canvas, port443Canvas);
	if (status === "success") {
		return `https://${getDomainFromCanvas(port443Canvas) || DEFAULT_DOMAIN}`;
	}
	if (status === "warning") {
		return `http://${getDomainFromCanvas(port80Canvas) || DEFAULT_DOMAIN}`;
	}
	return "Not connected";
};

/**
 * Get domain name from canvas
 */
export const getDomainFromCanvas = (canvas: CanvasState | undefined): string | undefined => {
	if (!canvas) return undefined;
	const domainItem = canvas.placedItems.find((item) => item.type === "domain");
	if (domainItem && typeof domainItem.data?.domain === "string") {
		return domainItem.data.domain;
	}
	return DEFAULT_DOMAIN;
};

/**
 * Get certificate domain from letsencrypt canvas (domain-ssl item)
 */
export const getCertificateDomain = (canvas: CanvasState | undefined): string | undefined => {
	if (!canvas) return undefined;
	// The certificate domain is stored on the SSL domain item in the letsencrypt canvas
	const domainItem = canvas.placedItems.find((item) => item.type === "domain-ssl");
	if (domainItem && typeof domainItem.data?.certificateDomain === "string") {
		return domainItem.data.certificateDomain;
	}
	return undefined;
};

/**
 * Validate domain format
 */
export const validateDomain = (domain: string): boolean => {
	const trimmed = domain.trim();
	const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
	return domainRegex.test(trimmed);
};

/**
 * Check if an item type is allowed in a canvas
 */
export const isItemTypeAllowed = (itemType: string, canvasId: string): boolean => {
	const errors: Record<string, string> = {
		"private-key|port-80": "private-key",
		"certificate|port-80": "certificate",
		"redirect-to-https|port-443": "redirect-to-https",
		"webserver-80|port-443": "webserver-80",
		"webserver-443|port-80": "webserver-443",
	};

	return Object.entries(errors).every(([key]) => !key.startsWith(`${itemType}|${canvasId}`));
};
