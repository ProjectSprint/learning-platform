/**
 * Network state hook adapted for new Space/Entity model.
 * Provides the same interface as the original useNetworkState but works with the new state format.
 */

import { useEffect, useMemo, useRef } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import type { GridSpaceData } from "@/components/game/domain/space/space-data";
import { gridGetPosition } from "@/components/game/domain/space/space-fns";
import type { DragEngine } from "@/components/game/engines";
import type {
	BoardItemStatus,
	SpaceItemLocation,
} from "@/components/game/game-provider";
import { useGameState } from "@/components/game/game-provider";
import type { WorldApi } from "@/components/game/runtime";
import { DHCP_SPACE_IDS } from "./constants";
import {
	type BoardPlacements,
	buildNetworkSnapshot,
	deriveConnectionsFromCables,
	isPrivateIp,
	isValidIp,
	parseIpRangeBase,
} from "./network-utils";

interface UseNetworkStateArgs {
	dragEngine: DragEngine | null;
	eventTick: number;
	world: WorldApi;
}

/**
 * Convert Entity with position to SpaceItemLocation for compatibility with network-utils
 */
const entityToBoardItem = (
	entity: EntityData,
	space: GridSpaceData,
): SpaceItemLocation | null => {
	const position = gridGetPosition(space, entity.id);
	if (!position || !("row" in position && "col" in position)) {
		return null;
	}

	return {
		id: entity.id,
		itemId: entity.id,
		type: entity.type,
		blockX: position.col,
		blockY: position.row,
		status: (entity.state.status as BoardItemStatus | undefined) ?? "normal",
		data: entity.data,
	};
};

/**
 * Hook to manage network state for DHCP question using new Space/Entity model.
 * Maintains the same interface as the original for compatibility.
 */
export const useNetworkState = ({
	dragEngine,
	eventTick,
	world,
}: UseNetworkStateArgs) => {
	const state = useGameState();
	const stateRef = useRef(state);
	stateRef.current = state;

	// Get all grid spaces
	const spaces = useMemo(() => {
		const result: Record<string, GridSpaceData | undefined> = {};
		for (const spaceId of Object.values(DHCP_SPACE_IDS)) {
			const space = state.spaces[spaceId];
			result[spaceId] = space?.kind === "grid" ? space : undefined;
		}
		return result;
	}, [state.spaces]);

	// Convert entities to SpaceItemLocation format for compatibility
	const placements = useMemo<BoardPlacements>(() => {
		const result: BoardPlacements = {
			[DHCP_SPACE_IDS.pc1]: [],
			[DHCP_SPACE_IDS.conn1]: [],
			[DHCP_SPACE_IDS.router]: [],
			[DHCP_SPACE_IDS.conn2]: [],
			[DHCP_SPACE_IDS.pc2]: [],
		};

		for (const [spaceId, space] of Object.entries(spaces)) {
			if (!space) continue;

			const items: SpaceItemLocation[] = [];
			for (const entity of Object.values(state.entities)) {
				if (entity.id in space.entityPositions) {
					const boardItem = entityToBoardItem(entity, space);
					if (boardItem) {
						items.push(boardItem);
					}
				}
			}

			result[spaceId] = items;
		}

		return result;
	}, [spaces, state.entities]);

	const placedItems = useMemo(
		() => Object.values(placements).flat(),
		[placements],
	);

	const network = useMemo(() => buildNetworkSnapshot(placements), [placements]);
	const connections = useMemo(
		() => deriveConnectionsFromCables(placements),
		[placements],
	);

	const routerConfig = network.router?.data ?? {};
	const dhcpEnabled = routerConfig.dhcpEnabled === true;
	const startIp =
		typeof routerConfig.startIp === "string" ? routerConfig.startIp : null;
	const endIp =
		typeof routerConfig.endIp === "string" ? routerConfig.endIp : null;

	const hasValidIpRange =
		startIp !== null &&
		endIp !== null &&
		isValidIp(startIp) &&
		isValidIp(endIp) &&
		isPrivateIp(startIp) &&
		isPrivateIp(endIp);

	const ipBase =
		dhcpEnabled && hasValidIpRange ? parseIpRangeBase(startIp) : null;
	const routerConfigured = Boolean(ipBase && dhcpEnabled && hasValidIpRange);

	const pc1Connected = Boolean(
		network.pc1 && network.connectedPcIds.has("pc-1"),
	);
	const pc2Connected = Boolean(
		network.pc2 && network.connectedPcIds.has("pc-2"),
	);
	// Check state.ip since IPs are stored in entity.state.ip, not entity.data.ip
	const pc1HasIp = Boolean(
		network.pc1 && state.entities[network.pc1.id]?.state.ip,
	);
	const pc2HasIp = Boolean(
		network.pc2 && state.entities[network.pc2.id]?.state.ip,
	);
	const pc2Ip = network.pc2
		? ((state.entities[network.pc2.id]?.state.ip as string | null) ?? null)
		: null;

	const routerSettingsOpen = Object.values(state.overlay.modals).some(
		(entry) => entry.visible && entry.instance.id?.startsWith("router-config"),
	);

	const derivedRef = useRef({
		network,
		routerConfigured,
		startIp,
		pc1HasIp,
		pc2HasIp,
		pc2Ip,
		questionStatus: state.question.status,
	});
	derivedRef.current = {
		network,
		routerConfigured,
		startIp,
		pc1HasIp,
		pc2HasIp,
		pc2Ip,
		questionStatus: state.question.status,
	};

	// Update device statuses based on network state
	useEffect(() => {
		const snapshot = derivedRef.current;
		void eventTick;
		if (snapshot.questionStatus === "completed") {
			return;
		}

		const { network: networkSnapshot, routerConfigured, startIp } = snapshot;
		const connectedPcs = [networkSnapshot.pc1, networkSnapshot.pc2].filter(
			(pc): pc is SpaceItemLocation =>
				Boolean(pc && networkSnapshot.connectedPcIds.has(pc.id)),
		);
		const desiredIps = new Map<string, string>();

		if (routerConfigured && startIp) {
			const startOctets = startIp.split(".").map((s) => Number.parseInt(s, 10));
			const baseOctets = startOctets.slice(0, 3);
			const startLastOctet = startOctets[3];

			const sorted = [...connectedPcs].sort((a, b) => a.id.localeCompare(b.id));
			sorted.forEach((pc, index) => {
				const assignedLastOctet = startLastOctet + index;
				if (assignedLastOctet <= 255) {
					desiredIps.set(pc.id, `${baseOctets.join(".")}.${assignedLastOctet}`);
				}
			});
		}

		// Update router status
		if (networkSnapshot.router) {
			const desiredRouterStatus = routerConfigured ? "success" : "error";
			const entity = stateRef.current.entities[networkSnapshot.router.id];
			if (entity && entity.state.status !== desiredRouterStatus) {
				world.updateEntityState(networkSnapshot.router.id, {
					status: desiredRouterStatus,
				});
			}
		}

		// Update cable statuses
		networkSnapshot.cables.forEach((cable) => {
			const isConnected = networkSnapshot.connectedCableIds.has(cable.id);
			const desiredStatus = isConnected ? "success" : "warning";
			const entity = stateRef.current.entities[cable.id];
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(cable.id, {
					status: desiredStatus,
				});
			}
		});

		// Update PC statuses and IPs
		[networkSnapshot.pc1, networkSnapshot.pc2].forEach((pc) => {
			if (!pc) {
				return;
			}

			const entity = stateRef.current.entities[pc.id];
			if (!entity) return;

			const shouldHaveIp =
				routerConfigured && networkSnapshot.connectedPcIds.has(pc.id);
			const desiredIp = shouldHaveIp ? (desiredIps.get(pc.id) ?? null) : null;
			const currentIp = entity.state.ip ?? null;
			const desiredStatus = desiredIp ? "success" : "warning";
			const currentStatus = entity.state.status;

			if (currentIp !== desiredIp || currentStatus !== desiredStatus) {
				world.updateEntityState(pc.id, {
					ip: desiredIp,
					status: desiredStatus,
				});
			}
		});
	}, [eventTick, world]);

	// Manage drag engine progress
	useEffect(() => {
		if (!dragEngine) return;
		void eventTick;
		const snapshot = derivedRef.current;
		if (snapshot.questionStatus === "completed") return;

		const { network: networkSnapshot } = snapshot;
		if (
			dragEngine.progress.status === "pending" &&
			networkSnapshot.router &&
			networkSnapshot.connectedPcIds.size > 0
		) {
			dragEngine.start();
		}

		if (
			dragEngine.progress.status !== "finished" &&
			networkSnapshot.router &&
			snapshot.pc1HasIp &&
			snapshot.pc2HasIp
		) {
			dragEngine.finish();
		}
	}, [dragEngine, eventTick]);

	return {
		network,
		routerConfig,
		dhcpEnabled,
		startIp,
		endIp,
		ipBase,
		routerConfigured,
		routerSettingsOpen,
		pc1Connected,
		pc2Connected,
		pc1HasIp,
		pc2HasIp,
		pc2Ip,
		placedItems,
		connections,
		dragProgress: dragEngine?.progress ?? { status: "pending" as const },
	};
};
