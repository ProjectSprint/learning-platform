import type { SpaceItemLocation } from "@/components/game/game-provider";

/**
 * Get status message for a placed item
 */
export const getSslStatusMessage = (
	placedItem: SpaceItemLocation,
	spaceId?: string,
): string | null => {
	const { type, status, data } = placedItem;

	// Browser status
	if (type === "browser") {
		const domain =
			typeof data?.domain === "string" ? data.domain : "example.com";
		if (status === "error") {
			return `can't connect to ${domain}`;
		}
		if (status === "warning") {
			return `${domain} is insecure`;
		}
		if (status === "success") {
			return `${domain} is secured`;
		}
		return null;
	}

	// Webserver 80 status
	if (type === "webserver-80") {
		if (status === "error") {
			return "not configured";
		}
		if (status === "warning") {
			return "serving HTTP";
		}
		if (status === "success") {
			// Check if redirect is in the same space
			if (spaceId === "port-80") {
				return "redirecting to HTTPS";
			}
			return "serving HTTP";
		}
		return null;
	}

	// Webserver 443 status
	if (type === "webserver-443") {
		if (status === "error") {
			return "not configured";
		}
		if (status === "warning") {
			const sslMissing =
				typeof data?.sslMissing === "string" ? data.sslMissing : null;
			if (sslMissing === "private-key") {
				return "missing private key";
			}
			if (sslMissing === "certificate") {
				return "missing certificate";
			}
			return "missing SSL";
		}
		if (status === "success") {
			return "🔒 serving HTTPS";
		}
		return null;
	}

	// Domain status
	if (type === "domain") {
		const domain =
			typeof data?.domain === "string" ? data.domain : "example.com";
		if (spaceId === "letsencrypt") {
			if (status === "error") {
				return "Needs Issuing";
			}
			if (status === "success") {
				return "Configured";
			}
		}
		return domain;
	}

	return null;
};

/**
 * Get full status description for a placed item (for modals)
 */
export const getFullStatusDescription = (
	placedItem: SpaceItemLocation,
): string => {
	const { type, status, data } = placedItem;

	switch (type) {
		case "browser":
			if (status === "error") return "Can't connect - No webserver configured";
			if (status === "warning") {
				const domain =
					typeof data?.domain === "string" ? data.domain : "example.com";
				return `⚠️ Not Secure - http://${domain}\nYour connection is not private`;
			}
			if (status === "success") {
				const domain =
					typeof data?.domain === "string" ? data.domain : "example.com";
				return `🔒 Secure - https://${domain}\nCertificate: ${domain}\nIssued by: Let's Encrypt`;
			}
			return "Not connected";

		case "webserver-80":
			if (status === "error")
				return "Not configured - Add webserver, domain, and content";
			if (status === "warning")
				return "Serving HTTP - Unencrypted connection on port 80";
			if (status === "success")
				return "Redirecting to HTTPS - Sending visitors to port 443";
			return "Not configured";

		case "webserver-443":
			if (status === "error")
				return "Not configured - Add components for HTTPS";
			if (status === "warning") {
				const sslMissing =
					typeof data?.sslMissing === "string" ? data.sslMissing : null;
				if (sslMissing === "private-key") {
					return "Missing Private Key - Install private key for HTTPS";
				}
				if (sslMissing === "certificate") {
					return "Missing Certificate - Install domain certificate for HTTPS";
				}
				return "Missing SSL - Install private key and certificate";
			}
			if (status === "success")
				return "🔒 Serving HTTPS - Secure connection established";
			return "Not configured";

		case "domain":
			if (status === "error") {
				return "Needs Issuing - Request a certificate from Let's Encrypt";
			}
			if (status === "success") {
				return "Configured - Certificate issued and ready for HTTPS";
			}
			return "Domain";

		case "private-key":
			return "🔑 Private Key - Secret key for decrypting HTTPS traffic. Keep this safe!";

		case "certificate": {
			const certDomain =
				typeof data?.certificateDomain === "string"
					? data.certificateDomain
					: "example.com";
			return `📜 Domain Certificate for ${certDomain}\nIssued by: Let's Encrypt`;
		}

		case "redirect-to-https":
			return "↪️ HTTP→HTTPS Redirect\nAutomatically sends HTTP visitors to HTTPS";

		default:
			return "";
	}
};
