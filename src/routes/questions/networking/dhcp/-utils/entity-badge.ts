import type { SpaceItemLocation } from "@/components/game/game-provider";

/**
 * Get the status message for a networking item based on its state
 */
export const getNetworkingStatusMessage = (
	placedItem: SpaceItemLocation,
): string | null => {
	if (placedItem.type === "router") {
		if (placedItem.status === "warning" || placedItem.status === "error") {
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

	// Cable items have no status messages (per blueprint)
	if (placedItem.type === "cable") {
		return null;
	}

	return null;
};
