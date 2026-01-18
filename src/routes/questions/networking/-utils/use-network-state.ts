// Custom hook for managing network state and DHCP IP assignment
// Handles automatic IP assignment to connected PCs when DHCP is enabled

import { useEffect, useMemo } from "react";
import type { GamePhase, PlacedItem } from "@/components/game/game-provider";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import { buildNetworkSnapshot, parseCidrBase } from "./network-utils";

/**
 * Manages the network state including DHCP configuration and automatic phase transitions
 * @returns Network state information including router config, PC connections, and IPs
 */
export const useNetworkState = () => {
	const state = useGameState();
	const dispatch = useGameDispatch();

	// Build network topology snapshot
	const network = useMemo(
		() =>
			buildNetworkSnapshot(state.canvas.placedItems, state.canvas.connections),
		[state.canvas.connections, state.canvas.placedItems],
	);

	// Extract router configuration
	const routerConfig = network.router?.data ?? {};
	const dhcpEnabled = routerConfig.dhcpEnabled === true;
	const ipRange =
		typeof routerConfig.ipRange === "string" ? routerConfig.ipRange : null;
	const ipBase = dhcpEnabled ? parseCidrBase(ipRange) : null;
	const routerConfigured = Boolean(ipBase && dhcpEnabled);

	// Check connection and IP assignment status
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

	// Check if router settings modal is open
	const routerSettingsOpen =
		state.overlay.activeModal?.id?.startsWith("router-config") ?? false;

	// Automatically assign IPs to connected PCs when DHCP is configured
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		const connectedPcs = [network.pc1, network.pc2].filter(
			(pc): pc is PlacedItem =>
				Boolean(pc && network.connectedPcIds.has(pc.id)),
		);
		const desiredIps = new Map<string, string>();

		// Assign sequential IPs to connected PCs based on sorted order
		if (routerConfigured && ipBase) {
			const sorted = [...connectedPcs].sort((a, b) => a.id.localeCompare(b.id));
			sorted.forEach((pc, index) => {
				desiredIps.set(pc.id, `${ipBase}.${index + 2}`);
			});
		}

		// Update router status
		if (network.router) {
			const desiredRouterStatus = routerConfigured ? "success" : "warning";
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

		// Update cable status based on whether they're properly connected
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

		// Update PC IP addresses and status as needed
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

		// Determine game phase based on network state
		let desiredPhase: GamePhase = "setup";
		if (network.router && network.connectedPcIds.size > 0) {
			desiredPhase = "playing";
		}
		if (network.router && pc1HasIp && pc2HasIp) {
			desiredPhase = "terminal";
		}

		if (state.phase !== desiredPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: desiredPhase } });
		}
	}, [
		dispatch,
		ipBase,
		network.cables,
		network.connectedCableIds,
		network.connectedPcIds,
		network.pc1,
		network.pc2,
		network.router,
		pc1HasIp,
		pc2HasIp,
		routerConfigured,
		state.phase,
		state.question.status,
	]);

	return {
		network,
		routerConfig,
		dhcpEnabled,
		ipRange,
		ipBase,
		routerConfigured,
		routerSettingsOpen,
		pc1Connected,
		pc2Connected,
		pc1HasIp,
		pc2HasIp,
		pc2Ip,
		placedItems: state.canvas.placedItems,
		connections: state.canvas.connections,
	};
};
