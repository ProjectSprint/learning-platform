import { useCallback, useEffect, useMemo } from "react";
import type { DragEngine } from "@/components/game/engines";
import {
	type Connection,
	type PlacedItem,
	useAllPuzzles,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	GOOGLE_IP,
	PUBLIC_DNS_SERVERS,
	VALID_PPPOE_CREDENTIALS,
} from "./constants";
import {
	buildInternetNetworkSnapshot,
	isPrivateIp,
	isPublicIp,
	isValidIp,
} from "./network-utils";

interface UseInternetStateArgs {
	dragEngine: DragEngine | null;
}

export const useInternetState = ({ dragEngine }: UseInternetStateArgs) => {
	const state = useGameState();
	const canvases = useAllPuzzles();
	const dispatch = useGameDispatch();

	const { combinedItems, combinedConnections, itemCanvasKeys } = useMemo(() => {
		const items: PlacedItem[] = [];
		const connections: Connection[] = [];
		const keys = new Map<string, string>();
		let offsetX = 0;

		for (const key of CANVAS_ORDER) {
			const canvas = canvases[key];
			const config = CANVAS_CONFIGS[key];
			if (!config) {
				continue;
			}

			if (canvas) {
				for (const item of canvas.placedItems) {
					items.push({ ...item, blockX: item.blockX + offsetX });
					keys.set(item.id, key);
				}

				for (const connection of canvas.connections) {
					connections.push({
						...connection,
						from: { x: connection.from.x + offsetX, y: connection.from.y },
						to: { x: connection.to.x + offsetX, y: connection.to.y },
					});
				}
			}

			offsetX += config.columns;
		}

		return {
			combinedItems: items,
			combinedConnections: connections,
			itemCanvasKeys: keys,
		};
	}, [canvases]);

	const resolveCanvasKey = useCallback(
		(itemId: string) => itemCanvasKeys.get(itemId),
		[itemCanvasKeys],
	);

	const dispatchConfig = useCallback(
		(deviceId: string, config: Record<string, unknown>) => {
			dispatch({
				type: "CONFIGURE_DEVICE",
				payload: {
					deviceId,
					config,
					puzzleId: resolveCanvasKey(deviceId),
				},
			});
		},
		[dispatch, resolveCanvasKey],
	);

	const network = useMemo(
		() => buildInternetNetworkSnapshot(combinedItems, combinedConnections),
		[combinedConnections, combinedItems],
	);

	// Extract Router LAN configuration
	const routerLanConfig = network.routerLan?.data ?? {};
	const dhcpEnabled = routerLanConfig.dhcpEnabled === true;
	const startIp =
		typeof routerLanConfig.startIp === "string"
			? routerLanConfig.startIp
			: null;
	const endIp =
		typeof routerLanConfig.endIp === "string" ? routerLanConfig.endIp : null;
	const dnsServer =
		typeof routerLanConfig.dnsServer === "string"
			? routerLanConfig.dnsServer
			: null;

	// Extract Router NAT configuration
	const routerNatConfig = network.routerNat?.data ?? {};
	const natEnabled = routerNatConfig.natEnabled === true;

	// Extract Router WAN configuration
	const routerWanConfig = network.routerWan?.data ?? {};
	const connectionType =
		typeof routerWanConfig.connectionType === "string"
			? routerWanConfig.connectionType
			: null;
	const username =
		typeof routerWanConfig.username === "string"
			? routerWanConfig.username
			: null;
	const password =
		typeof routerWanConfig.password === "string"
			? routerWanConfig.password
			: null;
	const publicIp =
		typeof routerWanConfig.publicIp === "string"
			? routerWanConfig.publicIp
			: null;

	// Validate IP range
	const hasValidIpRange =
		startIp !== null &&
		endIp !== null &&
		isValidIp(startIp) &&
		isValidIp(endIp) &&
		isPrivateIp(startIp) &&
		isPrivateIp(endIp);

	// Validate DNS server
	const hasValidDnsServer =
		dnsServer !== null &&
		isValidIp(dnsServer) &&
		isPublicIp(dnsServer) &&
		PUBLIC_DNS_SERVERS.includes(dnsServer);

	// Validate PPPoE credentials
	const hasValidPppoeCredentials =
		username === VALID_PPPOE_CREDENTIALS.username &&
		password === VALID_PPPOE_CREDENTIALS.password;

	// Derived states
	const routerLanConfigured =
		dhcpEnabled && hasValidIpRange && hasValidDnsServer;
	const routerNatConfigured = natEnabled === true;
	const allRoutersConfigured =
		routerLanConfigured && routerNatConfigured && hasValidPppoeCredentials;

	// PC state
	const pcHasIp = typeof network.pc?.data?.ip === "string";
	const pcIp =
		typeof network.pc?.data?.ip === "string" ? network.pc.data.ip : null;

	// Google reachability: all configured and all devices placed
	const googleReachable = allRoutersConfigured && network.isFullyConnected;

	// Check if all devices are placed
	const allDevicesPlaced =
		network.pc !== undefined &&
		network.cable !== undefined &&
		network.routerLan !== undefined &&
		network.routerNat !== undefined &&
		network.routerWan !== undefined &&
		network.fiber !== undefined &&
		network.igw !== undefined &&
		network.dns !== undefined &&
		network.google !== undefined;

	// Modal states
	const routerLanSettingsOpen =
		state.overlay.activeModal?.id?.startsWith("router-lan-config") ?? false;
	const routerNatSettingsOpen =
		state.overlay.activeModal?.id?.startsWith("router-nat-config") ?? false;
	const routerWanSettingsOpen =
		state.overlay.activeModal?.id?.startsWith("router-wan-config") ?? false;

	// Auto-assign IP to PC when routerLan is configured and PC is connected via cable
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		// Auto-assign IP to PC when router LAN is configured and PC is connected to it
		if (
			network.pc &&
			routerLanConfigured &&
			startIp &&
			network.pcConnectedToRouterLan
		) {
			const startOctets = startIp.split(".").map((s) => Number.parseInt(s, 10));
			const baseOctets = startOctets.slice(0, 3);
			const startLastOctet = startOctets[3];
			const desiredIp = `${baseOctets.join(".")}.${startLastOctet}`;
			const currentIp =
				typeof network.pc.data?.ip === "string" ? network.pc.data.ip : null;

			if (currentIp !== desiredIp) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: network.pc.id,
						config: { ip: desiredIp },
						puzzleId: resolveCanvasKey(network.pc.id),
					},
				});
			}
		} else if (
			network.pc &&
			(!routerLanConfigured || !network.pcConnectedToRouterLan)
		) {
			// Remove IP if router LAN not configured or PC not connected
			const currentIp =
				typeof network.pc.data?.ip === "string" ? network.pc.data.ip : null;
			if (currentIp !== null) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: network.pc.id,
						config: { ip: null },
						puzzleId: resolveCanvasKey(network.pc.id),
					},
				});
			}
		}
	}, [
		dispatch,
		network.pc,
		network.pcConnectedToRouterLan,
		routerLanConfigured,
		startIp,
		resolveCanvasKey,
		state.question.status,
	]);

	// Update device statuses based on network state
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		// PC status: error → warning → success based on IP and internet access
		if (network.pc) {
			const hasPcIp = typeof network.pc.data?.ip === "string";
			let desiredStatus: "error" | "warning" | "success";
			if (!hasPcIp) {
				desiredStatus = "error";
			} else if (!googleReachable) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (network.pc.status !== desiredStatus) {
				dispatchConfig(network.pc.id, { status: desiredStatus });
			}
		}

		// Router LAN status: error → warning → success based on config
		if (network.routerLan) {
			let desiredStatus: "error" | "warning" | "success";
			if (!dhcpEnabled || !hasValidIpRange) {
				desiredStatus = "error";
			} else if (!hasValidDnsServer) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (network.routerLan.status !== desiredStatus) {
				dispatchConfig(network.routerLan.id, { status: desiredStatus });
			}
		}

		// Router NAT status: error → success based on natEnabled
		if (network.routerNat) {
			const desiredStatus = natEnabled ? "success" : "error";
			if (network.routerNat.status !== desiredStatus) {
				dispatchConfig(network.routerNat.id, { status: desiredStatus });
			}
		}

		// Router WAN status: error → warning → success based on PPPoE config AND connection to fiber/IGW/internet
		if (network.routerWan) {
			let desiredStatus: "error" | "warning" | "success";
			if (!hasValidPppoeCredentials) {
				desiredStatus = "error";
			} else if (!network.routerWanConnectedToIgw) {
				// Has credentials but not connected to fiber → IGW
				desiredStatus = "warning";
			} else if (!network.igw) {
				// Connected to fiber but IGW not placed
				desiredStatus = "warning";
			} else {
				// Fully configured and connected
				desiredStatus = "success";
			}
			if (network.routerWan.status !== desiredStatus) {
				dispatchConfig(network.routerWan.id, { status: desiredStatus });
			}
		}

		// IGW status: warning → success based on WAN connection
		if (network.igw) {
			const desiredStatus = hasValidPppoeCredentials ? "success" : "warning";
			if (network.igw.status !== desiredStatus) {
				dispatchConfig(network.igw.id, { status: desiredStatus });
			}
		}

		// DNS status: error → success based on router LAN DNS config
		if (network.dns) {
			const desiredStatus = hasValidDnsServer ? "success" : "error";
			if (network.dns.status !== desiredStatus) {
				dispatchConfig(network.dns.id, { status: desiredStatus });
			}
		}

		// Google status: error → warning → success based on full connectivity
		if (network.google) {
			let desiredStatus: "error" | "warning" | "success";
			if (!hasValidDnsServer) {
				desiredStatus = "error";
			} else if (!routerNatConfigured || !hasValidPppoeCredentials) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (network.google.status !== desiredStatus) {
				dispatchConfig(network.google.id, { status: desiredStatus });
			}
		}

		// Cable status - success when connecting PC to Router LAN
		if (network.cable) {
			const desiredStatus = network.pcConnectedToRouterLan
				? "success"
				: "warning";
			if (network.cable.status !== desiredStatus) {
				dispatchConfig(network.cable.id, { status: desiredStatus });
			}
		}

		// Fiber status - success when connecting Router WAN to IGW
		if (network.fiber) {
			const desiredStatus = network.routerWanConnectedToIgw
				? "success"
				: "warning";
			if (network.fiber.status !== desiredStatus) {
				dispatchConfig(network.fiber.id, { status: desiredStatus });
			}
		}
	}, [
		dispatchConfig,
		network.pc,
		network.cable,
		network.routerLan,
		network.routerNat,
		network.routerWan,
		network.fiber,
		network.igw,
		network.dns,
		network.google,
		network.pcConnectedToRouterLan,
		network.routerWanConnectedToIgw,
		dhcpEnabled,
		hasValidIpRange,
		hasValidDnsServer,
		natEnabled,
		hasValidPppoeCredentials,
		routerNatConfigured,
		state.question.status,
	]);

	// Phase transitions
	useEffect(() => {
		if (!dragEngine) return;
		if (state.question.status === "completed") return;

		// pending → start when all devices placed
		if (dragEngine.progress.status === "pending" && allDevicesPlaced) {
			dragEngine.start();
		}

		// playing → finish when all configured and googleReachable
		if (
			dragEngine.progress.status !== "finished" &&
			allRoutersConfigured &&
			googleReachable
		) {
			dragEngine.finish();
		}
	}, [
		dragEngine,
		allDevicesPlaced,
		allRoutersConfigured,
		googleReachable,
		state.question.status,
	]);

	return {
		network,
		// Router LAN config
		routerLanConfig,
		dhcpEnabled,
		startIp,
		endIp,
		dnsServer,
		hasValidIpRange,
		hasValidDnsServer,
		routerLanConfigured,
		// Router NAT config
		routerNatConfig,
		natEnabled,
		routerNatConfigured,
		// Router WAN config
		routerWanConfig,
		connectionType,
		username,
		password,
		publicIp,
		hasValidPppoeCredentials,
		// Combined state
		allRoutersConfigured,
		// PC state
		pcHasIp,
		pcIp,
		// Connectivity
		googleReachable,
		allDevicesPlaced,
		// Modal states
		routerLanSettingsOpen,
		routerNatSettingsOpen,
		routerWanSettingsOpen,
		// Game state
		placedItems: combinedItems,
		connections: combinedConnections,
		dragProgress: dragEngine?.progress ?? { status: "pending" as const },
		// Constants for external use
		googleIp: GOOGLE_IP,
	};
};
