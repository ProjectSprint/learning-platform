import { useEffect, useMemo } from "react";
import type { DragEngine } from "@/components/game/engines";
import type { PlacedItem } from "@/components/game/game-provider";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import {
	buildNetworkSnapshot,
	deriveConnectionsFromCables,
	isPrivateIp,
	isValidIp,
	parseIpRangeBase,
} from "./network-utils";

interface UseNetworkStateArgs {
	dragEngine: DragEngine | null;
}

export const useNetworkState = ({ dragEngine }: UseNetworkStateArgs) => {
	const state = useGameState();
	const dispatch = useGameDispatch();

	const network = useMemo(
		() => buildNetworkSnapshot(state.puzzle.placedItems),
		[state.puzzle.placedItems],
	);
	const connections = useMemo(
		() => deriveConnectionsFromCables(state.puzzle.placedItems),
		[state.puzzle.placedItems],
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

	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		const connectedPcs = [network.pc1, network.pc2].filter(
			(pc): pc is PlacedItem =>
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

		if (network.router) {
			const desiredRouterStatus = routerConfigured ? "success" : "error";
			if (network.router.status !== desiredRouterStatus) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: network.router.id,
						config: {
							status: desiredRouterStatus,
						},
					},
				});
			}
		}

		network.cables.forEach((cable) => {
			const isConnected = network.connectedCableIds.has(cable.id);
			const desiredStatus = isConnected ? "success" : "warning";
			if (cable.status !== desiredStatus) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: cable.id,
						config: {
							status: desiredStatus,
						},
					},
				});
			}
		});

		[network.pc1, network.pc2].forEach((pc) => {
			if (!pc) {
				return;
			}

			const shouldHaveIp =
				routerConfigured && network.connectedPcIds.has(pc.id);
			const desiredIp = shouldHaveIp ? (desiredIps.get(pc.id) ?? null) : null;
			const currentIp =
				typeof pc.data?.ip === "string" ? (pc.data.ip as string) : null;
			const desiredStatus = desiredIp ? "success" : "warning";

			if (currentIp !== desiredIp || pc.status !== desiredStatus) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: pc.id,
						config: {
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
	]);

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
		placedItems: state.puzzle.placedItems,
		connections,
		dragProgress: dragEngine?.progress ?? { status: "pending" as const },
	};
};
