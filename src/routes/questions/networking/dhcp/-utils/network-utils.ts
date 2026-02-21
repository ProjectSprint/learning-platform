// Network topology analysis utilities for DHCP question
// IP utility functions are re-exported from the shared networking utils

import type { SpaceItemLocation } from "@/components/game/engine/game-provider";
import { DHCP_SPACE_IDS } from "./constants";

export {
	calculateIpRangeSize,
	isPrivateIp,
	isValidIp,
	parseIpRangeBase,
	parseIpToNumber,
	validateIpRange,
} from "../../-utils/network-utils";

export type DeviceConnection = {
	fromId: string;
	toId: string;
};

export type BoardPlacements = Record<string, SpaceItemLocation[]>;

/**
 * Analyzes the network topology to identify key devices and their connections
 * @param placedItems - All items placed in the space
 * @returns Network snapshot containing router, PCs, cables, and connected IDs
 */
export const buildNetworkSnapshot = (placements: BoardPlacements) => {
	const pc1 = placements[DHCP_SPACE_IDS.pc1]?.find(
		(item) => item.type === "pc",
	);
	const pc2 = placements[DHCP_SPACE_IDS.pc2]?.find(
		(item) => item.type === "pc",
	);
	const router = placements[DHCP_SPACE_IDS.router]?.find(
		(item) => item.type === "router",
	);
	const leftCables =
		placements[DHCP_SPACE_IDS.conn1]?.filter((item) => item.type === "cable") ??
		[];
	const rightCables =
		placements[DHCP_SPACE_IDS.conn2]?.filter((item) => item.type === "cable") ??
		[];
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
			placements[DHCP_SPACE_IDS.conn1]?.find((item) => item.type === "cable") ??
			null;
		if (leftCable) {
			connections.push({ fromId: snapshot.pc1.id, toId: snapshot.router.id });
		}
	}

	if (snapshot.pc2 && snapshot.router) {
		const rightCable =
			placements[DHCP_SPACE_IDS.conn2]?.find((item) => item.type === "cable") ??
			null;
		if (rightCable) {
			connections.push({ fromId: snapshot.pc2.id, toId: snapshot.router.id });
		}
	}

	return connections;
};
