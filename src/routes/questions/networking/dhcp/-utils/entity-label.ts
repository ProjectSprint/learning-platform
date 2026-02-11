/**
 * Get the display label for a networking item type
 */
export const getNetworkingItemLabel = (itemType: string): string => {
	switch (itemType) {
		case "pc":
			return "PC";
		case "router":
			return "Router";
		case "cable":
			return "Cable";
		default:
			return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}
};
