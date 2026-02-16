/**
 * Internet state hook adapted for new Space/Entity model.
 * Pure derivation + side effects for entity status updates and drag engine management.
 */

import { useEffect, useMemo, useRef } from "react";
import type { DragEngine } from "@/components/game/engine";
import type {
	BoardItemStatus,
	SpaceItemLocation,
} from "@/components/game/engine/game-provider";
import { useGameState } from "@/components/game/engine/game-provider";
import type { EntityData } from "@/components/game/types/entity";
import type { WorldApi } from "@/components/game/types/runtime";
import type { GridSpaceData } from "@/components/game/types/space";
import {
	GOOGLE_IP,
	type InternetSpaceKey,
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
	world: WorldApi;
}

const SPACE_IDS: InternetSpaceKey[] = [
	"local",
	"conn-1",
	"router",
	"conn-2",
	"igw",
	"dns",
	"google",
];

/**
 * Convert Entity with position to SpaceItemLocation for compatibility with network-utils
 */
const entityToBoardItem = (
	entity: EntityData,
	space: GridSpaceData,
): SpaceItemLocation | null => {
	const position = space.entityPositions[entity.id];
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
 * Hook to manage network state for Internet question using new Space/Entity model.
 */
export const useInternetState = ({
	dragEngine,
	world,
}: UseInternetStateArgs) => {
	const state = useGameState();
	const stateRef = useRef(state);
	stateRef.current = state;

	// Get all grid spaces
	const spaces = useMemo(() => {
		const result: Record<InternetSpaceKey, GridSpaceData | undefined> = {
			local: undefined,
			"conn-1": undefined,
			router: undefined,
			"conn-2": undefined,
			igw: undefined,
			dns: undefined,
			google: undefined,
		};
		for (const spaceId of SPACE_IDS) {
			const space = state.spaces[spaceId];
			result[spaceId] = space?.kind === "grid" ? space : undefined;
		}
		return result;
	}, [state.spaces]);

	// Convert entities to SpaceItemLocation format with adjusted coordinates
	const placedItems = useMemo(() => {
		const items: SpaceItemLocation[] = [];
		let offsetX = 0;

		for (const spaceId of SPACE_IDS) {
			const space = spaces[spaceId];
			if (!space) {
				offsetX += 1;
				continue;
			}

			for (const entity of Object.values(state.entities)) {
				if (entity.id in space.entityPositions) {
					const boardItem = entityToBoardItem(entity, space);
					if (boardItem) {
						items.push({ ...boardItem, blockX: boardItem.blockX + offsetX });
					}
				}
			}

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
	const routerLanSettingsOpen = Object.values(state.overlay.modals).some(
		(entry) =>
			entry.visible && entry.instance.id?.startsWith("router-lan-config"),
	);
	const routerNatSettingsOpen = Object.values(state.overlay.modals).some(
		(entry) =>
			entry.visible && entry.instance.id?.startsWith("router-nat-config"),
	);
	const routerWanSettingsOpen = Object.values(state.overlay.modals).some(
		(entry) =>
			entry.visible && entry.instance.id?.startsWith("router-wan-config"),
	);

	const questionStatus = state.question.status;

	// Auto-assign IP to PC when routerLan is configured and PC is connected via cable
	useEffect(() => {
		if (questionStatus === "completed") return;

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

			const entity = stateRef.current.entities[network.pc.id];
			const currentIp = entity?.state.ip ?? null;

			if (currentIp !== desiredIp) {
				world.updateEntityState(network.pc.id, { ip: desiredIp });
			}
		} else if (
			network.pc &&
			(!routerLanConfigured || !network.pcConnectedToRouterLan)
		) {
			const entity = stateRef.current.entities[network.pc.id];
			const currentIp = entity?.state.ip ?? null;
			if (currentIp !== null) {
				world.updateEntityState(network.pc.id, { ip: null });
			}
		}
	}, [questionStatus, network, routerLanConfigured, startIp, world]);

	// Update device statuses based on network state
	useEffect(() => {
		if (questionStatus === "completed") return;

		const hasPppoeCredentials =
			typeof username === "string" &&
			typeof password === "string" &&
			username.trim().length > 0 &&
			password.trim().length > 0;

		// PC status
		if (network.pc) {
			const entity = stateRef.current.entities[network.pc.id];
			const hasPcIp = typeof entity?.state.ip === "string";
			let desiredStatus: "error" | "warning" | "success";
			if (!hasPcIp) {
				desiredStatus = "error";
			} else if (!googleReachable) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.pc.id, { status: desiredStatus });
			}
		}

		// Router LAN status
		if (network.routerLan) {
			const entity = stateRef.current.entities[network.routerLan.id];
			let desiredStatus: "error" | "warning" | "success";
			if (!dhcpEnabled || !hasValidIpRange) {
				desiredStatus = "error";
			} else if (!hasValidDnsServer) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.routerLan.id, {
					status: desiredStatus,
				});
			}
		}

		// Router NAT status
		if (network.routerNat) {
			const entity = stateRef.current.entities[network.routerNat.id];
			const desiredStatus = natEnabled ? "success" : "error";
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.routerNat.id, {
					status: desiredStatus,
				});
			}
		}

		// Router WAN status
		if (network.routerWan) {
			const entity = stateRef.current.entities[network.routerWan.id];
			let desiredStatus: "error" | "warning" | "success";
			if (!hasPppoeCredentials || !hasValidPppoeCredentials) {
				desiredStatus = "error";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.routerWan.id, {
					status: desiredStatus,
				});
			}
		}

		// IGW status
		if (network.igw) {
			const entity = stateRef.current.entities[network.igw.id];
			const desiredStatus = hasValidPppoeCredentials ? "success" : "warning";
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.igw.id, { status: desiredStatus });
			}
		}

		// DNS status
		if (network.dns) {
			const entity = stateRef.current.entities[network.dns.id];
			const desiredStatus = hasValidDnsServer ? "success" : "error";
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.dns.id, { status: desiredStatus });
			}
		}

		// Google status
		if (network.google) {
			const entity = stateRef.current.entities[network.google.id];
			let desiredStatus: "error" | "warning" | "success";
			if (!hasValidDnsServer) {
				desiredStatus = "error";
			} else if (!routerNatConfigured || !hasValidPppoeCredentials) {
				desiredStatus = "warning";
			} else {
				desiredStatus = "success";
			}
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.google.id, { status: desiredStatus });
			}
		}

		// Cable status
		if (network.cable) {
			const entity = stateRef.current.entities[network.cable.id];
			const desiredStatus = network.pcConnectedToRouterLan
				? "success"
				: "warning";
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.cable.id, { status: desiredStatus });
			}
		}

		// Fiber status
		if (network.fiber) {
			const entity = stateRef.current.entities[network.fiber.id];
			const desiredStatus = network.routerWanConnectedToIgw
				? "success"
				: "warning";
			if (entity && entity.state.status !== desiredStatus) {
				world.updateEntityState(network.fiber.id, { status: desiredStatus });
			}
		}
	}, [
		questionStatus,
		network,
		dhcpEnabled,
		hasValidIpRange,
		hasValidDnsServer,
		natEnabled,
		hasValidPppoeCredentials,
		routerNatConfigured,
		googleReachable,
		username,
		password,
		world,
	]);

	// Drag engine progress management
	useEffect(() => {
		if (!dragEngine) return;
		if (questionStatus === "completed") return;

		if (dragEngine.progress.status === "pending" && allDevicesPlaced) {
			dragEngine.start();
		}

		if (
			dragEngine.progress.status !== "finished" &&
			allRoutersConfigured &&
			googleReachable
		) {
			dragEngine.finish();
		}
	}, [
		dragEngine,
		questionStatus,
		allDevicesPlaced,
		allRoutersConfigured,
		googleReachable,
	]);

	return {
		network,
		routerLanConfig,
		dhcpEnabled,
		startIp,
		endIp,
		dnsServer,
		hasValidIpRange,
		hasValidDnsServer,
		routerLanConfigured,
		routerNatConfig,
		natEnabled,
		routerNatConfigured,
		routerWanConfig,
		connectionType,
		username,
		password,
		publicIp,
		hasValidPppoeCredentials,
		allRoutersConfigured,
		pcHasIp,
		pcIp,
		googleReachable,
		allDevicesPlaced,
		routerLanSettingsOpen,
		routerNatSettingsOpen,
		routerWanSettingsOpen,
		placedItems,
		dragProgress: dragEngine?.progress ?? { status: "pending" as const },
		googleIp: GOOGLE_IP,
	};
};
