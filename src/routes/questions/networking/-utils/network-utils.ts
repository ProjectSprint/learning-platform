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
 * @returns Network snapshot containing router, PCs, cables, and connected IDs
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

	// Also check connections array for additional PC connections
	if (router) {
		connections.forEach((connection) => {
			const from = byCoord.get(`${connection.from.x}-${connection.from.y}`);
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

	return { router, pc1, pc2, cables, connectedPcIds, connectedCableIds };
};
