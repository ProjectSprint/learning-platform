// Network utility functions for IP validation and network topology analysis
// Contains functions for parsing IP ranges, validating IPs, and building network snapshots

import type { PlacedItem } from "@/components/game/game-provider";
import { PRIVATE_IP_RANGES } from "./constants";

export type DeviceConnection = {
	from: { x: number; y: number };
	to: { x: number; y: number };
};

/**
 * Validates that an IP address string is valid
 * @param ip - IP address string (e.g., "192.168.1.100")
 * @returns true if valid, false otherwise
 */
export const isValidIp = (ip: string): boolean => {
	const parts = ip.split(".");
	if (parts.length !== 4) return false;
	return parts.every((part) => {
		const num = Number.parseInt(part, 10);
		return !Number.isNaN(num) && num >= 0 && num <= 255 && part === String(num);
	});
};

/**
 * Validates that an IP address is in a private range
 * @param ip - IP address string
 * @returns true if private, false otherwise
 */
export const isPrivateIp = (ip: string): boolean => {
	return PRIVATE_IP_RANGES.some((range) => range.test(ip));
};

/**
 * Parses an IP address string to a numeric value for comparison
 * @param ip - IP address string
 * @returns numeric representation of the IP
 */
export const parseIpToNumber = (ip: string): number => {
	const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
	return (
		((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
	);
};

/**
 * Extracts the base IP (first 3 octets) from a start IP address
 * @param startIp - Start IP address string (e.g., "192.168.1.100")
 * @returns Base IP address (e.g., "192.168.1") or null if invalid
 */
export const parseIpRangeBase = (startIp?: string | null): string | null => {
	if (!startIp || !isValidIp(startIp) || !isPrivateIp(startIp)) {
		return null;
	}

	const octets = startIp.split(".").map((value) => Number.parseInt(value, 10));
	return `${octets[0]}.${octets[1]}.${octets[2]}`;
};

/**
 * Calculates the number of addresses in an IP range
 * @param startIp - Start IP address
 * @param endIp - End IP address
 * @returns Number of addresses in the range, or 0 if invalid
 */
export const calculateIpRangeSize = (
	startIp: string,
	endIp: string,
): number => {
	if (!isValidIp(startIp) || !isValidIp(endIp)) {
		return 0;
	}
	const start = parseIpToNumber(startIp);
	const end = parseIpToNumber(endIp);
	if (end < start) {
		return 0;
	}
	return end - start + 1;
};

/**
 * Validates an IP range configuration
 * @param startIp - Start IP address
 * @param endIp - End IP address
 * @returns Object with isValid flag and optional error message
 */
export const validateIpRange = (
	startIp: string,
	endIp: string,
): { isValid: boolean; error?: string } => {
	if (!isValidIp(startIp)) {
		return { isValid: false, error: "Invalid start IP format." };
	}
	if (!isValidIp(endIp)) {
		return { isValid: false, error: "Invalid end IP format." };
	}
	if (!isPrivateIp(startIp)) {
		return { isValid: false, error: "Start IP must be a private IP." };
	}
	if (!isPrivateIp(endIp)) {
		return { isValid: false, error: "End IP must be a private IP." };
	}

	const startNum = parseIpToNumber(startIp);
	const endNum = parseIpToNumber(endIp);

	if (endNum < startNum) {
		return { isValid: false, error: "End IP must be greater than start IP." };
	}

	const rangeSize = endNum - startNum + 1;
	if (rangeSize < 2) {
		return { isValid: false, error: "Range must have at least 2 addresses." };
	}

	return { isValid: true };
};

/**
 * Analyzes the network topology to identify key devices and their connections
 * @param placedItems - All items placed on the canvas
 * @returns Network snapshot containing router, PCs, cables, and connected IDs
 */
export const buildNetworkSnapshot = (
	placedItems: PlacedItem[],
) => {
	// Build a coordinate map for quick lookups
	const byCoord = new Map<string, PlacedItem>();
	placedItems.forEach((item) => {
		byCoord.set(`${item.blockX}-${item.blockY}`, item);
	});

	// Find key network devices
	const router = placedItems.find((item) => item.type === "router");
	const pc1 = placedItems.find((item) => item.id === "pc-1");
	const pc2 = placedItems.find((item) => item.id === "pc-2");
	const cables = placedItems.filter((item) => item.type === "cable");
	const connectedPcIds = new Set<string>();
	const connectedCableIds = new Set<string>();

	// Check each cable to see if it's properly connecting a PC to a router
	cables.forEach((cable) => {
		const left = byCoord.get(`${cable.blockX - 1}-${cable.blockY}`);
		const right = byCoord.get(`${cable.blockX + 1}-${cable.blockY}`);
		const up = byCoord.get(`${cable.blockX}-${cable.blockY - 1}`);
		const down = byCoord.get(`${cable.blockX}-${cable.blockY + 1}`);

		const neighbors = [left, right, up, down].filter(Boolean) as PlacedItem[];
		const hasRouter = neighbors.some((n) => n.type === "router");
		const hasPc = neighbors.some((n) => n.type === "pc");

		// Cable is connected if it has both a router and a PC as neighbors
		if (hasRouter && hasPc) {
			connectedCableIds.add(cable.id);
			// Also mark the PC as connected
			for (const pc of neighbors.filter((n) => n.type === "pc")) {
				connectedPcIds.add(pc.id);
			}
		}
	});

	return { router, pc1, pc2, cables, connectedPcIds, connectedCableIds };
};

const CONNECTABLE_DEVICE_TYPES = new Set(["pc", "router"]);

const isConnectableDevice = (item?: PlacedItem): boolean =>
	Boolean(item && CONNECTABLE_DEVICE_TYPES.has(item.type));

const normalizeConnectionKey = (
	from: { x: number; y: number },
	to: { x: number; y: number },
): string => {
	if (from.y < to.y || (from.y === to.y && from.x <= to.x)) {
		return `${from.x},${from.y}-${to.x},${to.y}`;
	}
	return `${to.x},${to.y}-${from.x},${from.y}`;
};

export const deriveConnectionsFromCables = (
	placedItems: PlacedItem[],
): DeviceConnection[] => {
	const byCoord = new Map<string, PlacedItem>();
	placedItems.forEach((item) => {
		byCoord.set(`${item.blockX}-${item.blockY}`, item);
	});

	const connections: DeviceConnection[] = [];
	const seen = new Set<string>();

	const maybeAddConnection = (from: PlacedItem, to: PlacedItem) => {
		if (!isConnectableDevice(from) || !isConnectableDevice(to)) {
			return;
		}

		if (from.type === to.type) {
			return;
		}

		const fromCoord = { x: from.blockX, y: from.blockY };
		const toCoord = { x: to.blockX, y: to.blockY };
		const key = normalizeConnectionKey(fromCoord, toCoord);
		if (seen.has(key)) {
			return;
		}

		seen.add(key);
		connections.push({ from: fromCoord, to: toCoord });
	};

	placedItems
		.filter((item) => item.type === "cable")
		.forEach((cable) => {
			const left = byCoord.get(`${cable.blockX - 1}-${cable.blockY}`);
			const right = byCoord.get(`${cable.blockX + 1}-${cable.blockY}`);
			const up = byCoord.get(`${cable.blockX}-${cable.blockY - 1}`);
			const down = byCoord.get(`${cable.blockX}-${cable.blockY + 1}`);

			if (left && right) {
				maybeAddConnection(left, right);
			}

			if (up && down) {
				maybeAddConnection(up, down);
			}
		});

	return connections;
};
