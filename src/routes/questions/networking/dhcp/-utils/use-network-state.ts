/**
 * Network state hook adapted for new Space/Entity model.
 * Provides the same interface as the original useNetworkState but works with the new state format.
 */

import { useEffect, useMemo } from "react";
import type { Entity } from "@/components/game/domain/entity/Entity";
import { GridSpace } from "@/components/game/domain/space/GridSpace";
import type { DragEngine } from "@/components/game/engines";
import type { BoardItemLocation } from "@/components/game/game-provider";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import { DHCP_CANVAS_IDS } from "./constants";
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
}

/**
 * Convert Entity with position to BoardItemLocation for compatibility with network-utils
 */
const entityToBoardItem = (
	entity: Entity,
	space: GridSpace,
): BoardItemLocation | null => {
	const position = space.getPosition(entity);
	if (!position || !("row" in position && "col" in position)) {
		return null;
	}

	return {
		id: entity.id,
		itemId: entity.id,
		type: entity.type,
		blockX: position.col,
		blockY: position.row,
		status: entity.getStateValue("status") ?? "normal",
		data: entity.data,
	};
};

/**
 * Hook to manage network state for DHCP question using new Space/Entity model.
 * Maintains the same interface as the original for compatibility.
 */
export const useNetworkState = ({ dragEngine }: UseNetworkStateArgs) => {
	const state = useGameState();
	const dispatch = useGameDispatch();

	// Get all grid spaces
	const spaces = useMemo(() => {
		const result: Record<string, GridSpace | undefined> = {};
		for (const canvasId of Object.values(DHCP_CANVAS_IDS)) {
			const space = state.spaces.get(canvasId);
			result[canvasId] = space instanceof GridSpace ? space : undefined;
		}
		return result;
	}, [state.spaces]);

	// Convert entities to BoardItemLocation format for compatibility
	const placements = useMemo<BoardPlacements>(() => {
		const result: BoardPlacements = {
			[DHCP_CANVAS_IDS.pc1]: [],
			[DHCP_CANVAS_IDS.conn1]: [],
			[DHCP_CANVAS_IDS.router]: [],
			[DHCP_CANVAS_IDS.conn2]: [],
			[DHCP_CANVAS_IDS.pc2]: [],
		};

		for (const [canvasId, space] of Object.entries(spaces)) {
			if (!space) continue;

			const items: BoardItemLocation[] = [];
			for (const entity of state.entities.values()) {
				if (space.contains(entity)) {
					const boardItem = entityToBoardItem(entity, space);
					if (boardItem) {
						items.push(boardItem);
					}
				}
			}

			result[canvasId] = items;
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
	const pc1HasIp = typeof network.pc1?.data?.ip === "string";
	const pc2HasIp = typeof network.pc2?.data?.ip === "string";
	const pc2Ip =
		typeof network.pc2?.data?.ip === "string" ? network.pc2.data.ip : null;

	const routerSettingsOpen =
		state.overlay.activeModal?.id?.startsWith("router-config") ?? false;

	// Update device statuses based on network state
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		const connectedPcs = [network.pc1, network.pc2].filter(
			(pc): pc is BoardItemLocation =>
				Boolean(pc && network.connectedPcIds.has(pc.id)),
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
		if (network.router) {
			const desiredRouterStatus = routerConfigured ? "success" : "error";
			const entity = state.entities.get(network.router.id);
			if (entity && entity.getStateValue("status") !== desiredRouterStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.router.id,
						state: { status: desiredRouterStatus },
					},
				});
			}
		}

		// Update cable statuses
		network.cables.forEach((cable) => {
			const isConnected = network.connectedCableIds.has(cable.id);
			const desiredStatus = isConnected ? "success" : "warning";
			const entity = state.entities.get(cable.id);
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: cable.id,
						state: { status: desiredStatus },
					},
				});
			}
		});

		// Update PC statuses and IPs
		[network.pc1, network.pc2].forEach((pc) => {
			if (!pc) {
				return;
			}

			const entity = state.entities.get(pc.id);
			if (!entity) return;

			const shouldHaveIp =
				routerConfigured && network.connectedPcIds.has(pc.id);
			const desiredIp = shouldHaveIp ? (desiredIps.get(pc.id) ?? null) : null;
			const currentIp = entity.getStateValue<string>("ip") ?? null;
			const desiredStatus = desiredIp ? "success" : "warning";
			const currentStatus = entity.getStateValue("status");

			if (currentIp !== desiredIp || currentStatus !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: pc.id,
						state: {
							ip: desiredIp,
							status: desiredStatus,
						},
					},
				});
			}
		});
	}, [
		dispatch,
		startIp,
		network.cables,
		network.connectedCableIds,
		network.connectedPcIds,
		network.pc1,
		network.pc2,
		network.router,
		routerConfigured,
		state.question.status,
		state.entities,
	]);

	// Manage drag engine progress
	useEffect(() => {
		if (!dragEngine) return;
		if (state.question.status === "completed") return;

		if (
			dragEngine.progress.status === "pending" &&
			network.router &&
			network.connectedPcIds.size > 0
		) {
			dragEngine.start();
		}

		if (
			dragEngine.progress.status !== "finished" &&
			network.router &&
			pc1HasIp &&
			pc2HasIp
		) {
			dragEngine.finish();
		}
	}, [
		dragEngine,
		network.router,
		network.connectedPcIds,
		pc1HasIp,
		pc2HasIp,
		state.question.status,
	]);

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
