/**
 * Internet state hook adapted for new Space/Entity model.
 * Provides the same interface as the original useInternetState but works with the new state format.
 */

import { useEffect, useMemo } from "react";
import type { Entity } from "@/components/game/domain/entity/Entity";
import { GridSpace } from "@/components/game/domain/space/GridSpace";
import type { DragEngine } from "@/components/game/engines";
import type { BoardItemLocation } from "@/components/game/game-provider";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";
import {
	CANVAS_ORDER,
	GOOGLE_IP,
	type InternetCanvasKey,
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
 * Hook to manage network state for Internet question using new Space/Entity model.
 * Maintains the same interface as the original for compatibility.
 */
export const useInternetState = ({ dragEngine }: UseInternetStateArgs) => {
	const state = useGameState();
	const dispatch = useGameDispatch();

	// Get all grid spaces
	const spaces = useMemo(() => {
		const result: Record<InternetCanvasKey, GridSpace | undefined> = {
			local: undefined,
			"conn-1": undefined,
			router: undefined,
			"conn-2": undefined,
			igw: undefined,
			dns: undefined,
			google: undefined,
		};
		for (const canvasId of CANVAS_ORDER) {
			const space = state.spaces.get(canvasId);
			result[canvasId] = space instanceof GridSpace ? space : undefined;
		}
		return result;
	}, [state.spaces]);

	// Convert entities to BoardItemLocation format with adjusted coordinates
	const placedItems = useMemo(() => {
		const items: BoardItemLocation[] = [];
		let offsetX = 0;

		for (const canvasId of CANVAS_ORDER) {
			const space = spaces[canvasId];
			if (!space) {
				offsetX += 1; // Still increment even if space not found
				continue;
			}

			for (const entity of state.entities.values()) {
				if (space.contains(entity)) {
					const boardItem = entityToBoardItem(entity, space);
					if (boardItem) {
						// Adjust X coordinate based on canvas offset
						items.push({ ...boardItem, blockX: boardItem.blockX + offsetX });
					}
				}
			}

			// Increment offset by space width
			offsetX += space.cols;
		}

		return items;
	}, [spaces, state.entities]);

	const network = useMemo(
		() => buildInternetNetworkSnapshot(placedItems),
		[placedItems],
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

			const entity = state.entities.get(network.pc.id);
			const currentIp = entity?.getStateValue<string>("ip") ?? null;

			if (currentIp !== desiredIp) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.pc.id,
						state: { ip: desiredIp },
					},
				});
			}
		} else if (
			network.pc &&
			(!routerLanConfigured || !network.pcConnectedToRouterLan)
		) {
			// Remove IP if router LAN not configured or PC not connected
			const entity = state.entities.get(network.pc.id);
			const currentIp = entity?.getStateValue<string>("ip") ?? null;
			if (currentIp !== null) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.pc.id,
						state: { ip: null },
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
		state.question.status,
		state.entities,
	]);

	// Update device statuses based on network state
	useEffect(() => {
		if (state.question.status === "completed") {
			return;
		}

		// PC status: error → warning → success based on IP and internet access
		if (network.pc) {
			const entity = state.entities.get(network.pc.id);
			const hasPcIp = entity?.getStateValue<string>("ip") !== undefined;
			let desiredStatus: "error" | "warning" | "success";
			if (!hasPcIp) {
				desiredStatus = "error";
			} else if (!googleReachable) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.pc.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Router LAN status: error → warning → success based on config
		if (network.routerLan) {
			const entity = state.entities.get(network.routerLan.id);
			let desiredStatus: "error" | "warning" | "success";
			if (!dhcpEnabled || !hasValidIpRange) {
				desiredStatus = "error";
			} else if (!hasValidDnsServer) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.routerLan.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Router NAT status: error → success based on natEnabled
		if (network.routerNat) {
			const entity = state.entities.get(network.routerNat.id);
			const desiredStatus = natEnabled ? "success" : "error";
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.routerNat.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Router WAN status: error → warning → success based on PPPoE config AND connection to fiber/IGW/internet
		if (network.routerWan) {
			const entity = state.entities.get(network.routerWan.id);
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
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.routerWan.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// IGW status: warning → success based on WAN connection
		if (network.igw) {
			const entity = state.entities.get(network.igw.id);
			const desiredStatus = hasValidPppoeCredentials ? "success" : "warning";
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.igw.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// DNS status: error → success based on router LAN DNS config
		if (network.dns) {
			const entity = state.entities.get(network.dns.id);
			const desiredStatus = hasValidDnsServer ? "success" : "error";
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.dns.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Google status: error → warning → success based on full connectivity
		if (network.google) {
			const entity = state.entities.get(network.google.id);
			let desiredStatus: "error" | "warning" | "success";
			if (!hasValidDnsServer) {
				desiredStatus = "error";
			} else if (!routerNatConfigured || !hasValidPppoeCredentials) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.google.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Cable status - success when connecting PC to Router LAN
		if (network.cable) {
			const entity = state.entities.get(network.cable.id);
			const desiredStatus = network.pcConnectedToRouterLan
				? "success"
				: "warning";
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.cable.id,
						state: { status: desiredStatus },
					},
				});
			}
		}

		// Fiber status - success when connecting Router WAN to IGW
		if (network.fiber) {
			const entity = state.entities.get(network.fiber.id);
			const desiredStatus = network.routerWanConnectedToIgw
				? "success"
				: "warning";
			if (entity && entity.getStateValue("status") !== desiredStatus) {
				dispatch({
					type: "UPDATE_ENTITY_STATE",
					payload: {
						entityId: network.fiber.id,
						state: { status: desiredStatus },
					},
				});
			}
		}
	}, [
		dispatch,
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
		googleReachable,
		state.entities,
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
		placedItems,
		dragProgress: dragEngine?.progress ?? { status: "pending" as const },
		// Constants for external use
		googleIp: GOOGLE_IP,
	};
};
