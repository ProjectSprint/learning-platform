import type { PlacedItem } from "@/components/game/game-provider";

export const getInternetItemLabel = (itemType: string): string => {
	switch (itemType) {
		case "pc":
			return "PC";
		case "cable":
			return "Ethernet Cable";
		case "router-lan":
			return "Router (LAN)";
		case "router-nat":
			return "Router (NAT)";
		case "router-wan":
			return "Router (WAN)";
		case "fiber":
			return "Fiber Cable";
		case "igw":
			return "Internet Gateway";
		case "internet":
			return "Internet";
		case "dns":
			return "DNS Server";
		case "google":
			return "Google";
		default:
			return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}
};

export const getInternetStatusMessage = (
	placedItem: PlacedItem,
): string | null => {
	const { type, status, data } = placedItem;

	switch (type) {
		case "pc": {
			const ip = typeof data?.ip === "string" ? data.ip : null;
			if (status === "error") {
				return "no ip";
			}
			if (status === "warning" && ip) {
				return ip;
			}
			if (status === "success" && ip) {
				return `${ip} → internet`;
			}
			return null;
		}

		case "router-lan": {
			if (status === "error") {
				return "not configured";
			}
			if (status === "warning") {
				return "no DNS";
			}
			if (status === "success") {
				return "configured";
			}
			return null;
		}

		case "router-nat": {
			if (status === "error") {
				return "disabled";
			}
			if (status === "success") {
				return "enabled";
			}
			return null;
		}

		case "router-wan": {
			const publicIp =
				typeof data?.publicIp === "string" ? data.publicIp : null;
			if (status === "error") {
				return "not configured";
			}
			if (status === "warning") {
				return "no credentials";
			}
			if (status === "success") {
				return publicIp ? `connected ${publicIp}` : "connected";
			}
			return null;
		}

		case "igw": {
			if (status === "warning") {
				return "waiting for auth";
			}
			if (status === "success") {
				return "connected";
			}
			return null;
		}

		case "internet": {
			if (status === "warning") {
				return "no route";
			}
			if (status === "success") {
				return "online";
			}
			return null;
		}

		case "dns": {
			if (status === "error") {
				return "unreachable";
			}
			if (status === "success") {
				return "resolving";
			}
			return null;
		}

		case "google": {
			if (status === "error") {
				return "can't resolve";
			}
			if (status === "warning") {
				return "no route";
			}
			if (status === "success") {
				return "142.250.80.46";
			}
			return null;
		}

		case "cable":
		case "fiber":
			return null;

		default:
			return null;
	}
};
