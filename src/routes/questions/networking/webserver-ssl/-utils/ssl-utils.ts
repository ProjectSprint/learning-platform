// Utility functions for the webserver-ssl question
// Domain-specific helper functions for game logic

import type { SpaceState } from "@/components/game/engine/game-provider";
import { DEFAULT_DOMAIN } from "./constants";

/**
 * Check if Port 80 space is complete
 * Requires: webserver-80 + domain + index-html
 */
export const isPort80Complete = (space: SpaceState | undefined): boolean => {
	if (!space) return false;
	const types = space.placedItems.map((item) => item.type);
	const hasContent =
		types.includes("index-html") || types.includes("redirect-to-https");
	return (
		types.includes("webserver-80") && types.includes("domain") && hasContent
	);
};

/**
 * Check if Port 443 space is complete
 * Requires: webserver-443 + domain + index.html + private-key + certificate
 */
export const isPort443Complete = (space: SpaceState | undefined): boolean => {
	if (!space) return false;
	const types = space.placedItems.map((item) => item.type);
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
export const isPort80RedirectConfigured = (
	space: SpaceState | undefined,
): boolean => {
	if (!space) return false;
	const types = space.placedItems.map((item) => item.type);
	return (
		types.includes("webserver-80") &&
		types.includes("domain") &&
		types.includes("redirect-to-https")
	);
};

/**
 * Determine browser connection status based on space states
 */
export const getBrowserStatus = (
	browserSpace: SpaceState | undefined,
	port80Space: SpaceState | undefined,
	port443Space: SpaceState | undefined,
): "error" | "warning" | "success" => {
	if (!browserSpace || browserSpace.placedItems.length === 0) {
		return "error";
	}

	// Check if HTTPS is fully configured
	if (
		isPort443Complete(port443Space) &&
		isPort80RedirectConfigured(port80Space)
	) {
		return "success";
	}

	// Check if HTTP is configured (will show warning)
	if (isPort80Complete(port80Space)) {
		return "warning";
	}

	return "error";
};

/**
 * Get the URL the browser is connecting to
 */
export const getBrowserUrl = (
	browserSpace: SpaceState | undefined,
	port80Space: SpaceState | undefined,
	port443Space: SpaceState | undefined,
): string => {
	if (!browserSpace || browserSpace.placedItems.length === 0) {
		return "Not connected";
	}

	const status = getBrowserStatus(browserSpace, port80Space, port443Space);
	if (status === "success") {
		return `https://${getDomainFromSpace(port443Space) || DEFAULT_DOMAIN}`;
	}
	if (status === "warning") {
		return `http://${getDomainFromSpace(port80Space) || DEFAULT_DOMAIN}`;
	}
	return "Not connected";
};

/**
 * Get domain name from space
 */
export const getDomainFromSpace = (
	space: SpaceState | undefined,
): string | undefined => {
	if (!space) return undefined;
	const domainItem = space.placedItems.find((item) => item.type === "domain");
	if (domainItem && typeof domainItem.data?.domain === "string") {
		return domainItem.data.domain;
	}
	return DEFAULT_DOMAIN;
};

/**
 * Get certificate domain from letsencrypt space (domain item)
 */
export const getCertificateDomain = (
	space: SpaceState | undefined,
): string | undefined => {
	if (!space) return undefined;
	// The certificate domain is stored on the domain item in the letsencrypt space
	const domainItem = space.placedItems.find((item) => item.type === "domain");
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
 * Check if an item type is allowed in a space
 */
export const isItemTypeAllowed = (
	itemType: string,
	spaceId: string,
): boolean => {
	const errors: Record<string, string> = {
		"private-key|port-80": "private-key",
		"certificate|port-80": "certificate",
		"redirect-to-https|port-443": "redirect-to-https",
		"webserver-80|port-443": "webserver-80",
		"webserver-443|port-80": "webserver-443",
	};

	return Object.entries(errors).every(
		([key]) => !key.startsWith(`${itemType}|${spaceId}`),
	);
};
