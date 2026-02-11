import type { SpaceItemLocation } from "@/components/game/game-provider";
import { VALID_PPPOE_CREDENTIALS } from "./constants";

export const getInternetStatusMessage = (
	placedItem: SpaceItemLocation,
): string | null => {
	const { type, status, data } = placedItem;

	switch (type) {
		case "pc": {
			const ip = typeof data?.ip === "string" ? data.ip : null;
			if (status === "error") {
				return "no ip";
			}
			if (status === "warning" && ip) {
				return ip; // "192.168.1.100" (private IP without internet)
			}
			if (status === "warning") {
				return "Can't reach Google";
			}
			if (status === "success" && ip) {
				return `${ip} → internet`; // "192.168.1.100 → internet"
			}
			if (status === "success") {
				return "→ internet"; // Fallback if IP missing
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
			const username =
				typeof data?.username === "string" ? data.username.trim() : "";
			const password =
				typeof data?.password === "string" ? data.password.trim() : "";
			const hasCredentials = username.length > 0 && password.length > 0;
			const isAuthenticated =
				username === VALID_PPPOE_CREDENTIALS.username &&
				password === VALID_PPPOE_CREDENTIALS.password;

			if (!hasCredentials) {
				return "not configured";
			}
			if (!isAuthenticated) {
				return "wrong credentials";
			}
			return "authenticated";
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
