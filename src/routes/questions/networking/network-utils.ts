// Network utility functions for IP validation and network topology analysis
// Contains functions for parsing CIDR notation, validating IPs, and building network snapshots

import type { Connection, PlacedItem } from "@/components/game/game-provider";
import { PRIVATE_IP_RANGES } from "./constants";

/**
 * Parses a CIDR notation string and returns the base IP address (first 3 octets)
 * Validates that the IP is in a private range and the prefix is valid
 * @param input - CIDR notation string (e.g., "192.168.1.0/24")
 * @returns Base IP address (e.g., "192.168.1") or null if invalid
 */
export const parseCidrBase = (input?: string | null) => {
	if (!input) {
		return null;
	}

	const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
	if (!cidrPattern.test(input)) {
		return null;
	}

	const [ip, prefix] = input.split("/");
	const prefixNum = Number.parseInt(prefix, 10);
	if (Number.isNaN(prefixNum) || prefixNum < 8 || prefixNum > 30) {
		return null;
	}

	if (!PRIVATE_IP_RANGES.some((range) => range.test(ip))) {
		return null;
	}

	const octets = ip.split(".").map((value) => Number.parseInt(value, 10));
	if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
		return null;
	}

	return `${octets[0]}.${octets[1]}.${octets[2]}`;
};

/**
 * Analyzes the network topology to identify key devices and their connections
 * @param placedItems - All items placed on the canvas
 * @param connections - All cable connections between items
 * @returns Network snapshot containing router, PCs, and connected PC IDs
 */
export const buildNetworkSnapshot = (
	placedItems: PlacedItem[],
	connections: Connection[],
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
	const connectedPcIds = new Set<string>();

	// Identify which PCs are connected to the router
	if (router) {
		connections.forEach((connection) => {
			const from = byCoord.get(
				`${connection.from.x}-${connection.from.y}`,
			);
			const to = byCoord.get(`${connection.to.x}-${connection.to.y}`);

			if (!from || !to) {
				return;
			}

			// Check if connection is between router and PC
			if (from.id === router.id && to.type === "pc") {
				connectedPcIds.add(to.id);
			}

			if (to.id === router.id && from.type === "pc") {
				connectedPcIds.add(from.id);
			}
		});
	}

	return { router, pc1, pc2, connectedPcIds };
};
