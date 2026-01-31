// Network utility functions for IP validation and network topology analysis
// Contains functions for parsing IP ranges, validating IPs, and building network snapshots

import type { BoardItemLocation } from "@/components/game/game-provider";
import { DHCP_CANVAS_IDS, PRIVATE_IP_RANGES } from "./constants";

export type DeviceConnection = {
	fromId: string;
	toId: string;
};

export type BoardPlacements = Record<string, BoardItemLocation[]>;

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
export const buildNetworkSnapshot = (placements: BoardPlacements) => {
	const pc1 = placements[DHCP_CANVAS_IDS.pc1]?.find(
		(item) => item.type === "pc",
	);
	const pc2 = placements[DHCP_CANVAS_IDS.pc2]?.find(
		(item) => item.type === "pc",
	);
	const router = placements[DHCP_CANVAS_IDS.router]?.find(
		(item) => item.type === "router",
	);
	const leftCables =
		placements[DHCP_CANVAS_IDS.conn1]?.filter(
			(item) => item.type === "cable",
		) ?? [];
	const rightCables =
		placements[DHCP_CANVAS_IDS.conn2]?.filter(
			(item) => item.type === "cable",
		) ?? [];
	const cables = [...leftCables, ...rightCables];
	const connectedPcIds = new Set<string>();
	const connectedCableIds = new Set<string>();

	if (pc1 && router && leftCables.length > 0) {
		connectedPcIds.add(pc1.id);
		leftCables.forEach((cable) => {
			connectedCableIds.add(cable.id);
		});
	}

	if (pc2 && router && rightCables.length > 0) {
		connectedPcIds.add(pc2.id);
		rightCables.forEach((cable) => {
			connectedCableIds.add(cable.id);
		});
	}

	return { router, pc1, pc2, cables, connectedPcIds, connectedCableIds };
};

export const deriveConnectionsFromCables = (
	placements: BoardPlacements,
): DeviceConnection[] => {
	const connections: DeviceConnection[] = [];
	const snapshot = buildNetworkSnapshot(placements);

	if (snapshot.pc1 && snapshot.router) {
		const leftCable =
			placements[DHCP_CANVAS_IDS.conn1]?.find(
				(item) => item.type === "cable",
			) ?? null;
		if (leftCable) {
			connections.push({ fromId: snapshot.pc1.id, toId: snapshot.router.id });
		}
	}

	if (snapshot.pc2 && snapshot.router) {
		const rightCable =
			placements[DHCP_CANVAS_IDS.conn2]?.find(
				(item) => item.type === "cable",
			) ?? null;
		if (rightCable) {
			connections.push({ fromId: snapshot.pc2.id, toId: snapshot.router.id });
		}
	}

	return connections;
};
