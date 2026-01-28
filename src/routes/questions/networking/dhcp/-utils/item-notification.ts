// Item label and status notifications for the networking question
// These are question-specific helpers passed to PlayCanvas

import type { PlacedItem } from "@/components/game/game-provider";

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

/**
 * Get the status message for a networking item based on its state
 */
export const getNetworkingStatusMessage = (
	placedItem: PlacedItem,
): string | null => {
	if (placedItem.type === "router") {
		if (placedItem.status === "error") {
			return "needs configuration";
		}
		if (placedItem.status === "success") {
			return "configured";
		}
		return null;
	}

	if (placedItem.type === "pc") {
		const ip =
			typeof placedItem.data?.ip === "string" ? placedItem.data.ip : null;
		if (ip) {
			return ip;
		}
		if (placedItem.status === "warning") {
			return "no ip";
		}
		return null;
	}

	return null;
};
