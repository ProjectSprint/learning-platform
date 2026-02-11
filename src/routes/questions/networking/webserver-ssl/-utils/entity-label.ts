/**
 * Get display label for an item type
 */
export const getSslItemLabel = (itemType: string): string => {
	switch (itemType) {
		case "browser":
			return "Browser";
		case "webserver-80":
			return "Webserver (HTTP)";
		case "webserver-443":
			return "Webserver (HTTPS)";
		case "domain":
			return "Domain";
		case "domain-ssl":
			return "Domain";
		case "index-html":
			return "index.html";
		case "private-key":
			return "🔑 Private Key";
		case "certificate":
			return "📜 Domain Certificate";
		case "redirect-to-https":
			return "Redirect HTTP to HTTPS";
		default:
			return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}
};
